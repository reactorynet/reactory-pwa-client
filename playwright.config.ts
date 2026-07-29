import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite for the booktutor client, driven against a locally running
 * booktutor dev server (bin/start.sh booktutor local) talking to a locally
 * running reactory-express-server API (bin/start.sh reactory local).
 *
 * Neither server is started automatically by this config - both must
 * already be running (see e2e/README.md) before `npx playwright test`.
 * This intentionally avoids a `webServer` block: booking up Postgres/Mongo
 * plus two Node processes is out of scope for what Playwright itself should
 * own, and failing fast with a clear "connection refused" is more honest
 * than a webServer block silently timing out.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BOOKTUTOR_SITE_URL || 'http://localhost:3004',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
