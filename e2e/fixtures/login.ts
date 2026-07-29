import { Page, expect } from '@playwright/test';
import { BooktutorTestUser } from './users';

/**
 * Logs into booktutor via the `/login` route (core.Login@1.0.0 - a plugin
 * component loaded at runtime, not part of this repo's own bundle, so these
 * locators are role/label-based rather than exact test-ids we can't verify
 * against source. If the login form's actual markup differs, this is the
 * one place to adjust.
 */
export async function loginAs(page: Page, user: BooktutorTestUser): Promise<void> {
  await page.goto('/login');

  const identifierField = page
    .getByLabel(/email|username/i)
    .or(page.getByPlaceholder(/email|username/i))
    .first();
  await identifierField.fill(user.email);

  const passwordField = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i)).first();
  await passwordField.fill(user.password);

  const submitButton = page.getByRole('button', { name: /log ?in|sign ?in/i }).first();
  await submitButton.click();

  // A successful login redirects away from /login into the authenticated home route.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}
