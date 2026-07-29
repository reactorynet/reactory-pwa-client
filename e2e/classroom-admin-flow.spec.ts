import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures/login';
import { USERS } from './fixtures/users';

/**
 * Admin path: confirm the admin panel is reachable and course-management
 * screens still render for an ADMIN-roled user.
 */
test.describe('Classroom - admin flow', () => {
  test('admin can access the admin panel', async ({ page }) => {
    await loginAs(page, USERS.admin);

    await page.goto('/admin/organizations');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('admin can browse courses', async ({ page }) => {
    await loginAs(page, USERS.admin);

    await page.goto('/courses');
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
  });
});
