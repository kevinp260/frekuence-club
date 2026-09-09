import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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
