import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures/login';
import { USERS } from './fixtures/users';

/**
 * Tutor path: view owned courses (classroom.OwnedCourses@1.0.0), the tutor's
 * students (classroom.Students@1.0.0), and their schedule (classroom.UserSchedule@1.0.0).
 */
test.describe('Classroom - tutor flow', () => {
  test('view owned courses', async ({ page }) => {
    await loginAs(page, USERS.tutor);

    await page.goto('/courses/owned');
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
  });

  test('view my students', async ({ page }) => {
    await loginAs(page, USERS.tutor);

    await page.goto('/students');
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
  });

  test('view schedule', async ({ page }) => {
    await loginAs(page, USERS.tutor);

    await page.goto('/schedule');
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
  });
});
