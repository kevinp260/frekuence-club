import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const siteOrigin = 'https://frekuence.club';
const expectedNoIndex = process.env.PUBLIC_NOINDEX === 'true';
const expectedRoutes = {
  '/': 'index.html',
  '/events/': 'events/index.html',
  '/policy/': 'policy/index.html',
  '/visit/': 'visit/index.html',
  '/privacy/': 'privacy/index.html',
  '/en/': 'en/index.html',
  '/en/events/': 'en/events/index.html',
  '/en/policy/': 'en/policy/index.html',
  '/en/visit/': 'en/visit/index.html',
  '/en/privacy/': 'en/privacy/index.html',
};

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

function outputForPath(pathname) {
  if (pathname === '/') return join(dist, 'index.html');
  if (extname(pathname)) return join(dist, pathname.slice(1));
  return join(dist, pathname.slice(1), 'index.html');
}

const files = await walk(dist);
const relativeFiles = files.map((file) => relative(dist, file).split(sep).join('/'));
const forbiddenFiles = relativeFiles.filter((file) =>
  /(?:\.pdf$|\.map$|(^|\/)\.env(?:\.|$)|BrandBook|FREKUENCE_WEBSITE_IMPLEMENTATION)/i.test(file),
);
assert.deepEqual(forbiddenFiles, [], `Forbidden production files: ${forbiddenFiles.join(', ')}`);

const pageRecords = new Map();
const titles = new Set();
const descriptions = new Set();

for (const [route, file] of Object.entries(expectedRoutes)) {
  const absolute = join(dist, file);
  assert.ok((await stat(absolute)).isFile(), `Missing generated route ${route}`);
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
  assert.ok(
    !/localhost|127\.0\.0\.1|example\.com|lorem ipsum/i.test(html),
    `Dev or placeholder text in ${route}`,
  );
  assert.ok(!/<style(?:\s|>)/i.test(html), `Inline style block found on ${route}`);
  assert.ok(!/\son[a-z]+=/i.test(html), `Inline event handler found on ${route}`);
  assert.ok(!/<script[^>]+src="data:/i.test(html), `Data-URL script found on ${route}`);
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
  assert.equal(
    alternates['x-default'],
    new URL(defaultRoute, siteOrigin).toString(),
    `Wrong x-default on ${route}`,
  );

  assert.ok(!titles.has(title), `Duplicate title: ${title}`);
  assert.ok(!descriptions.has(description), `Duplicate description: ${description}`);
  titles.add(title);
  descriptions.add(description);
  pageRecords.set(route, { html, alternates });
}

for (const [route, { html, alternates }] of pageRecords) {
  const counterpartRoute = route.startsWith('/en/') ? route.replace(/^\/en/, '') : `/en${route}`;
  const counterpart = pageRecords.get(counterpartRoute);
  assert.ok(counterpart, `Missing language counterpart for ${route}`);
  assert.equal(
    route.startsWith('/en/') ? alternates['sq-AL'] : alternates.en,
    new URL(counterpartRoute, siteOrigin).toString(),
    `Incorrect alternate for ${route}`,
  );

  for (const linkTag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const attrs = attributes(linkTag);
    const href = attrs.href;
    if (!href || href.startsWith('#') || /^(?:mailto:|tel:)/.test(href)) continue;

    const url = new URL(href, siteOrigin);
    if (url.origin !== siteOrigin) {
      if (attrs.target === '_blank') {
        const relTokens = new Set((attrs.rel ?? '').split(/\s+/));
        assert.ok(
          relTokens.has('noopener') && relTokens.has('noreferrer'),
          `Unsafe external link: ${href}`,
        );
      }
      continue;
    }

    const target = outputForPath(url.pathname);
    assert.ok(
      (await stat(target).catch(() => null))?.isFile(),
      `Broken internal link on ${route}: ${href}`,
    );
  }
}

const eventPages = ['/events/', '/en/events/'];
for (const route of eventPages) {
  const { html } = pageRecords.get(route);
  assert.ok(!html.includes('"@type":"Event"'), `Fake Event JSON-LD found on ${route}`);
}

for (const route of ['/', '/visit/', '/en/', '/en/visit/']) {
  const { html } = pageRecords.get(route);
  const json = one(
    html,
    /<script\s+type="application\/ld\+json">([^<]+)<\/script>/i,
    'venue JSON-LD',
    route,
  );
  const data = JSON.parse(json);
  assert.equal(data['@type'], 'NightClub');
  assert.equal(data.geo.latitude, 41.3083996);
  assert.equal(data.geo.longitude, 19.814106);
  assert.ok(!('telephone' in data) && !('openingHours' in data));
}

const notFound = await readFile(join(dist, '404.html'), 'utf8');
assert.match(notFound, /<meta\s+name="robots"\s+content="noindex, follow"/i);
assert.equal((notFound.match(/<h1(?:\s|>)/gi) ?? []).length, 1);

const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
assert.match(robots, /Sitemap: https:\/\/frekuence\.club\/sitemap-index\.xml/);
const sitemapIndex = await readFile(join(dist, 'sitemap-index.xml'), 'utf8');
assert.match(sitemapIndex, /https:\/\/frekuence\.club\/sitemap-0\.xml/);
const sitemap = await readFile(join(dist, 'sitemap-0.xml'), 'utf8');
for (const route of Object.keys(expectedRoutes)) {
  assert.ok(sitemap.includes(new URL(route, siteOrigin).toString()), `Sitemap missing ${route}`);
}

console.log(
  `Validated ${Object.keys(expectedRoutes).length} localized routes and ${relativeFiles.length} files.`,
);
