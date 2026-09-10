import { z } from 'zod';

import { eventRoute, type PublicEvent } from '../data/events.ts';
import type { Locale } from '../data/routes.ts';

const API_PATH = '/api/v1/events/';
const API_PAGE_LIMIT = 20;
const MAX_CLIENT_EVENTS = 100;
const DEFAULT_TIMEOUT_MS = 2_000;
const MIN_TIMEOUT_MS = 250;
const MAX_TIMEOUT_MS = 5_000;
const MAX_ATTEMPTS = 2;

const localeSchema = z.enum(['sq', 'en']);
const statusSchema = z.enum(['scheduled', 'postponed', 'cancelled']);
const timingSchema = z.enum(['current', 'upcoming', 'past']);
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const publicPathSchema = z.string().regex(/^\/(?:en\/)?events\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/);
const derivativeSchema = z
  .object({
    url: z.string().regex(/^\/media\/events\/derivatives\/[a-zA-Z0-9_-]+\.webp$/),
    width: z.number().int().positive().max(10_000),
    height: z.number().int().positive().max(10_000),
    format: z.literal('webp'),
  })
  .strict();
const posterSchema = z
  .object({
    alt: z.string().min(1).max(240),
    sources: z.array(derivativeSchema).max(3),
    social: derivativeSchema.nullable(),
  })
  .strict();
const eventBaseSchema = z.object({
  locale: localeSchema,
  slug: slugSchema,
  url: publicPathSchema,
  alternateUrl: publicPathSchema,
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(240),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  doorsAt: z.iso.datetime({ offset: true }).nullable(),
  timezone: z.literal('Europe/Tirane'),
  lineup: z.array(z.string().min(1).max(160)).min(1).max(50),
  status: statusSchema,
  timing: timingSchema,
  featured: z.boolean(),
  entryNote: z.string().max(240).nullable(),
  poster: posterSchema,
});
const eventListItemSchema = eventBaseSchema.strict();
const eventDetailSchema = eventBaseSchema
  .extend({ description: z.string().min(1).max(10_000) })
  .strict();
const eventPageSchema = z
  .object({
    count: z.number().int().nonnegative().max(MAX_CLIENT_EVENTS),
    next: z.string().max(512).nullable(),
    previous: z.string().max(512).nullable(),
    results: z.array(eventListItemSchema).max(API_PAGE_LIMIT),
  })
  .strict();

type ApiEvent = z.infer<typeof eventListItemSchema> | z.infer<typeof eventDetailSchema>;
type ApiWindow = 'upcoming' | 'recent';
type FetchLike = typeof fetch;

export class EventApiUnavailableError extends Error {
  constructor() {
    super('The public events service is temporarily unavailable.');
    this.name = 'EventApiUnavailableError';
  }
}

export class EventApiNotFoundError extends Error {
  constructor() {
    super('Event not found.');
    this.name = 'EventApiNotFoundError';
  }
}

function apiOrigin(environment: NodeJS.ProcessEnv): URL {
  const raw = environment.FREKUENCE_EVENT_API_ORIGIN;
  if (!raw) throw new EventApiUnavailableError();

  try {
    const origin = new URL(raw);
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
      throw new Error('Unsafe API origin.');
    }
    if (origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Origin only.');
    return origin;
  } catch {
    throw new EventApiUnavailableError();
  }
}

function requestTimeout(environment: NodeJS.ProcessEnv): number {
  const parsed = Number(environment.FREKUENCE_EVENT_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(parsed) || parsed < MIN_TIMEOUT_MS || parsed > MAX_TIMEOUT_MS) {
    throw new EventApiUnavailableError();
  }
  return parsed;
}

function publicEvent(event: ApiEvent, locale: Locale): PublicEvent {
  if (event.locale !== locale) throw new EventApiUnavailableError();
  const alternateLocale = locale === 'sq' ? 'en' : 'sq';
  if (
    event.url !== eventRoute(event.slug, locale) ||
    event.alternateUrl !== eventRoute(event.slug, alternateLocale)
  ) {
    throw new EventApiUnavailableError();
  }
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const doorsAt = event.doorsAt ? new Date(event.doorsAt) : null;
  if (endsAt <= startsAt || (doorsAt && doorsAt > startsAt)) throw new EventApiUnavailableError();

  return { ...event, startsAt, endsAt, doorsAt };
}

export function createEventApiClient({
  environment = process.env,
  fetcher = fetch,
}: {
  environment?: NodeJS.ProcessEnv;
  fetcher?: FetchLike;
} = {}) {
  const origin = apiOrigin(environment);
  const timeoutMs = requestTimeout(environment);

  async function request(path: string): Promise<Response> {
    const url = new URL(path, origin);
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetcher(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status === 404) throw new EventApiNotFoundError();
        if (response.ok) return response;
        if (response.status < 500 || attempt === MAX_ATTEMPTS) {
          throw new EventApiUnavailableError();
        }
      } catch (error) {
        if (error instanceof EventApiNotFoundError || error instanceof EventApiUnavailableError) {
          throw error;
        }
        if (attempt === MAX_ATTEMPTS) throw new EventApiUnavailableError();
      }
    }
    throw new EventApiUnavailableError();
  }

  async function json(response: Response): Promise<unknown> {
    if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      throw new EventApiUnavailableError();
    }
    try {
      return await response.json();
    } catch {
      throw new EventApiUnavailableError();
    }
  }

  async function list(locale: Locale, when: ApiWindow): Promise<PublicEvent[]> {
    const events: PublicEvent[] = [];
    let offset = 0;

    while (events.length < MAX_CLIENT_EVENTS) {
      const parameters = new URLSearchParams({
        locale,
        when,
        limit: String(API_PAGE_LIMIT),
        offset: String(offset),
      });
      const parsed = eventPageSchema.safeParse(
        await json(await request(`${API_PATH}?${parameters}`)),
      );
      if (!parsed.success) throw new EventApiUnavailableError();
      events.push(...parsed.data.results.map((event) => publicEvent(event, locale)));
      offset += parsed.data.results.length;
      if (!parsed.data.next || parsed.data.results.length === 0 || offset >= parsed.data.count)
        break;
    }

    return events.slice(0, MAX_CLIENT_EVENTS);
  }

  async function detail(locale: Locale, slug: string): Promise<PublicEvent> {
    const validSlug = slugSchema.safeParse(slug);
    if (!validSlug.success) throw new EventApiNotFoundError();
    const path = `${API_PATH}${encodeURIComponent(validSlug.data)}/?locale=${locale}`;
    const parsed = eventDetailSchema.safeParse(await json(await request(path)));
    if (!parsed.success) throw new EventApiUnavailableError();
    return publicEvent(parsed.data, locale);
  }

  return { detail, list };
}

export async function loadPublishedEvents(locale: Locale): Promise<PublicEvent[]> {
  const client = createEventApiClient();
  const [upcoming, recent] = await Promise.all([
    client.list(locale, 'upcoming'),
    client.list(locale, 'recent'),
  ]);
  return [...upcoming, ...recent];
}

export async function loadPublishedEvent(locale: Locale, slug: string): Promise<PublicEvent> {
  return createEventApiClient().detail(locale, slug);
}
