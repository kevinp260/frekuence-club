import type { Locale } from './routes.ts';

export const HOMEPAGE_DECK_LIMIT = 5;

export type EventStatus = 'scheduled' | 'postponed' | 'cancelled';
export type EventTiming = 'current' | 'upcoming' | 'past';

export type PosterDerivative = {
  url: string;
  width: number;
  height: number;
  format: 'webp';
};

export type PublicPoster = {
  alt: string;
  sources: PosterDerivative[];
  social: PosterDerivative | null;
};

export type PublicEvent = {
  locale: Locale;
  slug: string;
  url: string;
  alternateUrl: string;
  title: string;
  summary: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  doorsAt: Date | null;
  timezone: 'Europe/Tirane';
  lineup: string[];
  status: EventStatus;
  timing: EventTiming;
  featured: boolean;
  entryNote: string | null;
  poster: PublicPoster;
};

type SelectableEvent = Pick<PublicEvent, 'endsAt' | 'featured' | 'startsAt' | 'status'>;

export type HomepageEventSelection<T extends SelectableEvent> = {
  deck: T[];
  deckKind: 'upcoming' | 'past' | null;
  hasPublishedEvents: boolean;
  primary: T | null;
};

export function isValidUpcomingEvent<T extends SelectableEvent>(event: T, now: Date): boolean {
  return (
    event.endsAt.getTime() > now.getTime() &&
    (event.status === 'scheduled' || event.status === 'postponed')
  );
}

export function isPastEvent<T extends SelectableEvent>(event: T, now: Date): boolean {
  return event.endsAt.getTime() <= now.getTime();
}

export function selectHomepageEvents<T extends SelectableEvent>(
  events: T[],
  now = new Date(),
): HomepageEventSelection<T> {
  const upcoming = events
    .filter((event) => isValidUpcomingEvent(event, now))
    .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime());
  const featured = upcoming.find((event) => event.featured);
  const primary = featured ?? upcoming[0] ?? null;
  const additionalUpcoming = upcoming.filter((event) => event !== primary);

  if (additionalUpcoming.length > 0) {
    return {
      deck: additionalUpcoming.slice(0, HOMEPAGE_DECK_LIMIT),
      deckKind: 'upcoming',
      hasPublishedEvents: events.length > 0,
      primary,
    };
  }

  const past = events
    .filter((event) => isPastEvent(event, now) && event.status !== 'cancelled')
    .sort((first, second) => second.startsAt.getTime() - first.startsAt.getTime());

  return {
    deck: past.slice(0, HOMEPAGE_DECK_LIMIT),
    deckKind: past.length > 0 ? 'past' : null,
    hasPublishedEvents: events.length > 0,
    primary,
  };
}

export function eventRoute(slug: string, locale: Locale): string {
  return locale === 'sq' ? `/events/${slug}/` : `/en/events/${slug}/`;
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
