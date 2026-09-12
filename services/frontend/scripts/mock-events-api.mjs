import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';

const port = Number(process.env.MOCK_API_PORT ?? 4310);
const scenario = process.env.MOCK_API_SCENARIO ?? 'events';

const fixtureDefinitions = [
  { slug: 'visual-fixture-first-light', month: 1, featured: false },
  { slug: 'visual-fixture-featured-field', month: 2, featured: true },
  { slug: 'visual-fixture-phase-three', month: 3, featured: false, status: 'postponed' },
  { slug: 'visual-fixture-phase-four', month: 4, featured: false },
  { slug: 'visual-fixture-phase-five', month: 5, featured: false },
  { slug: 'visual-fixture-phase-six', month: 6, featured: false },
  { slug: 'visual-fixture-limit-guard', month: 7, featured: false, status: 'cancelled' },
];
const pastFixtureDefinition = {
  slug: 'visual-fixture-past-frequency',
  month: 8,
  featured: false,
  past: true,
};

const localized = {
  sq: {
    'visual-fixture-first-light': 'Fiksim vizual — Drita e parë',
    'visual-fixture-featured-field': 'Fiksim vizual — Fusha e zgjedhur',
    'visual-fixture-phase-three': 'Fiksim vizual — Faza tre',
    'visual-fixture-phase-four': 'Fiksim vizual — Faza katër',
    'visual-fixture-phase-five': 'Fiksim vizual — Faza pesë',
    'visual-fixture-phase-six': 'Fiksim vizual — Faza gjashtë',
    'visual-fixture-limit-guard': 'Fiksim vizual — Kufiri',
    'visual-fixture-past-frequency': 'Fiksim vizual — Frekuencë e kaluar',
  },
  en: {
    'visual-fixture-first-light': 'Visual Fixture — First Light',
    'visual-fixture-featured-field': 'Visual Fixture — Featured Field',
    'visual-fixture-phase-three': 'Visual Fixture — Phase Three',
    'visual-fixture-phase-four': 'Visual Fixture — Phase Four',
    'visual-fixture-phase-five': 'Visual Fixture — Phase Five',
    'visual-fixture-phase-six': 'Visual Fixture — Phase Six',
    'visual-fixture-limit-guard': 'Visual Fixture — Limit Guard',
    'visual-fixture-past-frequency': 'Visual Fixture — Past Frequency',
  },
};

function fixture(definition, locale, detail = false) {
  const month = String(definition.month).padStart(2, '0');
  const year = definition.past ? '2020' : '2099';
  const base = {
    locale,
    slug: definition.slug,
    url: locale === 'sq' ? `/events/${definition.slug}/` : `/en/events/${definition.slug}/`,
    alternateUrl:
      locale === 'sq' ? `/en/events/${definition.slug}/` : `/events/${definition.slug}/`,
    title: localized[locale][definition.slug],
    summary:
      locale === 'sq'
        ? 'Përmbajtje sintetike vetëm për zhvillim dhe testim të paraqitjes.'
        : 'Synthetic content used only for development and layout testing.',
    startsAt: `${year}-${month}-01T23:00:00+01:00`,
    endsAt: `${year}-${month}-02T05:00:00+01:00`,
    doorsAt: `${year}-${month}-01T22:00:00+01:00`,
    timezone: 'Europe/Tirane',
    lineup: [`Fixture ${String.fromCharCode(64 + definition.month)}`],
    status: definition.status ?? 'scheduled',
    timing: definition.past ? 'past' : 'upcoming',
    featured: definition.featured,
    entryNote: null,
    poster: {
      alt: locale === 'sq' ? 'Poster sintetik testimi' : 'Synthetic test poster',
      sources: [
        {
          url: `/media/events/derivatives/${definition.slug}-480.webp`,
          width: 480,
          height: 600,
          format: 'webp',
        },
        {
          url: `/media/events/derivatives/${definition.slug}-960.webp`,
          width: 960,
          height: 1200,
          format: 'webp',
        },
      ],
      social: {
        url: `/media/events/derivatives/${definition.slug}-social.webp`,
        width: 1200,
        height: 630,
        format: 'webp',
      },
    },
  };
  return detail
    ? {
        ...base,
        description:
          locale === 'sq'
            ? 'Përshkrim sintetik. Ky nuk është event real dhe nuk publikohet nga build-i normal.'
            : 'Synthetic description. This is not a real event and is not published by a normal build.',
      }
    : base;
}

function json(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
  });
  response.end(body);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  if (url.pathname === '/healthz/') return json(response, 200, { status: 'ok' });
  if (scenario === 'unavailable') return json(response, 503, { detail: 'Synthetic outage.' });
  if (request.method !== 'GET') return json(response, 405, { detail: 'Method not allowed.' });

  const detailMatch = url.pathname.match(/^\/api\/v1\/events\/([a-z0-9-]+)\/$/);
  const locale = url.searchParams.get('locale') ?? 'sq';
  if (!['sq', 'en'].includes(locale)) return json(response, 400, { locale: ['Invalid.'] });

  if (detailMatch) {
    if (scenario === 'empty') return json(response, 404, { detail: 'Event not found.' });
    const definition = [...fixtureDefinitions, pastFixtureDefinition].find(
      ({ slug }) => slug === detailMatch[1],
    );
    return definition
      ? json(response, 200, fixture(definition, locale, true))
      : json(response, 404, { detail: 'Event not found.' });
  }

  if (url.pathname !== '/api/v1/events/') return json(response, 404, { detail: 'Not found.' });
  const when = url.searchParams.get('when') ?? 'upcoming';
  const definitions =
    scenario !== 'events' ? [] : when === 'upcoming' ? fixtureDefinitions : [pastFixtureDefinition];
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 6), 20);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const results = definitions.slice(offset, offset + limit).map((item) => fixture(item, locale));
  return json(response, 200, {
    count: definitions.length,
    next:
      offset + limit < definitions.length
        ? `/api/v1/events/?locale=${locale}&when=${when}&limit=${limit}&offset=${offset + limit}`
        : null,
    previous: null,
    results,
  });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Synthetic ${scenario} API listening on http://127.0.0.1:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
