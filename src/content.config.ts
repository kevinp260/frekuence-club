import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

import { eventContentPattern } from './data/event-fixtures';
import { ALLOWED_EXTERNAL_TICKET_HOSTS } from './data/tickets';

const eventStatus = z.enum(['scheduled', 'postponed', 'cancelled']);

const ticketMode = z.enum(['door_only', 'external', 'internal_future']);

const httpsUrl = z
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'URL must use HTTPS.');

const localizedContent = z.object({
  sq: z.object({
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(240),
    description: z.string().min(1),
    posterAlt: z.string().max(240),
    entryNote: z.string().max(240).optional(),
  }),
  en: z.object({
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(240),
    description: z.string().min(1),
    posterAlt: z.string().max(240),
    entryNote: z.string().max(240).optional(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: eventContentPattern(), base: './src/content' }),
  schema: ({ image }) =>
    z
      .object({
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        content: localizedContent,
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        doorsAt: z.coerce.date().optional(),
        timezone: z.literal('Europe/Tirane').default('Europe/Tirane'),
        lineup: z.array(z.string().min(1)).min(1),
        poster: image(),
        status: eventStatus.default('scheduled'),
        ticketMode: ticketMode.default('door_only'),
        externalTicketUrl: httpsUrl.optional(),
        reservationsAvailable: z.boolean().default(false),
        featured: z.boolean().default(false),
        draft: z.boolean().default(true),
        visualFixture: z.boolean().default(false),
      })
      .superRefine((event, context) => {
        if (event.endsAt <= event.startsAt) {
          context.addIssue({
            code: 'custom',
            path: ['endsAt'],
            message: 'endsAt must be later than startsAt.',
          });
        }

        if (event.doorsAt && event.doorsAt > event.startsAt) {
          context.addIssue({
            code: 'custom',
            path: ['doorsAt'],
            message: 'doorsAt cannot be later than startsAt.',
          });
        }

        if (event.ticketMode === 'external' && !event.externalTicketUrl) {
          context.addIssue({
            code: 'custom',
            path: ['externalTicketUrl'],
            message: 'An external ticket URL is required for external ticket mode.',
          });
        }

        if (event.externalTicketUrl) {
          const hostname = new URL(event.externalTicketUrl).hostname;
          if (!ALLOWED_EXTERNAL_TICKET_HOSTS.includes(hostname)) {
            context.addIssue({
              code: 'custom',
              path: ['externalTicketUrl'],
              message: `Ticket hostname is not allowlisted: ${hostname}`,
            });
          }
        }
      }),
});

export const collections = { events };
