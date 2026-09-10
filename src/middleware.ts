import { randomBytes } from 'node:crypto';

import { defineMiddleware } from 'astro:middleware';

function isEventDependentRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/en/' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/events/') ||
    pathname.startsWith('/en/events/')
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (!isEventDependentRoute(context.url.pathname)) return next();

  const nonce = randomBytes(18).toString('base64');
  context.locals.cspNonce = nonce;
  const response = await next();

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "font-src 'self'",
      "img-src 'self' data:",
      "style-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "connect-src 'self'",
    ].join('; '),
  );
  response.headers.set(
    'Cache-Control',
    response.status >= 400 ? 'no-store' : 'public, max-age=30, stale-while-revalidate=60',
  );
  return response;
});
