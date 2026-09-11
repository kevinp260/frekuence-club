import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const client = join(dist, 'client');
const siteOrigin = 'https://frekuence.club';
const expectedNoIndex = process.env.PUBLIC_NOINDEX === 'true';
const prerenderedRoutes = {
  '/about/': 'about/index.html',
  '/policy/': 'policy/index.html',
  '/visit/': 'visit/index.html',
  '/privacy/': 'privacy/index.html',
  '/en/about/': 'en/about/index.html',
  '/en/policy/': 'en/policy/index.html',
  '/en/visit/': 'en/visit/index.html',
  '/en/privacy/': 'en/privacy/index.html',
};
const dynamicPaths = ['/', '/en/', '/events/', '/en/events/', '/sitemap.xml'];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : path;
    }),
  );
  return nested.flat();
}

function one(html, expression, label, file) {
  const match = html.match(expression);
  assert.ok(match?.[1], `${label} is missing in ${file}`);
  return match[1];
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([:\w-]+)=(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
      match[1].toLowerCase(),
      match[2] ?? match[3] ?? '',
    ]),
  );
}

function staticOutputForPath(pathname) {
  if (pathname === '/') return join(client, 'index.html');
  if (extname(pathname)) return join(client, pathname.slice(1));
  return join(client, pathname.slice(1), 'index.html');
}

function isDynamicPath(pathname) {
  return (
    dynamicPaths.includes(pathname) ||
    pathname.startsWith('/events/') ||
    pathname.startsWith('/en/events/')
  );
}

const files = await walk(dist);
const relativeFiles = files.map((file) => relative(dist, file).split(sep).join('/'));
const forbiddenFiles = relativeFiles.filter((file) =>
  /(?:\.pdf$|\.map$|(^|\/)\.env(?:\.|$)|BrandBook|FREKUENCE_WEBSITE_IMPLEMENTATION)/i.test(file),
);
assert.deepEqual(forbiddenFiles, [], `Forbidden production files: ${forbiddenFiles.join(', ')}`);
assert.ok((await stat(join(dist, 'server', 'entry.mjs'))).isFile(), 'Missing Node server entry.');

const clientFiles = await walk(client);
const clientText = (
  await Promise.all(
    clientFiles
      .filter((file) => ['.html', '.js', '.json', '.xml'].includes(extname(file)))
      .map((file) => readFile(file, 'utf8')),
  )
).join('\n');
assert.doesNotMatch(
  clientText,
  /FREKUENCE_EVENT_API_ORIGIN|http:\/\/backend:8000|\/api\/v1\/events\//,
  'Private API configuration leaked into browser-readable output.',
);
assert.doesNotMatch(
  clientText,
  /visual-fixture|Visual Fixture|Fiksim vizual/i,
  'Development event fixtures leaked into production output.',
);

for (const pathname of dynamicPaths) {
  assert.equal(
    await stat(staticOutputForPath(pathname)).catch(() => null),
    null,
    `Event-dependent route was unexpectedly prerendered: ${pathname}`,
  );
}

const pageRecords = new Map();
const titles = new Set();
const descriptions = new Set();

for (const [route, file] of Object.entries(prerenderedRoutes)) {
  const absolute = join(client, file);
  assert.ok((await stat(absolute)).isFile(), `Missing prerendered route ${route}`);
  const html = await readFile(absolute, 'utf8');
  const lang = one(html, /<html[^>]+lang="([^"]+)"/i, 'document language', file);
  const title = one(html, /<title>([^<]+)<\/title>/i, 'title', file);
  const description = one(
    html,
    /<meta\s+name="description"\s+content="([^"]+)"/i,
    'description',
    file,
  );
  const canonical = one(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i, 'canonical', file);
  const h1Count = (html.match(/<h1(?:\s|>)/gi) ?? []).length;

  assert.equal(lang, route.startsWith('/en/') ? 'en' : 'sq-AL', `Wrong lang on ${route}`);
  assert.equal(canonical, new URL(route, siteOrigin).toString(), `Wrong canonical on ${route}`);
  assert.equal(h1Count, 1, `${route} must contain one h1`);
  assert.ok(!html.includes('href="#"'), `Placeholder link found on ${route}`);
  assert.ok(!/<style(?:\s|>)/i.test(html), `Inline style block found on ${route}`);
  assert.ok(!/\son[a-z]+=/i.test(html), `Inline event handler found on ${route}`);
  const hasNoIndex = /<meta\s+name="robots"\s+content="noindex, nofollow"/i.test(html);
  assert.equal(
    hasNoIndex,
    expectedNoIndex,
    expectedNoIndex ? `Missing staging noindex on ${route}` : `Accidental noindex on ${route}`,
  );

  const alternates = Object.fromEntries(
    [...html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/gi)].map(
      (match) => [match[1], match[2]],
    ),
  );
  assert.equal(Object.keys(alternates).length, 3, `Incomplete hreflang set on ${route}`);
  const defaultRoute = route.startsWith('/en/') ? route.replace(/^\/en/, '') : route;
  assert.equal(alternates['x-default'], new URL(defaultRoute, siteOrigin).toString());

  assert.ok(!titles.has(title), `Duplicate title: ${title}`);
  assert.ok(!descriptions.has(description), `Duplicate description: ${description}`);
  titles.add(title);
  descriptions.add(description);
  pageRecords.set(route, { html, alternates });
}

for (const [route, { html, alternates }] of pageRecords) {
  const counterpartRoute = route.startsWith('/en/') ? route.replace(/^\/en/, '') : `/en${route}`;
  assert.ok(pageRecords.has(counterpartRoute), `Missing language counterpart for ${route}`);
  assert.equal(
    route.startsWith('/en/') ? alternates['sq-AL'] : alternates.en,
    new URL(counterpartRoute, siteOrigin).toString(),
  );

  for (const linkTag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const attrs = attributes(linkTag);
    const href = attrs.href;
    if (!href || href.startsWith('#') || /^(?:mailto:|tel:)/.test(href)) continue;
    const url = new URL(href, siteOrigin);
    if (url.origin !== siteOrigin) {
      if (attrs.target === '_blank') {
        const relTokens = new Set((attrs.rel ?? '').split(/\s+/));
        assert.ok(relTokens.has('noopener') && relTokens.has('noreferrer'));
      }
      continue;
    }
    if (isDynamicPath(url.pathname)) continue;
    assert.ok(
      (await stat(staticOutputForPath(url.pathname)).catch(() => null))?.isFile(),
      `Broken internal link on ${route}: ${href}`,
    );
  }
}

for (const route of ['/visit/', '/en/visit/']) {
  const { html } = pageRecords.get(route);
  const data = JSON.parse(
    one(html, /<script\s+type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i, 'JSON-LD', route),
  );
  assert.equal(data['@type'], 'NightClub');
  assert.equal(data.geo.latitude, 41.3083996);
  assert.ok(!('telephone' in data) && !('openingHours' in data));
}

const notFound = await readFile(join(client, '404.html'), 'utf8');
assert.match(notFound, /<meta\s+name="robots"\s+content="noindex, follow"/i);
assert.equal((notFound.match(/<h1(?:\s|>)/gi) ?? []).length, 1);

const robots = await readFile(join(client, 'robots.txt'), 'utf8');
assert.match(robots, /Sitemap: https:\/\/frekuence\.club\/sitemap\.xml/);

console.log(
  `Validated ${Object.keys(prerenderedRoutes).length} prerendered routes and ${relativeFiles.length} production files.`,
);
