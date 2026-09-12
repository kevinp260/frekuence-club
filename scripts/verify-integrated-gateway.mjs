import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHmac } from 'node:crypto';
import http from 'node:http';

/* global Headers, URLSearchParams */

const mode = process.env.INTEGRATED_QA_MODE;
const base = process.env.INTEGRATED_QA_BASE_URL || 'http://gateway:8080';
const originalUrl = process.env.INTEGRATED_QA_ORIGINAL_URL;
const staffUsername = process.env.INTEGRATED_QA_STAFF_USERNAME;
const staffPassword = process.env.INTEGRATED_QA_STAFF_PASSWORD;
const staffDevice = process.env.INTEGRATED_QA_STAFF_DEVICE;
const nonStaffUsername = process.env.INTEGRATED_QA_NONSTAFF_USERNAME;
const nonStaffPassword = process.env.INTEGRATED_QA_NONSTAFF_PASSWORD;
const nonStaffDevice = process.env.INTEGRATED_QA_NONSTAFF_DEVICE;
const totpKey = process.env.INTEGRATED_QA_TOTP_KEY;

assert.ok(['source', 'restore'].includes(mode), 'INTEGRATED_QA_MODE must be source or restore.');
assert.ok(originalUrl?.startsWith('/media/events/originals/'), 'Managed original path is missing.');

const publicHeaders = {
  Host: 'frekuence.club',
  'X-Forwarded-For': '198.51.100.83',
  'X-Forwarded-Proto': 'https',
};
const privateMarkers = [
  'backend:8000',
  'web:8080',
  'db:5432',
  'gateway:8080',
  'Traceback',
  'EventApiUnavailableError',
];

function request(path, { method = 'GET', headers = publicHeaders, body } = {}) {
  return new Promise((resolve, reject) => {
    const requestHeaders = { ...headers };
    if (body && requestHeaders['Content-Length'] === undefined) {
      requestHeaders['Content-Length'] = String(body.length);
    }
    const outgoing = http.request(
      new URL(path, base),
      { method, headers: requestHeaders },
      (incoming) => {
        const chunks = [];
        incoming.on('data', (chunk) => chunks.push(chunk));
        incoming.on('end', () =>
          resolve({
            status: incoming.statusCode,
            headers: new Headers(incoming.headers),
            rawHeaders: incoming.rawHeaders,
            buffer: Buffer.concat(chunks),
          }),
        );
      },
    );
    outgoing.once('error', reject);
    outgoing.end(body);
  });
}

async function read(path, options) {
  const response = await request(path, options);
  const body = response.buffer.toString('utf8');
  const combined = `${body}\n${response.rawHeaders.join('\n')}`;
  for (const marker of privateMarkers) {
    assert.ok(!combined.includes(marker), `${path} leaked private marker ${marker}.`);
  }
  return { ...response, body };
}

function headerCount(response, name) {
  return response.rawHeaders.filter(
    (value, index) => index % 2 === 0 && value.toLowerCase() === name.toLowerCase(),
  ).length;
}

function meta(html, attribute, value) {
  const tag = html.match(new RegExp(`<meta[^>]+${attribute}="${value}"[^>]*>`, 'i'))?.[0];
  return tag?.match(/content="([^"]*)"/i)?.[1];
}

function link(html, relation, language) {
  const languagePart = language ? `[^>]+hreflang="${language}"` : '';
  const tag = html.match(new RegExp(`<link[^>]+rel="${relation}"${languagePart}[^>]*>`, 'i'))?.[0];
  return tag?.match(/href="([^"]+)"/i)?.[1];
}

function cookies(response) {
  const jar = new Map();
  for (let index = 0; index < response.rawHeaders.length; index += 2) {
    if (response.rawHeaders[index].toLowerCase() !== 'set-cookie') continue;
    const match = response.rawHeaders[index + 1].match(/^([^=]+)=([^;]*)/);
    if (match) jar.set(match[1], match[2]);
  }
  return jar;
}

function cookieHeader(jar) {
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

function totpAt(key, timestamp = Date.now()) {
  assert.match(key || '', /^[0-9a-f]{40}$/i, 'A 40-character TOTP key is required.');
  const counter = BigInt(Math.floor(timestamp / 1000 / 30));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', Buffer.from(key, 'hex')).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    (((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)) %
    1_000_000;
  return String(code).padStart(6, '0');
}

async function login({ username, password, device, includeOtp }) {
  const loginPage = await read('/staff/login/');
  assert.equal(loginPage.status, 200);
  const jar = cookies(loginPage);
  const csrfToken = loginPage.body.match(/name="csrfmiddlewaretoken" value="([^"]+)"/)?.[1];
  assert.ok(jar.get('csrftoken') && csrfToken, 'Staff login CSRF state is missing.');
  const form = new URLSearchParams({
    csrfmiddlewaretoken: csrfToken,
    username,
    password,
    next: '/staff/',
  });
  let response = await read('/staff/login/', {
    method: 'POST',
    headers: {
      ...publicHeaders,
      Cookie: cookieHeader(jar),
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://frekuence.club',
    },
    body: Buffer.from(form.toString()),
  });
  for (const [name, value] of cookies(response)) jar.set(name, value);
  if (
    !includeOtp ||
    response.status !== 302 ||
    response.headers.get('location') !== '/staff/login/verify/'
  ) {
    return { response, jar };
  }

  assert.ok(device, 'The expected staff authenticator device is missing.');
  const verificationPage = await read('/staff/login/verify/', {
    headers: { ...publicHeaders, Cookie: cookieHeader(jar) },
  });
  assert.equal(verificationPage.status, 200);
  for (const [name, value] of cookies(verificationPage)) jar.set(name, value);
  const verificationCsrf = verificationPage.body.match(
    /name="csrfmiddlewaretoken" value="([^"]+)"/,
  )?.[1];
  assert.ok(verificationCsrf, 'Staff OTP verification CSRF state is missing.');
  const verificationForm = new URLSearchParams({
    csrfmiddlewaretoken: verificationCsrf,
    otp_token: totpAt(totpKey),
  });
  response = await read('/staff/login/verify/', {
    method: 'POST',
    headers: {
      ...publicHeaders,
      Cookie: cookieHeader(jar),
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://frekuence.club',
    },
    body: Buffer.from(verificationForm.toString()),
  });
  for (const [name, value] of cookies(response)) jar.set(name, value);
  return { response, jar };
}

for (const path of [
  '/',
  '/en/',
  '/events/',
  '/en/events/',
  '/about/',
  '/en/about/',
  '/policy/',
  '/en/policy/',
  '/visit/',
  '/en/visit/',
  '/privacy/',
  '/en/privacy/',
  '/sitemap.xml',
  '/staff/login/',
]) {
  const response = await read(path);
  assert.equal(response.status, 200, `${path} returned ${response.status}.`);
  if (path !== '/sitemap.xml' && path !== '/staff/login/') {
    assert.match(response.body, /<h1(?:\s|>)/i, `${path} has no H1.`);
  }
}

for (const stem of ['', 'events/', 'about/', 'policy/', 'visit/', 'privacy/']) {
  const sqPath = `/${stem}`;
  const enPath = `/en/${stem}`;
  for (const path of [sqPath, enPath]) {
    const response = await read(path);
    assert.equal(link(response.body, 'canonical'), `https://frekuence.club${path}`);
    assert.equal(link(response.body, 'alternate', 'sq-AL'), `https://frekuence.club${sqPath}`);
    assert.equal(link(response.body, 'alternate', 'en'), `https://frekuence.club${enPath}`);
    assert.equal(meta(response.body, 'property', 'og:url'), `https://frekuence.club${path}`);
    assert.ok(meta(response.body, 'property', 'og:title'), `${path} has no Open Graph title.`);
  }
}

const notFound = await read('/checkpoint8-route-does-not-exist/');
assert.equal(notFound.status, 404);
assert.match(notFound.body, /Kjo frekuencë nuk u gjet/);
assert.match(notFound.body, /This frequency was not found/);

const upcoming = await read('/api/v1/events/?locale=sq&when=upcoming&limit=20&offset=0');
assert.equal(upcoming.status, 200);
const upcomingPayload = JSON.parse(upcoming.body);
assert.deepEqual(
  upcomingPayload.results.map((event) => event.slug),
  [
    'checkpoint8-current-postponed',
    'checkpoint8-earliest-upcoming',
    'checkpoint8-cancelled-notice',
    'checkpoint8-featured-upcoming',
    'checkpoint8-later-upcoming',
  ],
);
assert.equal(upcomingPayload.results[0].timing, 'current');
assert.equal(upcomingPayload.results[0].status, 'postponed');
assert.equal(upcomingPayload.results[2].status, 'cancelled');
assert.ok(!upcoming.body.includes('checkpoint8-draft-private'));
assert.ok(!upcoming.body.includes('checkpoint8-intentionally-unpublished'));
for (const forbidden of ['created_by', 'updated_by', 'published_at', 'poster_metadata', 'id']) {
  assert.ok(!Object.hasOwn(upcomingPayload.results[0], forbidden), `API leaked ${forbidden}.`);
}

const recent = await read('/api/v1/events/?locale=en&when=recent&limit=20&offset=0');
assert.equal(recent.status, 200);
const recentPayload = JSON.parse(recent.body);
assert.deepEqual(
  recentPayload.results.map((event) => event.slug),
  ['checkpoint8-past-event'],
);
assert.equal(recentPayload.results[0].timing, 'past');
assert.equal(recentPayload.results[0].title, 'CHECKPOINT 8 PAST SYNTHETIC EVENT');

const englishDetail = await read('/api/v1/events/checkpoint8-featured-upcoming/?locale=en');
assert.equal(englishDetail.status, 200);
const englishDetailPayload = JSON.parse(englishDetail.body);
assert.equal(englishDetailPayload.locale, 'en');
assert.equal(englishDetailPayload.title, 'CHECKPOINT 8 FEATURED SYNTHETIC EVENT');
assert.equal(englishDetailPayload.poster.alt, 'Synthetic red poster field.');
assert.ok(englishDetailPayload.poster.sources.length >= 1);

const api404Bodies = [];
for (const slug of [
  'checkpoint8-draft-private',
  'checkpoint8-intentionally-unpublished',
  'checkpoint8-unknown-record',
]) {
  const response = await read(`/api/v1/events/${slug}/?locale=sq`);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  api404Bodies.push(response.body);
  const page = await read(`/events/${slug}/`);
  assert.equal(page.status, 404);
  assert.ok(!page.body.includes(slug));
}
assert.equal(new Set(api404Bodies).size, 1, 'Private and unknown API 404 bodies differ.');

const homepage = await read('/');
const primary = homepage.body.match(
  /<section[^>]*data-next-signal-state="event"[\s\S]*?<\/section>/i,
)?.[0];
assert.ok(primary, 'Homepage primary event section is missing.');
assert.ok(primary.includes('CHECKPOINT 8 FEATURED SYNTHETIC EVENT SQ'));
assert.ok(!primary.includes('CHECKPOINT 8 EARLIEST SYNTHETIC EVENT SQ'));
assert.ok(!primary.includes('CHECKPOINT 8 CANCELLED SYNTHETIC NOTICE SQ'));
assert.match(homepage.body, /Në radar/);
assert.ok(homepage.body.includes('CHECKPOINT 8 CURRENT POSTPONED SYNTHETIC SQ'));
assert.ok(!homepage.body.includes('CHECKPOINT 8 PAST SYNTHETIC EVENT SQ'));

const englishHomepage = await read('/en/');
const englishPrimary = englishHomepage.body.match(
  /<section[^>]*data-next-signal-state="event"[\s\S]*?<\/section>/i,
)?.[0];
assert.ok(englishPrimary, 'English homepage primary event section is missing.');
assert.ok(englishPrimary.includes('CHECKPOINT 8 FEATURED SYNTHETIC EVENT'));
assert.ok(!englishPrimary.includes('CHECKPOINT 8 EARLIEST SYNTHETIC EVENT'));
assert.match(englishHomepage.body, /On the radar/);
assert.ok(englishHomepage.body.includes('CHECKPOINT 8 CURRENT POSTPONED SYNTHETIC'));
assert.ok(!englishHomepage.body.includes('CHECKPOINT 8 PAST SYNTHETIC EVENT'));

const eventIndex = await read('/events/');
assert.match(eventIndex.body, /Eventet e ardhshme/);
assert.match(eventIndex.body, /Frekuencat e kaluara/);
assert.ok(eventIndex.body.includes('CHECKPOINT 8 CANCELLED SYNTHETIC NOTICE SQ'));
assert.ok(eventIndex.body.includes('CHECKPOINT 8 PAST SYNTHETIC EVENT SQ'));
assert.ok(!eventIndex.body.includes('checkpoint8-draft-private'));

const englishEventIndex = await read('/en/events/');
assert.match(englishEventIndex.body, /Upcoming events/);
assert.match(englishEventIndex.body, /Past frequencies/);
assert.ok(englishEventIndex.body.includes('CHECKPOINT 8 CANCELLED SYNTHETIC NOTICE'));
assert.ok(englishEventIndex.body.includes('CHECKPOINT 8 PAST SYNTHETIC EVENT'));
assert.ok(!englishEventIndex.body.includes('checkpoint8-draft-private'));

for (const [path, locale, title] of [
  ['/events/checkpoint8-featured-upcoming/', 'sq-AL', 'CHECKPOINT 8 FEATURED SYNTHETIC EVENT SQ'],
  ['/en/events/checkpoint8-featured-upcoming/', 'en', 'CHECKPOINT 8 FEATURED SYNTHETIC EVENT'],
]) {
  const detail = await read(path);
  assert.equal(detail.status, 200);
  assert.match(detail.body, new RegExp(`<html[^>]+lang="${locale}"`, 'i'));
  assert.equal(link(detail.body, 'canonical'), `https://frekuence.club${path}`);
  assert.equal(
    link(detail.body, 'alternate', 'sq-AL'),
    'https://frekuence.club/events/checkpoint8-featured-upcoming/',
  );
  assert.equal(
    link(detail.body, 'alternate', 'en'),
    'https://frekuence.club/en/events/checkpoint8-featured-upcoming/',
  );
  assert.equal(meta(detail.body, 'property', 'og:url'), `https://frekuence.club${path}`);
  assert.ok(meta(detail.body, 'property', 'og:title')?.includes(title));
  assert.match(
    meta(detail.body, 'property', 'og:image') || '',
    /^https:\/\/frekuence\.club\/media\/events\/derivatives\//,
  );
  assert.equal(meta(detail.body, 'property', 'og:type'), 'article');
  assert.equal(meta(detail.body, 'name', 'twitter:card'), 'summary_large_image');
  const structuredDataText = detail.body.match(
    /<script[^>]+type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i,
  )?.[1];
  assert.ok(structuredDataText, `${path} is missing MusicEvent JSON-LD.`);
  const structuredData = JSON.parse(structuredDataText);
  assert.equal(structuredData['@type'], 'MusicEvent');
  assert.equal(structuredData.name, title);
  assert.equal(structuredData.eventStatus, 'https://schema.org/EventScheduled');
  assert.ok(!Object.hasOwn(structuredData, 'offers'));
  assert.equal(structuredData.location.name, 'Frekuence Club');
}

const cancelledDetail = await read('/events/checkpoint8-cancelled-notice/');
const cancelledData = JSON.parse(
  cancelledDetail.body.match(/<script[^>]+type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i)[1],
);
assert.equal(cancelledData.eventStatus, 'https://schema.org/EventCancelled');
assert.match(cancelledDetail.body, /Anuluar/);

const sitemap = await read('/sitemap.xml');
for (const slug of [
  'checkpoint8-current-postponed',
  'checkpoint8-earliest-upcoming',
  'checkpoint8-cancelled-notice',
  'checkpoint8-featured-upcoming',
  'checkpoint8-later-upcoming',
  'checkpoint8-past-event',
]) {
  assert.ok(sitemap.body.includes(`https://frekuence.club/events/${slug}/`));
  assert.ok(sitemap.body.includes(`https://frekuence.club/en/events/${slug}/`));
}
assert.ok(!sitemap.body.includes('checkpoint8-draft-private'));
assert.ok(!sitemap.body.includes('checkpoint8-intentionally-unpublished'));
assert.match(sitemap.body, /hreflang="sq-AL"/);
assert.match(sitemap.body, /hreflang="en"/);

const etag = upcoming.headers.get('etag');
assert.ok(etag, 'API list ETag is missing.');
const conditional = await read('/api/v1/events/?locale=sq&when=upcoming&limit=20&offset=0', {
  headers: { ...publicHeaders, 'If-None-Match': etag },
});
assert.equal(conditional.status, 304);
assert.equal(conditional.body, '');

const detailEtag = englishDetail.headers.get('etag');
const conditionalDetail = await read('/api/v1/events/checkpoint8-featured-upcoming/?locale=en', {
  headers: { ...publicHeaders, 'If-None-Match': detailEtag },
});
assert.equal(conditionalDetail.status, 304);

const apiHead = await read('/api/v1/events/?locale=sq', { method: 'HEAD' });
assert.equal(apiHead.status, 200);
assert.equal(apiHead.body, '');
const apiOptions = await read('/api/v1/events/', { method: 'OPTIONS' });
assert.equal(apiOptions.status, 200);
assert.match(apiOptions.headers.get('allow') || '', /GET/);
assert.match(apiOptions.headers.get('allow') || '', /HEAD/);
assert.match(apiOptions.headers.get('allow') || '', /OPTIONS/);
assert.equal(
  (await read('/api/v1/events/', { method: 'POST', body: Buffer.from('{}') })).status,
  405,
);
assert.equal((await read('/', { method: 'POST', body: Buffer.from('x') })).status, 405);

const adminStatic = await read('/static/admin/css/base.css');
assert.equal(adminStatic.status, 200);
assert.match(adminStatic.headers.get('cache-control') || '', /max-age=3600/);
const derivativeUrl = upcomingPayload.results[0].poster.sources[0].url;
const derivative = await read(derivativeUrl);
assert.equal(derivative.status, 200);
assert.equal(derivative.headers.get('content-type'), 'image/webp');
assert.match(derivative.headers.get('cache-control') || '', /immutable/);
assert.equal((await read(originalUrl)).status, 404);

const csp = homepage.headers.get('content-security-policy') || '';
assert.equal(headerCount(homepage, 'content-security-policy'), 1);
assert.ok(!csp.includes('unsafe-inline') && !csp.includes('unsafe-eval'));
const nonce = csp.match(/script-src 'self' 'nonce-([^']+)'/)?.[1];
assert.ok(nonce && homepage.body.includes(`nonce="${nonce}"`));
const secondHomepage = await read('/');
assert.ok(!secondHomepage.headers.get('content-security-policy')?.includes(`nonce-${nonce}`));
for (const header of [
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'strict-transport-security',
]) {
  assert.equal(headerCount(homepage, header), 1, `${header} is duplicated or missing.`);
}

const plainHttp = await request('/api/v1/events/?locale=sq', {
  headers: { Host: 'frekuence.club' },
});
assert.equal(plainHttp.status, 301);
assert.equal(plainHttp.headers.get('location'), 'https://frekuence.club/api/v1/events/?locale=sq');

const anonymousStaff = await read('/staff/');
assert.equal(anonymousStaff.status, 302);
assert.match(anonymousStaff.headers.get('location') || '', /^\/staff\/login\//);
assert.equal(anonymousStaff.headers.get('cache-control'), 'no-store');
const noCsrf = await read('/staff/login/', {
  method: 'POST',
  headers: { ...publicHeaders, Origin: 'https://frekuence.club' },
  body: Buffer.from('username=nobody'),
});
assert.equal(noCsrf.status, 403);

if (mode === 'source') {
  const passwordOnly = await login({
    username: staffUsername,
    password: staffPassword,
    device: staffDevice,
    includeOtp: false,
  });
  assert.equal(passwordOnly.response.status, 302);
  assert.equal(passwordOnly.response.headers.get('location'), '/staff/login/verify/');
  const partialStaffAccess = await read('/staff/events/event/', {
    headers: { ...publicHeaders, Cookie: cookieHeader(passwordOnly.jar) },
  });
  assert.equal(partialStaffAccess.status, 302);
  assert.match(partialStaffAccess.headers.get('location') || '', /^\/staff\/login\//);

  const nonStaff = await login({
    username: nonStaffUsername,
    password: nonStaffPassword,
    device: nonStaffDevice,
    includeOtp: true,
  });
  assert.equal(nonStaff.response.status, 200);
  assert.ok(!nonStaff.jar.has('sessionid'), 'Non-staff user reached the staff session boundary.');
} else {
  const authenticated = await login({
    username: staffUsername,
    password: staffPassword,
    device: staffDevice,
    includeOtp: true,
  });
  assert.equal(authenticated.response.status, 302);
  assert.equal(authenticated.response.headers.get('location'), '/staff/');
  assert.ok(authenticated.jar.has('sessionid'), 'TOTP staff login did not create a session.');
  const eventAdmin = await read('/staff/events/event/', {
    headers: { ...publicHeaders, Cookie: cookieHeader(authenticated.jar) },
  });
  assert.equal(eventAdmin.status, 200);
  assert.ok(eventAdmin.body.includes('CHECKPOINT 8 FEATURED SYNTHETIC EVENT SQ'));
}

console.log(`Integrated gateway ${mode} verification passed.`);
