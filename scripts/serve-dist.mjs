import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, sep } from 'node:path';

const root = join(process.cwd(), 'dist');
const argumentsList = process.argv.slice(2);
const valueAfter = (flag) => {
  const index = argumentsList.indexOf(flag);
  return index >= 0 ? argumentsList[index + 1] : undefined;
};
const host = valueAfter('--host') || '127.0.0.1';
const port = Number(valueAfter('--port') || process.env.PORT || 4321);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

async function existingFile(path) {
  const details = await stat(path).catch(() => null);
  return details?.isFile() ? path : null;
}

async function route(pathname) {
  if (pathname === '/healthz') {
    return { status: 200, body: 'ok\n', type: 'text/plain; charset=utf-8' };
  }

  const decoded = decodeURIComponent(pathname);
  const normalized = normalize(decoded).replaceAll('\\', '/');
  const candidate = join(root, normalized);
  const relativePath = relative(root, candidate);
  if (relativePath.startsWith(`..${sep}`) || relativePath === '..') return null;

  if (normalized.endsWith('/')) {
    const index = await existingFile(join(candidate, 'index.html'));
    if (index) return { status: 200, file: index };
  } else {
    const direct = await existingFile(candidate);
    if (direct) return { status: 200, file: direct };
    const index = await existingFile(join(candidate, 'index.html'));
    if (index) return { status: 301, location: `${pathname}/` };
  }

  return null;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const result = await route(url.pathname);

    if (result?.location) {
      response.writeHead(result.status, { Location: result.location });
      response.end();
      return;
    }

    if (result?.body) {
      response.writeHead(result.status, { 'Content-Type': result.type });
      response.end(request.method === 'HEAD' ? undefined : result.body);
      return;
    }

    const file = result?.file || join(root, '404.html');
    const statusCode = result?.status || 404;
    response.writeHead(statusCode, {
      'Cache-Control': file.includes(`${sep}_astro${sep}`)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
      'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Internal server error\n');
  }
});

server.listen(port, host, () => {
  console.log(`Static preview listening on http://${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
