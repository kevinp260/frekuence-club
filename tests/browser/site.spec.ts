import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { join } from 'node:path';

const fixtureOrigin = 'http://127.0.0.1:4322';
const unavailableOrigin = 'http://127.0.0.1:4323';
const fixturePoster = join(
  process.cwd(),
  'src/content/event-fixtures/poster-magenta-field.visual-fixture.png',
);

test.beforeEach(async ({ page }) => {
  await page.route('**/media/events/derivatives/*.webp', (route) =>
    route.fulfill({ path: fixturePoster, contentType: 'image/png' }),
  );
});

const localizedRoutes = [
  '/',
  '/events/',
  '/about/',
  '/policy/',
  '/visit/',
  '/privacy/',
  '/en/',
  '/en/events/',
  '/en/about/',
  '/en/policy/',
  '/en/visit/',
  '/en/privacy/',
];

for (const route of localizedRoutes) {
  test(`${route} renders without errors and passes automated accessibility checks`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(errors).toEqual([]);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('unknown paths return the branded document with HTTP 404', async ({ page }) => {
  const response = await page.goto('/signal-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Kjo frekuencë nuk u gjet.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This frequency was not found.' })).toBeVisible();
});

test('language switches preserve equivalent routes', async ({ page }) => {
  await page.goto('/about/');
  const toEnglish = page.getByRole('link', { name: 'EN — Shiko këtë faqe në anglisht' }).first();
  await expect(toEnglish).toHaveAttribute('href', '/en/about/');
  await toEnglish.click();
  await expect(page).toHaveURL(/\/en\/about\/$/);

  const toAlbanian = page.getByRole('link', { name: 'SQ — View this page in Albanian' }).first();
  await expect(toAlbanian).toHaveAttribute('href', '/about/');
});

test('homepage leads with the truthful event state and omits migrated summaries', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('main > section').first()).toHaveClass(/next-signal/);
  await expect(page.getByRole('heading', { name: 'Sinjali i radhës po vjen' })).toBeVisible();
  await expect(page.getByText('00 / Asnjë event i publikuar')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nuk hyjmë si një turmë.' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Rregulla të qarta. Prani e lirë.' })).toHaveCount(
    0,
  );
});

test('fixture homepage selects the valid featured event and limits the upcoming deck', async ({
  page,
}) => {
  await page.goto(`${fixtureOrigin}/`);
  const nextSignal = page.locator('[data-next-signal-state="event"]');
  await expect(nextSignal).toBeVisible();
  await expect(
    nextSignal.getByRole('heading', { name: 'Fiksim vizual — Fusha e zgjedhur' }),
  ).toBeVisible();
  await expect(nextSignal.getByText('Fiksim vizual — Drita e parë')).toHaveCount(0);
  await expect(page.locator('[data-event-card]')).toHaveCount(5);
  await expect(page.getByRole('heading', { name: 'Në radar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Frekuencat e kaluara' })).toHaveCount(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('event index separates upcoming events from past frequencies', async ({ page }) => {
  await page.goto(`${fixtureOrigin}/events/`);
  const upcoming = page.getByRole('region', { name: 'Eventet e ardhshme' });
  const past = page.getByRole('region', { name: 'Frekuencat e kaluara' });
  await expect(upcoming).toBeVisible();
  await expect(past).toBeVisible();
  await expect(upcoming.getByText('Fiksim vizual — Frekuencë e kaluar')).toHaveCount(0);
  await expect(past.getByText('Fiksim vizual — Frekuencë e kaluar')).toBeVisible();
  await expect(upcoming.getByText('Shtyrë', { exact: true })).toBeVisible();
  await expect(upcoming.getByText('Anuluar', { exact: true })).toBeVisible();
});

test('event card hover and keyboard focus expose an equivalent detail action', async ({ page }) => {
  await page.goto(`${fixtureOrigin}/`);
  const firstCard = page.locator('[data-event-card]').first();
  const action = firstCard.locator('.event-deck__action');
  await expect(action).toHaveCSS('opacity', '0');

  await firstCard.hover();
  await expect(action).toHaveCSS('opacity', '1');

  await page.mouse.move(0, 0);
  await firstCard.getByRole('link', { name: 'Shiko eventin' }).focus();
  await expect(action).toHaveCSS('opacity', '1');
  await expect(firstCard.getByRole('link', { name: 'Shiko eventin' })).toBeFocused();
});

test('mobile card selection uses an explicit control and a separate detail link', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fixtureOrigin}/`);
  const firstCard = page.locator('[data-event-card]').first();
  const toggle = firstCard.locator('[data-card-toggle]');
  const detail = firstCard.getByRole('link', { name: 'Shiko eventin' });
  const action = firstCard.locator('.event-deck__action');

  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAccessibleName('Mbyll');
  await expect(action).toHaveCSS('opacity', '1');
  await expect(detail).toHaveAttribute('href', '/events/visual-fixture-first-light/');

  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('event deck remains a readable linked list without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${fixtureOrigin}/`);

  await expect(page.locator('[data-event-deck]')).not.toHaveClass(/event-deck--enhanced/);
  await expect(page.locator('[data-card-toggle]:visible')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Shiko eventin' })).toHaveCount(6);

  await context.close();
});

test('localized fixture detail routes are real destinations with reciprocal language links', async ({
  page,
}) => {
  const response = await page.goto(`${fixtureOrigin}/events/visual-fixture-featured-field/`);
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Fiksim vizual — Fusha e zgjedhur' }),
  ).toBeVisible();
  await expect(page.getByText('Fixture B', { exact: true })).toBeVisible();
  const structuredData = await page
    .locator('script[type="application/ld+json"]')
    .evaluate((element) => JSON.parse(element.textContent ?? '{}'));
  expect(structuredData['@type']).toBe('MusicEvent');
  expect(structuredData.name).toBe('Fiksim vizual — Fusha e zgjedhur');
  expect(structuredData).not.toHaveProperty('offers');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://frekuence.club/events/visual-fixture-featured-field/',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://frekuence.club/media/events/derivatives/visual-fixture-featured-field-social.webp',
  );
  await expect(
    page.getByRole('link', { name: 'EN — Shiko këtë faqe në anglisht' }),
  ).toHaveAttribute('href', '/en/events/visual-fixture-featured-field/');

  const detailResults = await new AxeBuilder({ page }).analyze();
  expect(detailResults.violations).toEqual([]);

  const englishResponse = await page.goto(
    `${fixtureOrigin}/en/events/visual-fixture-featured-field/`,
  );
  expect(englishResponse?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Visual Fixture — Featured Field' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'SQ — View this page in Albanian' })).toHaveAttribute(
    'href',
    '/events/visual-fixture-featured-field/',
  );
});

test('normal production output excludes visual fixtures and their detail routes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText(/Fiksim vizual|Visual Fixture/i)).toHaveCount(0);
  const response = await page.goto('/events/visual-fixture-featured-field/');
  expect(response?.status()).toBe(404);
});

test('unknown event slugs return a localized real 404 without private-record disclosure', async ({
  page,
}) => {
  const response = await page.goto(`${fixtureOrigin}/events/unpublished-or-unknown/`);
  expect(response?.status()).toBe(404);
  await expect(page.locator('[data-event-state="not-found"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kjo frekuencë nuk u gjet.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByText(/draft|unpublished|database/i)).toHaveCount(0);
});

test('unavailable event service returns a localized, non-leaking 503', async ({ page }) => {
  const response = await page.goto(`${unavailableOrigin}/en/events/`);
  expect(response?.status()).toBe(503);
  await expect(page.locator('[data-event-state="unavailable"]')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'The programme cannot be loaded right now.' }),
  ).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/backend:8000|traceback|EventApi/i);
  expect(response?.headers()['cache-control']).toBe('no-store');
});

test('dynamic responses use matching per-response CSP nonces without unsafe directives', async ({
  page,
}) => {
  const response = await page.goto(`${fixtureOrigin}/events/visual-fixture-featured-field/`);
  const csp = response?.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).not.toContain("'unsafe-inline'");
  expect(csp).not.toContain("'unsafe-eval'");
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();
  const scriptNonces = await page
    .locator('script')
    .evaluateAll((scripts) => scripts.map((script) => script.nonce));
  expect(scriptNonces.length).toBeGreaterThan(1);
  expect(scriptNonces.every((value) => value === nonce)).toBe(true);

  const second = await page.request.get(`${fixtureOrigin}/events/visual-fixture-featured-field/`);
  expect(second.headers()['content-security-policy']).not.toContain(`'nonce-${nonce}'`);
});

test('dynamic sitemap includes static and currently published localized event routes', async ({
  request,
}) => {
  const response = await request.get(`${fixtureOrigin}/sitemap.xml`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/xml');
  const xml = await response.text();
  expect(xml).toContain('https://frekuence.club/about/');
  expect(xml).toContain('https://frekuence.club/events/visual-fixture-featured-field/');
  expect(xml).toContain('https://frekuence.club/en/events/visual-fixture-featured-field/');
  expect(xml).toContain('hreflang="sq-AL"');
  expect(xml).toContain('hreflang="en"');
});

test('dynamic sitemap fails truthfully when the private API is unavailable', async ({
  request,
}) => {
  const response = await request.get(`${unavailableOrigin}/sitemap.xml`);
  expect(response.status()).toBe(503);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(await response.text()).toBe('Event sitemap temporarily unavailable.\n');
});

test('dynamic HTML never exposes the private API origin or API path', async ({ page }) => {
  await page.goto(`${fixtureOrigin}/`);
  const html = await page.content();
  expect(html).not.toMatch(/127\.0\.0\.1:4310|FREKUENCE_EVENT_API_ORIGIN|\/api\/v1\/events/);
});

test('repeated FrequencyField variants use unique SVG resource IDs', async ({ page }) => {
  await page.goto(`${fixtureOrigin}/`);
  const ids = await page
    .locator('.frequency-field [id]')
    .evaluateAll((elements) => elements.map((element) => element.id));
  expect(ids.length).toBeGreaterThan(2);
  expect(new Set(ids).size).toBe(ids.length);
});

test('About carries the Human Hz manifesto and symbolic 7.83 explanation', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { level: 1, name: 'Human Hz' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nuk hyjmë si një turmë.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Club calibrated at 7.83 Hz' })).toBeVisible();
  await expect(page.getByText(/Nuk është pretendim mjekësor ose shkencor/)).toBeVisible();
});

test('skip link and primary navigation work from the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Kalo te përmbajtja' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('mobile navigation exposes state, moves focus, and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.locator('.nav-toggle');
  const navigation = page.locator('#primary-navigation');
  await expect(menu).toBeVisible();
  await expect(navigation).toBeHidden();
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation).toBeVisible();
  await expect(page.getByRole('link', { name: 'Evente', exact: true }).first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
});

for (const width of [320, 390, 768, 1440]) {
  test(`homepage has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const dimensions = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('*')]
        .map((element) => ({
          className: element.className,
          right: element.getBoundingClientRect().right,
          tag: element.tagName,
        }))
        .filter(({ right }) => right > document.documentElement.clientWidth + 0.5)
        .slice(0, 10),
    }));
    expect(
      dimensions.scroll,
      `Overflowing elements: ${JSON.stringify(dimensions.offenders)}`,
    ).toBeLessThanOrEqual(dimensions.client);
  });
}

for (const width of [320, 390, 1024, 1440]) {
  test(`fixture event homepage has no page-level horizontal overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${fixtureOrigin}/`);
    const dimensions = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
  });
}

test('reduced-motion mode keeps content available without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sinjali i radhës po vjen' })).toBeVisible();
  const motion = await page.locator('.frequency-field__layer').evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      animationName: styles.animationName,
      transitionDuration: Number.parseFloat(styles.transitionDuration),
    };
  });
  expect(motion.animationName).toBe('none');
  expect(motion.transitionDuration).toBeLessThanOrEqual(0.01);
});

test('reduced-motion event deck retains state changes without transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fixtureOrigin}/`);
  const firstCard = page.locator('[data-event-card]').first();
  const toggle = firstCard.locator('[data-card-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const transitionDuration = await firstCard.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).transitionDuration),
  );
  expect(transitionDuration).toBeLessThanOrEqual(0.01);
});

test('external links that open a tab include safe rel values', async ({ page }) => {
  await page.goto('/visit/');
  const links = await page.locator('a[target="_blank"]').evaluateAll((elements) =>
    elements.map((element) => ({
      href: element.getAttribute('href'),
      rel: element.getAttribute('rel')?.split(/\s+/) ?? [],
    })),
  );
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    expect(link.rel).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
  }
});
