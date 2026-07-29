import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures/login';
import { USERS } from './fixtures/users';

/**
 * Verifies each test account can log in, and that role-gated navigation
 * links appear/disappear per the role gates declared in
 * reactory-express-server/src/data/clientConfigs/booktutor/menus/main.ts.
 * Uses href matching rather than link text, since the menu's i18n
 * translations aren't resolvable from this repo.
 */
test.describe('Authentication and role-based navigation', () => {
  test('student (USER) can log in and sees student-level nav, not tutor/admin nav', async ({ page }) => {
    await loginAs(page, USERS.student);

    await expect(page.locator('a[href^="/assignments"]')).toBeVisible();
    await expect(page.locator('a[href="/my-schedule"]')).toBeVisible();
    await expect(page.locator('a[href="/students"]')).toHaveCount(0);
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
  });

  test('admin can log in and sees the admin nav', async ({ page }) => {
    await loginAs(page, USERS.admin);

    await expect(page.locator('a[href="/admin"]')).toBeVisible();
  });

  test('tutor (STUDENT+TUTOR+ADMIN) can log in and sees tutor-only nav', async ({ page }) => {
    await loginAs(page, USERS.tutor);

    await expect(page.locator('a[href="/students"]')).toBeVisible();
    await expect(page.locator('a[href="/admin"]')).toBeVisible();
  });
});
