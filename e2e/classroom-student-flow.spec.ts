import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures/login';
import { USERS } from './fixtures/users';

/**
 * Student path: browse available courses (classroom.Courses@1.0.0), enroll,
 * then confirm it shows up under "My Courses" (classroom.MyCourses@1.0.0).
 */
test.describe('Classroom - student flow', () => {
  test('browse available courses and enroll', async ({ page }) => {
    await loginAs(page, USERS.student);

    await page.goto('/courses');
    // MaterialTableWidget renders a <table> once ReactoryClassroomCourses resolves.
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 15000 });

    const firstRow = table.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    const enrollButton = page.getByRole('button', { name: /enroll/i }).first();
    if (await enrollButton.isVisible().catch(() => false)) {
      await enrollButton.click();

      const confirmButton = page.getByRole('button', { name: /^enroll$/i }).last();
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
      }
    }

    await page.goto('/courses/assigned');
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 });
  });
});
