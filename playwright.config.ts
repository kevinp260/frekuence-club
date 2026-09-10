import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    },
  },
  webServer: [
    {
      command: 'MOCK_API_PORT=4310 MOCK_API_SCENARIO=events node scripts/mock-events-api.mjs',
      url: 'http://127.0.0.1:4310/healthz/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'MOCK_API_PORT=4311 MOCK_API_SCENARIO=empty node scripts/mock-events-api.mjs',
      url: 'http://127.0.0.1:4311/healthz/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command:
        'FREKUENCE_EVENT_API_ORIGIN=http://127.0.0.1:4311 HOST=127.0.0.1 PORT=4321 node dist/server/entry.mjs',
      url: 'http://127.0.0.1:4321/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command:
        'FREKUENCE_EVENT_API_ORIGIN=http://127.0.0.1:4310 HOST=127.0.0.1 PORT=4322 node dist/server/entry.mjs',
      url: 'http://127.0.0.1:4322/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'MOCK_API_PORT=4312 MOCK_API_SCENARIO=unavailable node scripts/mock-events-api.mjs',
      url: 'http://127.0.0.1:4312/healthz/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command:
        'FREKUENCE_EVENT_API_ORIGIN=http://127.0.0.1:4312 HOST=127.0.0.1 PORT=4323 node dist/server/entry.mjs',
      url: 'http://127.0.0.1:4323/about/',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
