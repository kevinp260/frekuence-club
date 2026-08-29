import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

import { ALLOWED_EXTERNAL_TICKET_HOSTS } from './data/tickets';

const eventStatus = z.enum(['scheduled', 'postponed', 'cancelled', 'sold_out', 'past']);

const ticketMode = z.enum(['door_only', 'external', 'internal_future']);

const httpsUrl = z
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'URL must use HTTPS.');

const events = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/events' }),
  schema: ({ image }) =>
    z
      .object({
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        title: z.string().min(1).max(120),
        summary: z.string().min(1).max(240),
        description: z.string().min(1),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        doorsAt: z.coerce.date().optional(),
        timezone: z.literal('Europe/Tirane').default('Europe/Tirane'),
        lineup: z.array(z.string().min(1)).min(1),
        poster: image(),
        posterAlt: z.string().min(1).max(240),
        status: eventStatus.default('scheduled'),
        ticketMode: ticketMode.default('door_only'),
        externalTicketUrl: httpsUrl.optional(),
        reservationsAvailable: z.boolean().default(false),
        featured: z.boolean().default(false),
        draft: z.boolean().default(true),
        seoTitle: z.string().min(1).max(70).optional(),
        seoDescription: z.string().min(1).max(170).optional(),
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
