import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Visual baselines for the MUI 9 / React 19 upgrade. Each screen is captured
 * once on the pre-upgrade stack (MUI 6.5 / React 17) and compared at every
 * phase. See playwright.visual.config.ts for how to run and refresh them.
 *
 * Signed-in screens need a local test account with a membership on the
 * `reactory` client: set VISUAL_USER_EMAIL and VISUAL_USER_PASSWORD. Without
 * them only the signed-out screens run.
 */

/**
 * The browser clock is frozen so relative dates ("4 months ago") render the
 * same in every phase. Timers still run; only Date.now() is pinned.
 */
const FIXED_NOW = new Date('2026-11-17T08:00:00Z');

const email = process.env.VISUAL_USER_EMAIL;
const password = process.env.VISUAL_USER_PASSWORD;

const BUSY = '.MuiLinearProgress-root, .MuiCircularProgress-root, .MuiSkeleton-root';

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.locator(BUSY).first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const OBJECT_ID = /\b[0-9a-f]{24}\b/;

/**
 * Masked regions. Content that changes between runs without a code change
 * (clocks, build hash, cache size), plus personal data: these baselines are
 * committed to the public upstream repository and the local dataset holds
 * real accounts.
 */
const masked = (page: Page): Locator[] => [
  page.locator('time'),
  page.locator('[data-visual-volatile]'),
  page.getByText(EMAIL),
  page.locator('input[type="email"], input[value*="@"]'),
  page.getByText(OBJECT_ID),
  page.locator('li', { hasText: /Client ver:|\d+(\.\d+)? MB\b/ }),
];

/**
 * Uncaught errors fail the screen instead of being captured: in development
 * the webpack overlay would otherwise cover the page and become the baseline.
 */
const pageErrors = new WeakMap<Page, string[]>();

async function prepare(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (err) => errors.push(err.message));
}

async function visit(page: Page, path: string): Promise<void> {
  const errors = pageErrors.get(page);
  if (errors) errors.length = 0;
  await page.goto(path);
}

async function capture(page: Page, name: string, ready?: Locator, fullPage = true): Promise<void> {
  const errors = pageErrors.get(page) ?? [];
  await (ready ?? page.locator('header').first()).waitFor({ state: 'visible', timeout: 30000 });
  await settle(page);
  expect(errors, `uncaught page errors on ${name}`).toEqual([]);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage, mask: masked(page) });
}

test.describe('signed out', () => {
  test('login', async ({ page }) => {
    await prepare(page);
    await visit(page, '/login');
    await capture(page, 'login', page.getByRole('button', { name: /sign ?in|log ?in/i }).first());
  });
});

/**
 * Screens chosen for the MUI surface they exercise:
 * MaterialTableWidget lists, grid-layout forms, inputs/selects, app shell.
 */
const SIGNED_IN_SCREENS: Array<{ name: string; path: string }> = [
  { name: 'home', path: '/' },
  { name: 'organizations-list', path: '/organizations/' },
  { name: 'support-open-tickets', path: '/support/open' },
  { name: 'support-request-form', path: '/support/request' },
  { name: 'my-comments', path: '/my/comments' },
  { name: 'workflow-registry', path: '/workflows/registry' },
  { name: 'ai-models-admin', path: '/admin/ai/models' },
  { name: 'profile-form', path: '/profile' },
];

test.describe('signed in', () => {
  test.skip(!email || !password, 'Set VISUAL_USER_EMAIL and VISUAL_USER_PASSWORD for a local test account on the reactory client.');
  test.describe.configure({ mode: 'serial' });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await prepare(page);
    await page.goto('/login');
    const submit = page.getByRole('button', { name: /log ?in|sign ?in/i }).first();
    await submit.waitFor({ state: 'visible', timeout: 60000 });
    // The form renders before the anonymous session finishes and is then
    // re-rendered empty, so fill only once the page has settled and confirm
    // the values stuck before submitting.
    await settle(page);
    const emailField = page.getByLabel(/email|username/i).or(page.getByPlaceholder(/email|username/i)).first();
    const passwordField = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i)).first();
    await expect(async () => {
      await emailField.fill(email as string);
      await passwordField.fill(password as string);
      await expect(emailField).toHaveValue(email as string);
      await expect(submit).toBeEnabled({ timeout: 2000 });
    }).toPass({ timeout: 30000 });
    await submit.click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page?.close();
  });

  for (const screen of SIGNED_IN_SCREENS) {
    test(screen.name, async () => {
      await visit(page, screen.path);
      await expect(page).not.toHaveURL(/\/login/);
      await capture(page, screen.name);
    });
  }

  test('app-menu-open', async () => {
    await visit(page, '/');
    await settle(page);
    const menuButton = page.getByRole('button', { name: /menu/i }).first();
    test.skip(!(await menuButton.isVisible()), 'No menu button on this layout.');
    await menuButton.click();
    // The drawer and its backdrop are fixed to the viewport, so a full-page
    // capture would show the page below them unshaded.
    await capture(page, 'app-menu-open', page.getByRole('presentation').first(), false);
  });
});
