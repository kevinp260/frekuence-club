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
  const toEnglish = page
    .getByRole('link', { name: 'SQ / EN — Shiko këtë faqe në anglisht' })
    .first();
  await expect(toEnglish).toHaveAttribute('href', '/en/about/');
  await toEnglish.click();
  await expect(page).toHaveURL(/\/en\/about\/$/);

  const toAlbanian = page
    .getByRole('link', { name: 'SQ / EN — View this page in Albanian' })
    .first();
  await expect(toAlbanian).toHaveAttribute('href', '/about/');
});

for (const navigation of [
  {
    locale: 'Albanian',
    path: '/policy/',
    labels: ['Evente', 'Rreth nesh', 'Politika', 'Na vizito'],
    hrefs: ['/events/', '/about/', '/policy/', '/visit/'],
    languageHref: '/en/policy/',
    selectedLanguage: 'SQ',
  },
  {
    locale: 'English',
    path: '/en/policy/',
    labels: ['Events', 'About', 'Policy', 'Visit'],
    hrefs: ['/en/events/', '/en/about/', '/en/policy/', '/en/visit/'],
    languageHref: '/policy/',
    selectedLanguage: 'EN',
  },
]) {
  test(`${navigation.locale} frequency dial preserves destination order and localized routes`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(navigation.path);

    const links = page.locator('.dial-navigation [data-navigation-link]');
    await expect(links).toHaveCount(4);
    expect(await links.locator('.dial-label').allTextContents()).toEqual(navigation.labels);
    expect(
      await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('href')),
      ),
    ).toEqual(navigation.hrefs);

    const language = page.locator('[data-language-switch]');
    await expect(language).toBeVisible();
    await expect(language).toHaveAttribute('href', navigation.languageHref);
    await expect(language.locator('.is-selected')).toHaveText(navigation.selectedLanguage);
    expect(await language.evaluate((element) => element.closest('.dial-navigation') === null)).toBe(
      true,
    );

    const brand = page.locator('.brand-link');
    await expect(brand).toHaveAttribute('href', navigation.locale === 'English' ? '/en/' : '/');
    await expect(brand).toHaveAccessibleName('Frekuence Club');
  });
}

for (const width of [1024, 1440]) {
  test(`horizontal frequency dial is visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/about/');
    await expect(page.locator('.dial-navigation')).toBeVisible();
    await expect(page.locator('[data-language-switch]')).toBeVisible();
    await expect(page.locator('[data-compact-frequency]')).toBeHidden();
    await expect(page.locator('.nav-toggle')).toBeHidden();
    expect(
      await page
        .locator('.site-header')
        .evaluate((element) => element.getBoundingClientRect().height),
    ).toBeLessThanOrEqual(121);
  });
}

for (const width of [320, 390, 768]) {
  test(`compact frequency header is visible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/about/');
    await expect(page.locator('[data-compact-frequency]')).toBeVisible();
    await expect(page.locator('.nav-toggle')).toBeVisible();
    await expect(page.locator('[data-navigation-shell]')).toBeHidden();
  });
}

test('frequency dial uses isolated rounded separator groups in every responsive variant', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/');

  await expect(page.locator('.dial-track')).toHaveCount(0);
  const desktopSegments = page.locator('.dial-navigation .frequency-segment--station');
  await expect(desktopSegments).toHaveCount(4);
  expect(
    await desktopSegments.evaluateAll((segments) =>
      segments.map((segment) => segment.querySelectorAll('.frequency-tick').length),
    ),
  ).toEqual([4, 4, 4, 4]);

  const desktopGeometry = await desktopSegments.evaluateAll((segments) =>
    segments.map((segment) => {
      const bounds = segment.getBoundingClientRect();
      const markerBounds = segment.querySelector('.frequency-marker')?.getBoundingClientRect();
      const positions = [
        bounds.left,
        ...[...segment.querySelectorAll('.frequency-tick')].map((tick) => {
          const tickBounds = tick.getBoundingClientRect();
          return tickBounds.left + tickBounds.width / 2;
        }),
        markerBounds === undefined ? Number.NaN : markerBounds.left + markerBounds.width / 2,
        bounds.right,
      ].sort((left, right) => left - right);
      const gaps = positions.slice(1).map((position, index) => position - positions[index]!);
      const major = getComputedStyle(segment, '::before');
      return {
        borderRadius: major.borderRadius,
        evenlySpaced: Math.max(...gaps) - Math.min(...gaps) < 1,
        left: bounds.left,
        majorWidth: major.width,
        right: bounds.right,
      };
    }),
  );
  expect(desktopGeometry.every(({ evenlySpaced }) => evenlySpaced)).toBe(true);
  expect(desktopGeometry.every(({ majorWidth }) => majorWidth === '2px')).toBe(true);
  expect(desktopGeometry.every(({ borderRadius }) => borderRadius !== '0px')).toBe(true);
  expect(
    desktopGeometry
      .slice(1)
      .every(
        ({ left }, index) => Math.abs(left - (desktopGeometry[index]?.right ?? Number.NaN)) < 1,
      ),
  ).toBe(true);
  const desktopTermini = page.locator('.dial-navigation > .dial-terminus');
  await expect(desktopTermini).toHaveCount(2);
  await expect(desktopTermini.locator('.frequency-terminus__tick')).toHaveCount(4);
  expect(
    await desktopTermini.evaluateAll((termini) =>
      termini.every((terminus) => {
        const ticks = [...terminus.querySelectorAll('.frequency-terminus__tick')];
        const edge = ticks.find((tick) =>
          tick.classList.contains('frequency-terminus__tick--edge'),
        );
        const inner = ticks.find((tick) =>
          tick.classList.contains('frequency-terminus__tick--inner'),
        );
        return (
          edge !== undefined &&
          inner !== undefined &&
          Number.parseFloat(getComputedStyle(edge).opacity) <
            Number.parseFloat(getComputedStyle(inner).opacity)
        );
      }),
    ),
  ).toBe(true);
  await expect(page.locator('.site-header')).toHaveCSS('border-top-width', '0px');
  await expect(page.locator('.site-header')).toHaveCSS('border-bottom-width', '0px');

  await page.setViewportSize({ width: 390, height: 844 });
  const compactScale = page.locator('[data-compact-frequency] .compact-frequency__scale');
  const compactSegment = compactScale.locator('.frequency-segment--compact');
  await expect(compactSegment).toBeVisible();
  await expect(compactSegment.locator('.frequency-tick')).toHaveCount(4);
  await expect(compactScale.locator('.frequency-terminus')).toHaveCount(2);

  await page.locator('.nav-toggle').click();
  const overlaySegments = page.locator('.dial-navigation .frequency-segment--station');
  await expect(overlaySegments).toHaveCount(4);
  expect(
    await overlaySegments.evaluateAll((segments) =>
      segments.every((segment) => {
        const bounds = segment.getBoundingClientRect();
        const markerBounds = segment.querySelector('.frequency-marker')?.getBoundingClientRect();
        const positions = [
          bounds.top,
          ...[...segment.querySelectorAll('.frequency-tick')].map((tick) => {
            const tickBounds = tick.getBoundingClientRect();
            return tickBounds.top + tickBounds.height / 2;
          }),
          markerBounds === undefined ? Number.NaN : markerBounds.top + markerBounds.height / 2,
          bounds.bottom,
        ].sort((top, bottom) => top - bottom);
        const gaps = positions.slice(1).map((position, index) => position - positions[index]!);
        const stationBounds = segment.closest('.dial-station')?.getBoundingClientRect();
        return (
          segment.querySelectorAll('.frequency-tick').length === 4 &&
          Math.max(...gaps) - Math.min(...gaps) < 1 &&
          stationBounds !== undefined &&
          Math.abs(bounds.height - stationBounds.height) < 1
        );
      }),
    ),
  ).toBe(true);
  const overlayTermini = page.locator('.dial-navigation > .dial-terminus');
  await expect(overlayTermini).toHaveCount(2);
  const overlayAxisAlignment = await page.locator('.dial-navigation').evaluate((navigation) => {
    const marker = navigation.querySelector('.frequency-marker');
    const ticks = [...navigation.querySelectorAll('.dial-terminus .frequency-terminus__tick')];
    const markerBounds = marker?.getBoundingClientRect();
    if (markerBounds === undefined) return [];

    const markerCenter = markerBounds.left + markerBounds.width / 2;
    return ticks.map((tick) => {
      const tickBounds = tick.getBoundingClientRect();
      return Math.abs(tickBounds.left + tickBounds.width / 2 - markerCenter);
    });
  });
  expect(overlayAxisAlignment).toHaveLength(4);
  expect(overlayAxisAlignment.every((offset) => offset < 1)).toBe(true);
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

test('event posters use one uncropped 4:5 presentation across public views', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  for (const route of ['/', '/events/', '/events/visual-fixture-featured-field/', '/en/']) {
    await page.goto(`${fixtureOrigin}${route}`);
    const posters = page.locator(
      '.next-signal__poster img, .event-deck__card img, .event-card__poster img, .event-detail__poster img',
    );
    expect(await posters.count()).toBeGreaterThan(0);
    const presentations = await posters.evaluateAll((images) =>
      images.map((image) => {
        const container = image.closest(
          '.next-signal__poster, .event-deck__card, .event-card__poster, .event-detail__poster',
        );
        return {
          aspectRatio: container ? getComputedStyle(container).aspectRatio : null,
          objectFit: getComputedStyle(image).objectFit,
        };
      }),
    );
    expect(presentations.every(({ objectFit }) => objectFit === 'contain')).toBe(true);
    expect(
      presentations.every(({ aspectRatio }) => aspectRatio === '4 / 5'),
      `${route}: ${JSON.stringify(presentations)}`,
    ).toBe(true);
  }
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
    page.getByRole('link', { name: 'SQ / EN — Shiko këtë faqe në anglisht' }),
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
  await expect(
    page.getByRole('link', { name: 'SQ / EN — View this page in Albanian' }),
  ).toHaveAttribute('href', '/events/visual-fixture-featured-field/');
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

test('mobile dial exposes localized state, moves focus, and closes with Escape', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.locator('.nav-toggle');
  const navigation = page.locator('#primary-navigation');
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-controls', 'primary-navigation');
  await expect(menu).toHaveAccessibleName('Hap menunë');
  await expect(navigation).toBeHidden();
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toHaveAccessibleName('Mbyll menunë');
  await expect(navigation).toBeVisible();
  await expect(navigation).toHaveAttribute('role', 'dialog');
  await expect(navigation).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByRole('link', { name: 'Evente', exact: true }).first()).toBeFocused();
  await expect(page.locator('body')).toHaveClass(/navigation-open/);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toHaveAccessibleName('Hap menunë');
  await expect(menu).toBeFocused();
  await expect(page.locator('body')).not.toHaveClass(/navigation-open/);
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
});

test('English compact menu exposes localized open and close labels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/about/');
  const menu = page.locator('.nav-toggle');
  await expect(menu).toHaveAccessibleName('Open menu');
  await menu.click();
  await expect(menu).toHaveAccessibleName('Close menu');
});

test('mobile close button closes the overlay and restores trigger focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');
  const menu = page.locator('.nav-toggle');
  await menu.click();
  const close = page.locator('[data-navigation-close]');
  await expect(close).toBeVisible();
  await close.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  await expect(page.locator('body')).not.toHaveClass(/navigation-open/);
});

test('Tab and Shift+Tab remain contained in the open mobile overlay', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/policy/');
  await page.locator('.nav-toggle').click();
  const overlayBrand = page.locator('.overlay-brand');
  const language = page.locator('[data-language-switch]');

  await overlayBrand.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(language).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(overlayBrand).toBeFocused();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
});

test('mobile navigation activation closes the overlay and restores scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.nav-toggle').click();
  await page
    .locator('#primary-navigation')
    .getByRole('link', { name: 'Rreth nesh', exact: true })
    .click();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('body')).not.toHaveClass(/navigation-open/);
});

test('crossing the 64rem breakpoint safely resets the open menu', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 844 });
  await page.goto('/about/');
  const menu = page.locator('.nav-toggle');
  await menu.click();
  await expect(page.locator('body')).toHaveClass(/navigation-open/);

  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(menu).toBeHidden();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#primary-navigation')).toBeVisible();
  await expect(page.locator('body')).not.toHaveClass(/navigation-open/);
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
});

test('resizing to compact navigation moves desktop destination focus to the menu button', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 844 });
  await page.goto('/about/');
  const destination = page.locator('[data-dial-station="about"] a');
  const menu = page.locator('.nav-toggle');
  await destination.focus();
  await expect(destination).toBeFocused();

  await page.setViewportSize({ width: 768, height: 844 });
  await expect(menu).toBeVisible();
  await expect(menu).toBeFocused();
  expect(
    await page.evaluate(() => (document.activeElement as HTMLElement).offsetParent !== null),
  ).toBe(true);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('body')).not.toHaveClass(/navigation-open/);
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
});

for (const overlayControl of ['brand', 'close'] as const) {
  test(`resizing to desktop navigation restores visible focus from the overlay ${overlayControl}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 844 });
    await page.goto('/about/');
    const menu = page.locator('.nav-toggle');
    await menu.click();
    const control =
      overlayControl === 'brand'
        ? page.locator('.overlay-brand')
        : page.locator('[data-navigation-close]');
    await control.focus();
    await expect(control).toBeFocused();

    await page.setViewportSize({ width: 1024, height: 844 });
    const firstDestination = page.locator('[data-navigation-link]').first();
    await expect(firstDestination).toBeVisible();
    await expect(firstDestination).toBeFocused();
    expect(
      await page.evaluate(() => (document.activeElement as HTMLElement).offsetParent !== null),
    ).toBe(true);
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('body')).not.toHaveClass(/navigation-open/);
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  });
}

test('active route uses one symbolic frequency while homepage remains neutral', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/policy/');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    false,
  );
  const active = page.locator('[data-dial-station="policy"]');
  await expect(active.getByRole('link')).toHaveAttribute('aria-current', 'page');
  await expect(active.locator('.dial-frequency')).toHaveText('7.83 Hz');
  await expect(page.locator('.dial-station--active')).toHaveCount(1);
  const activeCenters = await page.evaluate(() => {
    const cursor = document.querySelector('[data-dial-cursor]')?.getBoundingClientRect();
    const marker = document
      .querySelector('.dial-station--active .dial-marker')
      ?.getBoundingClientRect();
    return {
      cursor: cursor && { x: cursor.left + cursor.width / 2, y: cursor.top + cursor.height / 2 },
      marker: marker && { x: marker.left + marker.width / 2, y: marker.top + marker.height / 2 },
    };
  });
  expect(Math.abs((activeCenters.cursor?.x ?? 0) - (activeCenters.marker?.x ?? 1))).toBeLessThan(1);
  expect(Math.abs((activeCenters.cursor?.y ?? 0) - (activeCenters.marker?.y ?? 1))).toBeLessThan(1);

  await page.goto('/');
  await expect(page.locator('.dial-station--active')).toHaveCount(0);
  await expect(page.locator('.dial-navigation [aria-current="page"]')).toHaveCount(0);
  await expect(page.locator('[data-compact-frequency]')).not.toHaveClass(/--active/);
  await expect(page.locator('.brand-link')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-dial-cursor]')).not.toHaveClass(/dial-cursor--visible/);
});

test('desktop tuning cursor travels to the activated station before navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/policy/');

  const cursor = page.locator('[data-dial-cursor]');
  const destination = page.locator('[data-dial-station="events"]');
  const start = await cursor.boundingBox();
  const target = await destination.locator('.dial-marker').boundingBox();
  expect(start).not.toBeNull();
  expect(target).not.toBeNull();

  const navigation = page.waitForURL(/\/events\/$/);
  const tuningState = await destination.getByRole('link').evaluate(async (link) => {
    (link as HTMLAnchorElement).click();
    await new Promise((resolve) => window.setTimeout(resolve, 70));
    const dial = document.querySelector('.dial-navigation');
    const station = link.closest('[data-dial-station]');
    const cursorElement = document.querySelector('[data-dial-cursor]');
    const cursorRect = cursorElement?.getBoundingClientRect();
    return {
      tuning: dial?.getAttribute('data-tuning'),
      target: station?.classList.contains('dial-station--tuning-target'),
      cursor: cursorRect && {
        x: cursorRect.x,
        y: cursorRect.y,
        width: cursorRect.width,
        height: cursorRect.height,
      },
    };
  });
  expect(tuningState.tuning).toBe('true');
  expect(tuningState.target).toBe(true);

  const moving = tuningState.cursor;
  expect(moving).not.toBeNull();
  const startCenter = (start?.x ?? 0) + (start?.width ?? 0) / 2;
  const targetCenter = (target?.x ?? 0) + (target?.width ?? 0) / 2;
  const movingCenter = (moving?.x ?? 0) + (moving?.width ?? 0) / 2;
  expect(movingCenter).toBeGreaterThan(Math.min(startCenter, targetCenter) + 2);
  expect(movingCenter).toBeLessThan(Math.max(startCenter, targetCenter) - 2);

  await navigation;
  await expect(page.locator('[data-dial-station="events"] a')).toHaveAttribute(
    'aria-current',
    'page',
  );

  await page.goBack();
  await expect(page.locator('[data-dial-station="policy"] a')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('.dial-navigation')).not.toHaveAttribute('data-tuning', 'true');
  await expect(page.locator('.dial-station--tuning-target')).toHaveCount(0);
  await expect(page.locator('[data-dial-cursor]')).toHaveClass(/dial-cursor--station-2/);
});

test('mobile tuning cursor traverses the open vertical dial before it closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    false,
  );
  await page.locator('.nav-toggle').click();

  const cursor = page.locator('[data-dial-cursor]');
  const destination = page.locator('[data-dial-station="visit"]');
  const start = await cursor.boundingBox();
  const target = await destination.locator('.dial-marker').boundingBox();
  expect(start).not.toBeNull();
  expect(target).not.toBeNull();

  const navigation = page.waitForURL(/\/visit\/$/);
  const tuningState = await destination.getByRole('link').evaluate(async (link) => {
    (link as HTMLAnchorElement).click();
    await new Promise((resolve) => window.setTimeout(resolve, 70));
    const dial = document.querySelector('.dial-navigation');
    const shell = document.querySelector('#primary-navigation');
    const cursorElement = document.querySelector('[data-dial-cursor]');
    const cursorRect = cursorElement?.getBoundingClientRect();
    return {
      tuning: dial?.getAttribute('data-tuning'),
      menuVisible: shell instanceof HTMLElement && !shell.hidden,
      cursor: cursorRect && {
        x: cursorRect.x,
        y: cursorRect.y,
        width: cursorRect.width,
        height: cursorRect.height,
      },
    };
  });
  expect(tuningState.menuVisible).toBe(true);
  expect(tuningState.tuning).toBe('true');

  const moving = tuningState.cursor;
  expect(moving).not.toBeNull();
  const startCenter = (start?.y ?? 0) + (start?.height ?? 0) / 2;
  const targetCenter = (target?.y ?? 0) + (target?.height ?? 0) / 2;
  const movingCenter = (moving?.y ?? 0) + (moving?.height ?? 0) / 2;
  expect(movingCenter).toBeGreaterThan(Math.min(startCenter, targetCenter) + 2);
  expect(movingCenter).toBeLessThan(Math.max(startCenter, targetCenter) - 2);

  await navigation;
  await expect(page.locator('.nav-toggle')).toHaveAttribute('aria-expanded', 'false');
});

test('language switch bypasses tuning while homepage tuning begins from the leading terminus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const cursor = page.locator('[data-dial-cursor]');
  await expect(cursor).toHaveClass(/dial-cursor--origin/);
  await expect(cursor).not.toHaveClass(/dial-cursor--visible/);

  let navigation = page.waitForURL(/\/about\/$/);
  await page
    .locator('[data-dial-station="about"] a')
    .evaluate((link) => (link as HTMLAnchorElement).click());
  await expect(cursor).toHaveClass(/dial-cursor--visible/);
  await navigation;

  const language = page.locator('[data-language-switch]');
  await expect(language).toHaveAttribute('href', '/en/about/');
  await expect(language.locator('.is-selected')).toHaveText('SQ');
  expect(await language.evaluate((element) => element.closest('.dial-navigation') === null)).toBe(
    true,
  );

  navigation = page.waitForURL(/\/en\/about\/$/);
  await language.evaluate((link) => {
    document.addEventListener(
      'click',
      (event) => {
        sessionStorage.setItem('language-navigation-prevented', String(event.defaultPrevented));
      },
      { once: true },
    );
    (link as HTMLAnchorElement).click();
  });
  await navigation;
  expect(await page.evaluate(() => sessionStorage.getItem('language-navigation-prevented'))).toBe(
    'false',
  );
  await expect(page.locator('.dial-navigation')).not.toHaveAttribute('data-tuning', 'true');
  await expect(page.locator('[data-dial-cursor]')).toHaveClass(/dial-cursor--station-1/);
  await expect(page.locator('[data-language-switch] .is-selected')).toHaveText('EN');
});

test('localized event detail routes activate the Events station', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${fixtureOrigin}/en/events/visual-fixture-featured-field/`);
  const events = page.locator('[data-dial-station="events"]');
  await expect(events.getByRole('link')).toHaveAttribute('aria-current', 'page');
  await expect(events.locator('.dial-frequency')).toHaveText('7.83 Hz');
});

test('mobile overlay remains scrollable and the final station reachable on a short screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto('/policy/');
  await page.locator('.nav-toggle').click();
  const navigation = page.locator('#primary-navigation');
  const language = page.locator('[data-language-switch]');
  await language.scrollIntoViewIfNeeded();
  await expect(language).toBeVisible();
  const layout = await navigation.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight);
  expect(layout.overflowY).toBe('auto');
  const finalBounds = await language.boundingBox();
  expect(finalBounds).not.toBeNull();
  expect(finalBounds?.y).toBeGreaterThanOrEqual(0);
  expect((finalBounds?.y ?? 0) + (finalBounds?.height ?? 0)).toBeLessThanOrEqual(480);

  const controls = await navigation.locator('a[href], button').evaluateAll((elements) =>
    elements
      .filter((element) => (element as HTMLElement).offsetParent !== null)
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return { height: bounds.height, width: bounds.width };
      }),
  );
  expect(controls.every(({ height, width }) => height >= 44 && width >= 44)).toBe(true);
});

for (const width of [320, 390, 768]) {
  test(`open mobile dial has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/policy/');
    await page.locator('.nav-toggle').click();
    const dimensions = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('*')]
        .map((element) => ({
          className: element.className,
          left: element.getBoundingClientRect().left,
          right: element.getBoundingClientRect().right,
          tag: element.tagName,
        }))
        .filter(
          ({ left, right }) => left < -0.5 || right > document.documentElement.clientWidth + 0.5,
        )
        .slice(0, 10),
    }));
    expect(
      dimensions.scroll,
      `Overflowing elements: ${JSON.stringify(dimensions.offenders)}`,
    ).toBeLessThanOrEqual(dimensions.client);
  });
}

test('server-rendered mobile navigation remains usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.nav-toggle')).toBeHidden();
  await expect(page.locator('#primary-navigation')).toBeVisible();
  await expect(page.locator('.dial-navigation [data-navigation-link]')).toHaveCount(4);
  await expect(
    page.locator('#primary-navigation').getByRole('link', { name: 'Evente', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'SQ / EN — Shiko këtë faqe në anglisht' }),
  ).toHaveAttribute('href', '/en/');
  await context.close();
});

test('sticky desktop dial remains fixed while the document scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto('/about/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('.site-header')).toHaveCSS('position', 'sticky');
  expect(
    await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().top),
  ).toBe(0);
});

for (const width of [320, 390, 768, 1024, 1440]) {
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

test('reduced-motion frequency dial opens without meaningful transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/policy/');
  await page.locator('.nav-toggle').click();
  await expect(page.locator('#primary-navigation')).toBeVisible();
  const durations = await page
    .locator('.dial-marker, [data-dial-cursor], .language-switch__control')
    .evaluateAll((elements) => {
      return elements.flatMap((element) =>
        getComputedStyle(element)
          .transitionDuration.split(',')
          .map((duration) => Number.parseFloat(duration)),
      );
    });
  expect(Math.max(...durations)).toBeLessThanOrEqual(0.01);

  const navigation = page.waitForURL(/\/about\/$/);
  await page.locator('[data-dial-station="about"] a').evaluate((link) => {
    document.addEventListener(
      'click',
      (event) => {
        sessionStorage.setItem(
          'reduced-motion-navigation-prevented',
          String(event.defaultPrevented),
        );
      },
      { once: true },
    );
    (link as HTMLAnchorElement).click();
  });
  await navigation;
  expect(
    await page.evaluate(() => sessionStorage.getItem('reduced-motion-navigation-prevented')),
  ).toBe('false');
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
