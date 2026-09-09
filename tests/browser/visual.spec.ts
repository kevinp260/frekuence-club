import { test } from '@playwright/test';

const fixtureOrigin = 'http://127.0.0.1:4322';

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
    name: 'homepage-events-1440',
    url: `${fixtureOrigin}/`,
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'homepage-events-390',
    url: `${fixtureOrigin}/`,
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'homepage-empty-1440',
    url: '/',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'about-1440',
    url: '/about/',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'about-390',
    url: '/about/',
    viewport: { width: 390, height: 844 },
  },
];

for (const evidence of pullRequestEvidence) {
  test(`capture PR evidence ${evidence.name}`, async ({ page }) => {
    await page.setViewportSize(evidence.viewport);
    await page.goto(evidence.url);
    await page.screenshot({
      path: `docs/review/phase-2-foundation/${evidence.name}.png`,
      fullPage: true,
    });
  });
}
