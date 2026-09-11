import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createEventApiClient,
  EventApiNotFoundError,
  EventApiUnavailableError,
} from '../../src/lib/events-api.server.ts';

function event(locale = 'sq', detail = false) {
  const slug = 'test-signal';
  return {
    locale,
    slug,
    url: locale === 'sq' ? `/events/${slug}/` : `/en/events/${slug}/`,
    alternateUrl: locale === 'sq' ? `/en/events/${slug}/` : `/events/${slug}/`,
    title: 'Synthetic test signal',
    summary: 'Synthetic summary used only by the unit test suite.',
    startsAt: '2030-01-01T23:00:00+01:00',
    endsAt: '2030-01-02T05:00:00+01:00',
    doorsAt: '2030-01-01T22:00:00+01:00',
    timezone: 'Europe/Tirane',
    lineup: ['Test Artist'],
    status: 'scheduled',
    timing: 'upcoming',
    featured: false,
    entryNote: null,
    poster: {
      alt: 'Synthetic poster',
      sources: [
        {
          url: '/media/events/derivatives/test-signal-480.webp',
          width: 480,
          height: 600,
          format: 'webp',
        },
      ],
      social: null,
    },
    ...(detail ? { description: 'Synthetic test description.' } : {}),
  };
}

function response(value, status = 200, contentType = 'application/json') {
  return new globalThis.Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': contentType },
  });
}

const environment = {
  FREKUENCE_EVENT_API_ORIGIN: 'http://backend:8000',
  FREKUENCE_EVENT_API_TIMEOUT_MS: '750',
};

test('list validates the published API envelope and converts timestamps to Date values', async () => {
  const requests = [];
  const client = createEventApiClient({
    environment,
    fetcher: async (url, options) => {
      requests.push({ url: url.toString(), options });
      return response({ count: 1, next: null, previous: null, results: [event()] });
    },
  });

  const result = await client.list('sq', 'upcoming');

  assert.equal(result.length, 1);
  assert.ok(result[0].startsAt instanceof Date);
  assert.match(requests[0].url, /locale=sq&when=upcoming&limit=20&offset=0$/);
  assert.equal(requests[0].options.headers.Accept, 'application/json');
  assert.ok(requests[0].options.signal instanceof globalThis.AbortSignal);
});

test('requests identify the trusted public scheme to production Django', async () => {
  let requestOptions;
  const client = createEventApiClient({
    environment,
    fetcher: async (_url, options) => {
      requestOptions = options;
      return response({ count: 0, next: null, previous: null, results: [] });
    },
  });

  await client.list('sq', 'upcoming');

  assert.equal(requestOptions.headers['X-Forwarded-Proto'], 'https');
});

test('requests reject redirects instead of following an unexpected target', async () => {
  let requestOptions;
  const client = createEventApiClient({
    environment,
    fetcher: async (_url, options) => {
      requestOptions = options;
      return response({ count: 0, next: null, previous: null, results: [] });
    },
  });

  await client.list('sq', 'recent');

  assert.equal(requestOptions.redirect, 'error');
});

test('empty optional poster alt text is accepted', async () => {
  const payload = event();
  payload.poster.alt = '';
  const client = createEventApiClient({
    environment,
    fetcher: async () => response({ count: 1, next: null, previous: null, results: [payload] }),
  });

  const [result] = await client.list('sq', 'upcoming');

  assert.equal(result.poster.alt, '');
});

test('an empty optional lineup is accepted', async () => {
  const payload = event();
  payload.lineup = [];
  const client = createEventApiClient({
    environment,
    fetcher: async () => response({ count: 1, next: null, previous: null, results: [payload] }),
  });

  const [result] = await client.list('sq', 'upcoming');

  assert.deepEqual(result.lineup, []);
});

test('detail maps a backend 404 to a private-record-neutral not-found error', async () => {
  const client = createEventApiClient({
    environment,
    fetcher: async () => response({ detail: 'Event not found.' }, 404),
  });
  await assert.rejects(() => client.detail('sq', 'unknown-signal'), EventApiNotFoundError);
});

test('invalid JSON shape, content type, and managed-poster paths fail closed', async () => {
  for (const payload of [
    { count: 1, next: null, previous: null, results: [{ ...event(), createdBy: 'staff' }] },
    {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          ...event(),
          poster: {
            alt: 'Unsafe',
            sources: [
              { url: '/media/events/originals/upload.svg', width: 10, height: 10, format: 'webp' },
            ],
            social: null,
          },
        },
      ],
    },
    {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          ...event(),
          poster: {
            alt: 'Unsafe',
            sources: [
              {
                url: '/media/events/derivatives/../../private.webp',
                width: 480,
                height: 600,
                format: 'webp',
              },
            ],
            social: null,
          },
        },
      ],
    },
    {
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          ...event(),
          poster: {
            ...event().poster,
            internalOriginalPath: '/media/events/originals/private.png',
          },
        },
      ],
    },
  ]) {
    const client = createEventApiClient({ environment, fetcher: async () => response(payload) });
    await assert.rejects(() => client.list('sq', 'upcoming'), EventApiUnavailableError);
  }

  const htmlClient = createEventApiClient({
    environment,
    fetcher: async () => response({}, 200, 'text/html'),
  });
  await assert.rejects(() => htmlClient.list('sq', 'upcoming'), EventApiUnavailableError);
});

test('server configuration rejects missing, credentialed, and out-of-bounds settings', () => {
  for (const unsafeEnvironment of [
    {},
    { FREKUENCE_EVENT_API_ORIGIN: 'http://user:secret@backend:8000' },
    { FREKUENCE_EVENT_API_ORIGIN: 'file:///tmp/private.json' },
    { FREKUENCE_EVENT_API_ORIGIN: 'http://backend:8000/path/' },
    { FREKUENCE_EVENT_API_ORIGIN: 'http://backend:8000', FREKUENCE_EVENT_API_TIMEOUT_MS: '5001' },
  ]) {
    assert.throws(
      () => createEventApiClient({ environment: unsafeEnvironment }),
      EventApiUnavailableError,
    );
  }
});

test('safe transient failures receive one bounded retry', async () => {
  let attempts = 0;
  const client = createEventApiClient({
    environment,
    fetcher: async () => {
      attempts += 1;
      return attempts === 1
        ? response({ detail: 'Temporary.' }, 503)
        : response({ count: 0, next: null, previous: null, results: [] });
    },
  });

  assert.deepEqual(await client.list('en', 'recent'), []);
  assert.equal(attempts, 2);
});

test('request timeouts are enforced across a bounded two-attempt retry', async () => {
  const startedAt = Date.now();
  const client = createEventApiClient({
    environment: {
      FREKUENCE_EVENT_API_ORIGIN: 'http://backend:8000',
      FREKUENCE_EVENT_API_TIMEOUT_MS: '250',
    },
    fetcher: async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), {
          once: true,
        });
      }),
  });

  await assert.rejects(() => client.list('sq', 'upcoming'), EventApiUnavailableError);
  assert.ok(Date.now() - startedAt < 1_000);
});

test('oversized event collections fail rather than rendering a silent truncation', async () => {
  const client = createEventApiClient({
    environment,
    fetcher: async () =>
      response({
        count: 101,
        next: '/api/v1/events/?offset=20',
        previous: null,
        results: [event()],
      }),
  });

  await assert.rejects(() => client.list('sq', 'upcoming'), EventApiUnavailableError);
});

test('detail validates locale and includes no API-origin data in the result', async () => {
  const client = createEventApiClient({
    environment,
    fetcher: async () => response(event('en', true)),
  });
  const result = await client.detail('en', 'test-signal');
  assert.equal(result.locale, 'en');
  assert.equal(result.description, 'Synthetic test description.');
  assert.doesNotMatch(JSON.stringify(result), /backend:8000|FREKUENCE_EVENT_API_ORIGIN/);
});
