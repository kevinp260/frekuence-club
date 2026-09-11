import assert from 'node:assert/strict';
import { test } from 'node:test';

import { eventRoute, HOMEPAGE_DECK_LIMIT, selectHomepageEvents } from '../../src/data/events.ts';

const now = new Date('2030-01-01T00:00:00Z');

function event(slug, { startsAt, endsAt, featured = false, status = 'scheduled' }) {
  return {
    slug,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    featured,
    status,
  };
}

test('featured valid upcoming event overrides the earliest upcoming event', () => {
  const earliest = event('earliest', {
    startsAt: '2030-02-01T22:00:00Z',
    endsAt: '2030-02-02T05:00:00Z',
  });
  const featured = event('featured', {
    startsAt: '2030-03-01T22:00:00Z',
    endsAt: '2030-03-02T05:00:00Z',
    featured: true,
  });

  const result = selectHomepageEvents([featured, earliest], now);

  assert.equal(result.primary, featured);
  assert.deepEqual(result.deck, [earliest]);
  assert.equal(result.deckKind, 'upcoming');
});

test('an in-progress event remains eligible as the homepage primary event', () => {
  const inProgress = event('in-progress', {
    startsAt: '2029-12-31T22:00:00Z',
    endsAt: '2030-01-01T02:00:00Z',
  });

  const result = selectHomepageEvents([inProgress], now);

  assert.equal(result.primary, inProgress);
  assert.equal(result.hasPublishedEvents, true);
  assert.equal(result.deckKind, null);
  assert.deepEqual(result.deck, []);
});

test('cancelled and past featured events are ignored and earliest valid event wins', () => {
  const cancelledFeatured = event('cancelled-featured', {
    startsAt: '2030-01-05T22:00:00Z',
    endsAt: '2030-01-06T05:00:00Z',
    featured: true,
    status: 'cancelled',
  });
  const pastFeatured = event('past-featured', {
    startsAt: '2029-12-01T22:00:00Z',
    endsAt: '2029-12-02T05:00:00Z',
    featured: true,
  });
  const earliest = event('earliest', {
    startsAt: '2030-02-01T22:00:00Z',
    endsAt: '2030-02-02T05:00:00Z',
  });

  assert.equal(
    selectHomepageEvents([cancelledFeatured, pastFeatured, earliest], now).primary,
    earliest,
  );
});

test('secondary homepage deck is chronological and capped at five', () => {
  const events = Array.from({ length: 8 }, (_, index) =>
    event(`event-${index}`, {
      startsAt: `2030-${String(index + 2).padStart(2, '0')}-01T22:00:00Z`,
      endsAt: `2030-${String(index + 2).padStart(2, '0')}-02T05:00:00Z`,
    }),
  ).reverse();

  const result = selectHomepageEvents(events, now);

  assert.equal(result.primary.slug, 'event-0');
  assert.equal(result.deck.length, HOMEPAGE_DECK_LIMIT);
  assert.deepEqual(
    result.deck.map(({ slug }) => slug),
    ['event-1', 'event-2', 'event-3', 'event-4', 'event-5'],
  );
});

test('recent past events are a separately typed fallback when no upcoming event exists', () => {
  const older = event('older', {
    startsAt: '2029-10-01T22:00:00Z',
    endsAt: '2029-10-02T05:00:00Z',
  });
  const recent = event('recent', {
    startsAt: '2029-12-01T22:00:00Z',
    endsAt: '2029-12-02T05:00:00Z',
  });

  const result = selectHomepageEvents([older, recent], now);

  assert.equal(result.primary, null);
  assert.equal(result.hasPublishedEvents, true);
  assert.equal(result.deckKind, 'past');
  assert.deepEqual(result.deck, [recent, older]);
});

test('empty fallback is returned only for an empty published API result', () => {
  const result = selectHomepageEvents([], now);

  assert.equal(result.primary, null);
  assert.equal(result.hasPublishedEvents, false);
  assert.equal(result.deckKind, null);
  assert.deepEqual(result.deck, []);
});

test('localized event detail paths preserve the slug and trailing slash', () => {
  assert.equal(eventRoute('stable-signal', 'sq'), '/events/stable-signal/');
  assert.equal(eventRoute('stable-signal', 'en'), '/en/events/stable-signal/');
});
