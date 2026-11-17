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

const email = process.env.VISUAL_USER_EMAIL;
const password = process.env.VISUAL_USER_PASSWORD;

const BUSY = '.MuiLinearProgress-root, .MuiCircularProgress-root, .MuiSkeleton-root';

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.locator(BUSY).first().waitFor({ state: 'detached', timeout: 15000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}

/** Content that legitimately changes between runs (clocks, relative dates). */
const volatile = (page: Page): Locator[] => [page.locator('time'), page.locator('[data-visual-volatile]')];

async function capture(page: Page, name: string, ready?: Locator): Promise<void> {
  await (ready ?? page.locator('header').first()).waitFor({ state: 'visible', timeout: 30000 });
  await settle(page);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, mask: volatile(page) });
}

test.describe('signed out', () => {
  test('login', async ({ page }) => {
    await page.goto('/login');
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
    await page.goto('/login');
    await page.getByLabel(/email|username/i).or(page.getByPlaceholder(/email|username/i)).first().fill(email as string);
    await page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i)).first().fill(password as string);
    await page.getByRole('button', { name: /log ?in|sign ?in/i }).first().click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });
  });

  test.afterAll(async () => {
    await page?.close();
  });

  for (const screen of SIGNED_IN_SCREENS) {
    test(screen.name, async () => {
      await page.goto(screen.path);
      await expect(page).not.toHaveURL(/\/login/);
      await capture(page, screen.name);
    });
  }

  test('app-menu-open', async () => {
    await page.goto('/');
    await settle(page);
    const menuButton = page.getByRole('button', { name: /menu/i }).first();
    test.skip(!(await menuButton.isVisible()), 'No menu button on this layout.');
    await menuButton.click();
    await capture(page, 'app-menu-open');
  });
});
