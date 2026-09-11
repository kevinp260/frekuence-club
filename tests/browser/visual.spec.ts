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

test.skip(
  process.env.CAPTURE_VISUALS !== 'true',
  'Set CAPTURE_VISUALS=true to write review images.',
);
test.describe.configure({ mode: 'serial' });

const homepageViewports = [
  { width: 320, height: 900 },
  { width: 390, height: 844 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1000 },
];

for (const locale of ['sq', 'en'] as const) {
  for (const viewport of homepageViewports) {
    test(`capture ${locale} homepage at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(locale === 'sq' ? '/' : '/en/');
      await page.screenshot({
        path: `screenshots/home-${locale}-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });
    });
  }
}

const reviewRoutes = [
  { name: 'events-sq', path: '/events/' },
  { name: 'about-sq', path: '/about/' },
  { name: 'policy-sq', path: '/policy/' },
  { name: 'visit-sq', path: '/visit/' },
  { name: 'privacy-sq', path: '/privacy/' },
  { name: 'events-en', path: '/en/events/' },
  { name: 'about-en', path: '/en/about/' },
  { name: 'policy-en', path: '/en/policy/' },
  { name: 'visit-en', path: '/en/visit/' },
  { name: 'privacy-en', path: '/en/privacy/' },
  { name: '404-bilingual', path: '/visual-review-not-found/' },
];

for (const route of reviewRoutes) {
  test(`capture ${route.name} desktop review`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route.path);
    await page.screenshot({
      path: `screenshots/${route.name}-1440x1000.png`,
      fullPage: true,
    });
  });
}

for (const route of [
  { name: 'about-sq', path: '/about/' },
  { name: 'about-en', path: '/en/about/' },
]) {
  test(`capture ${route.name} mobile review`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route.path);
    await page.screenshot({
      path: `screenshots/${route.name}-390x844.png`,
      fullPage: true,
    });
  });
}

const pullRequestEvidence = [
  {
    name: 'dynamic-homepage-1440',
    url: `${fixtureOrigin}/`,
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'dynamic-homepage-390',
    url: `${fixtureOrigin}/`,
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'dynamic-event-detail-1440',
    url: `${fixtureOrigin}/events/visual-fixture-featured-field/`,
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'dynamic-event-detail-390',
    url: `${fixtureOrigin}/events/visual-fixture-featured-field/`,
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'event-service-unavailable-1440',
    url: `${unavailableOrigin}/events/`,
    viewport: { width: 1440, height: 1000 },
  },
];

for (const evidence of pullRequestEvidence) {
  test(`capture PR evidence ${evidence.name}`, async ({ page }) => {
    await page.setViewportSize(evidence.viewport);
    await page.goto(evidence.url);
    await page.screenshot({
      path: `docs/review/phase-2-astro-dynamic/${evidence.name}.png`,
      fullPage: true,
    });
  });
}

test('capture checkpoint 8 event homepage at the minimum supported width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`${fixtureOrigin}/`);
  await page.screenshot({
    path: 'docs/review/phase-2-integrated-qa/homepage-events-320.png',
    fullPage: true,
  });
});

test('capture checkpoint 8 keyboard-focus event deck state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${fixtureOrigin}/`);
  await page
    .locator('[data-event-card]')
    .first()
    .getByRole('link', { name: 'Shiko eventin' })
    .focus();
  await page.locator('[data-event-deck]').screenshot({
    path: 'docs/review/phase-2-integrated-qa/event-deck-keyboard-focus-1440.png',
  });
});

test('capture checkpoint 8 explicit mobile card selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fixtureOrigin}/`);
  await page.locator('[data-event-card]').first().locator('[data-card-toggle]').click();
  await page.locator('[data-event-deck]').screenshot({
    path: 'docs/review/phase-2-integrated-qa/event-deck-touch-selected-390.png',
  });
});

test('capture checkpoint 8 no-JavaScript event fallback', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.route('**/media/events/derivatives/*.webp', (route) =>
    route.fulfill({ path: fixturePoster, contentType: 'image/png' }),
  );
  await page.goto(`${fixtureOrigin}/`);
  const deck = page.locator('[data-event-deck]');
  await deck.evaluate((element) => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY);
  });
  const posters = deck.locator('img');
  await expect.poll(() => posters.count()).toBeGreaterThan(0);
  await expect
    .poll(() =>
      posters.evaluateAll((images) =>
        images.every((image) => {
          const poster = image as HTMLImageElement;
          return poster.complete && poster.naturalWidth > 0;
        }),
      ),
    )
    .toBe(true);
  expect(
    await posters.evaluateAll(
      (images) => images.filter((image) => (image as HTMLImageElement).naturalWidth > 0).length,
    ),
  ).toBeGreaterThan(0);
  await page.screenshot({
    path: 'docs/review/phase-2-integrated-qa/event-deck-no-javascript-390.png',
  });
  await context.close();
});
