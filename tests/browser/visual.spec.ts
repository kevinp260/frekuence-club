import { test } from '@playwright/test';

test.skip(
  process.env.CAPTURE_VISUALS !== 'true',
  'Set CAPTURE_VISUALS=true to write review images.',
);
test.describe.configure({ mode: 'serial' });

const homepageViewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
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
  { name: 'policy-sq', path: '/policy/' },
  { name: 'visit-sq', path: '/visit/' },
  { name: 'privacy-sq', path: '/privacy/' },
  { name: 'events-en', path: '/en/events/' },
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
