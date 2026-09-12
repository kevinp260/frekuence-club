import { Buffer } from 'node:buffer';
import { createHmac } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const baseURL = process.env.STAFF_BASE_URL;
const username = process.env.FREKUENCE_DEV_ADMIN_USERNAME;
const password = process.env.FREKUENCE_DEV_ADMIN_PASSWORD;
const totpKey = process.env.FREKUENCE_DEV_TOTP_KEY;

if (!baseURL || !username || !password || !/^[0-9a-f]{40}$/i.test(totpKey || '')) {
  throw new Error('Staff review credentials and a 40-character hexadecimal TOTP key are required.');
}

function totpAt(key, timestamp = Date.now()) {
  const counter = BigInt(Math.floor(timestamp / 1000 / 30));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', Buffer.from(key, 'hex')).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    (((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)) %
    1_000_000;
  return String(code).padStart(6, '0');
}

if (totpAt('3132333435363738393031323334353637383930', 59_000) !== '287082') {
  throw new Error('The TOTP implementation failed its RFC 6238 test vector.');
}

async function assertUsable(page, expectedPath) {
  if (!new URL(page.url()).pathname.startsWith(expectedPath)) {
    throw new Error(`Expected ${expectedPath}, received ${page.url()}`);
  }
  const overflow = await page.evaluate(
    () =>
      globalThis.document.documentElement.scrollWidth >
      globalThis.document.documentElement.clientWidth,
  );
  if (overflow) throw new Error(`Page has horizontal overflow at ${page.viewportSize()?.width}px.`);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  if (accessibility.violations.length) {
    throw new Error(
      `Accessibility violations on ${expectedPath}: ${accessibility.violations
        .map(
          (violation) =>
            `${violation.id} (${violation.nodes.map((node) => node.target.join(' ')).join(', ')})`,
        )
        .join(', ')}`,
    );
  }
}

await mkdir('/output', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

try {
  await page.goto(`${baseURL}/staff/login/`, { waitUntil: 'networkidle' });
  await assertUsable(page, '/staff/login/');
  await page.screenshot({ path: '/output/staff-login-1440x1000.png', fullPage: true });
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await assertUsable(page, '/staff/login/verify/');
  await page.screenshot({ path: '/output/staff-otp-1440x1000.png', fullPage: true });
  await page.locator('input[name="otp_token"]').fill(totpAt(totpKey));
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  if (new URL(page.url()).pathname.startsWith('/staff/login/')) {
    const error = await page.locator('[role="alert"]').first().textContent();
    throw new Error(`Staff review login failed: ${error?.trim() || 'unknown form error'}`);
  }

  await assertUsable(page, '/staff/');
  await page.screenshot({ path: '/output/staff-dashboard-1440x1000.png', fullPage: true });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`${baseURL}/staff/staff_access/staffaccount/add/`, {
    waitUntil: 'networkidle',
  });
  await assertUsable(page, '/staff/staff_access/staffaccount/add/');
  await page.screenshot({ path: '/output/staff-account-role-1024x900.png', fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/staff/events/event/`, { waitUntil: 'networkidle' });
  await assertUsable(page, '/staff/events/event/');
  await page.screenshot({ path: '/output/staff-events-1440x1000.png', fullPage: true });

  const eventLink = page.locator('#result_list tbody th a').first();
  if (!(await eventLink.count())) throw new Error('The draft visual fixture is missing.');
  await eventLink.click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForLoadState('networkidle');
  await assertUsable(page, '/staff/events/event/');
  await page.screenshot({ path: '/output/staff-event-edit-1024x768.png', fullPage: true });
} finally {
  await browser.close();
}

console.log(
  'Captured password, OTP, dashboard, staff role, event list, and event editor screens; Axe and overflow checks passed.',
);
