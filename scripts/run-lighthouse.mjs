import { spawn } from 'node:child_process';
import { get } from 'node:http';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();
const host = '127.0.0.1';
const port = Number(process.env.LIGHTHOUSE_PORT || 4322);
const origin = `http://${host}:${port}`;
const chromePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const previewRoot = process.env.LIGHTHOUSE_ROOT || 'dist';
const reportPath = process.env.LIGHTHOUSE_REPORT_PATH || './lighthouse-report.json';

function run(command, argumentsList, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}.`));
    });
  });
}

async function waitForPreview(server) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Static preview exited with ${server.exitCode} before becoming ready.`);
    }

    try {
      const ready = await new Promise((resolve) => {
        const request = get(`${origin}/healthz`, (response) => {
          response.resume();
          resolve(response.statusCode === 200);
        });
        request.once('error', () => resolve(false));
      });
      if (ready) return;
    } catch {
      // The preview process may still be starting.
    }

    await delay(200);
  }

  throw new Error(`Static preview did not become ready at ${origin}.`);
}

const server = spawn(
  process.execPath,
  [
    join(root, 'scripts/serve-dist.mjs'),
    '--host',
    host,
    '--port',
    String(port),
    '--root',
    previewRoot,
  ],
  { stdio: 'inherit' },
);

try {
  await waitForPreview(server);
  await run(process.execPath, [
    join(root, 'node_modules/lighthouse/cli/index.js'),
    `${origin}/`,
    `--chrome-path=${chromePath}`,
    '--output=json',
    `--output-path=${reportPath}`,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--quiet',
  ]);
  await run(process.execPath, [join(root, 'scripts/validate-lighthouse.mjs')], {
    env: { ...process.env, LIGHTHOUSE_REPORT_PATH: reportPath },
  });
} finally {
  if (server.exitCode === null) server.kill('SIGTERM');
}
