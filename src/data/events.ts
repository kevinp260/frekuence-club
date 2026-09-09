import type { CollectionEntry } from 'astro:content';

import { eventFixturesEnabled } from './event-fixtures.ts';
import type { Locale } from './routes.ts';

export const HOMEPAGE_DECK_LIMIT = 5;

export type EventEntry = CollectionEntry<'events'>;
export type EventStatus = EventEntry['data']['status'];

type SelectableEvent = {
  data: {
    draft: boolean;
    endsAt: Date;
    featured: boolean;
    startsAt: Date;
    status: EventStatus;
    visualFixture?: boolean;
  };
};

export type HomepageEventSelection<T extends SelectableEvent> = {
  deck: T[];
  deckKind: 'upcoming' | 'past' | null;
  hasPublishedEvents: boolean;
  primary: T | null;
};

export function isPublishedEvent<T extends SelectableEvent>(
  event: T,
  fixturesEnabled = eventFixturesEnabled(),
): boolean {
  return !event.data.draft && (!event.data.visualFixture || fixturesEnabled);
}

export function isValidUpcomingEvent<T extends SelectableEvent>(event: T, now: Date): boolean {
  return (
    event.data.startsAt.getTime() >= now.getTime() &&
    (event.data.status === 'scheduled' || event.data.status === 'postponed')
  );
}

export function isPastEvent<T extends SelectableEvent>(event: T, now: Date): boolean {
  return event.data.endsAt.getTime() <= now.getTime();
}

export function selectHomepageEvents<T extends SelectableEvent>(
  events: T[],
  now = new Date(),
  fixturesEnabled = eventFixturesEnabled(),
): HomepageEventSelection<T> {
  const published = events.filter((event) => isPublishedEvent(event, fixturesEnabled));
  const upcoming = published
    .filter((event) => isValidUpcomingEvent(event, now))
    .sort((first, second) => first.data.startsAt.getTime() - second.data.startsAt.getTime());
  const featured = upcoming.filter(({ data }) => data.featured);
  const primary = featured[0] ?? upcoming[0] ?? null;
  const additionalUpcoming = upcoming.filter((event) => event !== primary);

  if (additionalUpcoming.length > 0) {
    return {
      deck: additionalUpcoming.slice(0, HOMEPAGE_DECK_LIMIT),
      deckKind: 'upcoming',
      hasPublishedEvents: published.length > 0,
      primary,
    };
  }

  const past = published
    .filter((event) => isPastEvent(event, now) && event.data.status !== 'cancelled')
    .sort((first, second) => second.data.startsAt.getTime() - first.data.startsAt.getTime());

  return {
    deck: past.slice(0, HOMEPAGE_DECK_LIMIT),
    deckKind: past.length > 0 ? 'past' : null,
    hasPublishedEvents: published.length > 0,
    primary,
  };
}

export function eventRoute(slug: string, locale: Locale): string {
  return locale === 'sq' ? `/events/${slug}/` : `/en/events/${slug}/`;
}

export function localizedEvent(event: EventEntry, locale: Locale) {
  const localized = event.data.content[locale];

  return {
    ...localized,
    slug: event.data.slug,
  };
}

export function formatEventDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : 'en-GB', {
    timeZone: 'Europe/Tirane',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function formatEventTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'sq' ? 'sq-AL' : 'en-GB', {
    timeZone: 'Europe/Tirane',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
