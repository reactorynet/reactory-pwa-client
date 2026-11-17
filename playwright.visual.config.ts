import { defineConfig, devices } from '@playwright/test';

/**
 * Visual baselines for the MUI 9 / React 19 upgrade
 * (docs/upgrade/mui-v9-react-19-upgrade-path.md, Phase 0).
 *
 * Runs against an already running stack: the API (reactory-express-server
 * `bin/start.sh reactory local`) and this client (`bin/start.sh reactory
 * local`, port 3000). As with playwright.config.ts there is no `webServer`
 * block: the stack needs Mongo/Postgres/Redis/Meilisearch and two Node
 * processes, which is out of scope for Playwright to own.
 *
 *   yarn test:visual                    compare against the committed baselines
 *   yarn test:visual --update-snapshots record new baselines (review the diff)
 *
 * Rendering is pinned (viewport, scale, locale, timezone, colour scheme,
 * reduced motion) so differences come from the code, not the machine.
 */
export default defineConfig({
  testDir: './e2e/visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 90000,
  reporter: [['list'], ['html', { outputFolder: 'e2e/visual/.report', open: 'never' }]],
  outputDir: 'e2e/visual/.results',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      maxDiffPixelRatio: 0.01,
    },
  },
  use: {
    baseURL: process.env.REACTORY_SITE_URL || 'http://localhost:3000',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    },
  ],
});
