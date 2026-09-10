import type { APIRoute } from 'astro';

import { eventRoute } from '../data/events';
import { pageKeys, routes } from '../data/routes';
import { SITE } from '../data/site';
import { loadPublishedEvents } from '../lib/events-api.server';

export const prerender = false;

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function urlEntry(sqPath: string, enPath: string): string {
  const sq = new URL(sqPath, SITE.url).toString();
  const en = new URL(enPath, SITE.url).toString();
  return [
    '<url>',
    `<loc>${escapeXml(sq)}</loc>`,
    `<xhtml:link rel="alternate" hreflang="sq-AL" href="${escapeXml(sq)}" />`,
    `<xhtml:link rel="alternate" hreflang="en" href="${escapeXml(en)}" />`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(sq)}" />`,
    '</url>',
    '<url>',
    `<loc>${escapeXml(en)}</loc>`,
    `<xhtml:link rel="alternate" hreflang="sq-AL" href="${escapeXml(sq)}" />`,
    `<xhtml:link rel="alternate" hreflang="en" href="${escapeXml(en)}" />`,
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(sq)}" />`,
    '</url>',
  ].join('');
}

export const GET: APIRoute = async () => {
  try {
    const events = await loadPublishedEvents('sq');
    const staticEntries = pageKeys.map((page) => urlEntry(routes[page].sq, routes[page].en));
    const eventEntries = events.map((event) =>
      urlEntry(eventRoute(event.slug, 'sq'), eventRoute(event.slug, 'en')),
    );
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...staticEntries,
      ...eventEntries,
      '</urlset>',
    ].join('');
    return new Response(body, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  } catch {
    return new Response('Event sitemap temporarily unavailable.\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
};
