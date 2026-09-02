import { test as base, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;
const USER_EMAIL = process.env.TEST_USER_EMAIL;
const USER_PASSWORD = process.env.TEST_USER_PASSWORD;

export const test = base.extend<{
  adminPage: any;
  userPage: any;
}>({
  adminPage: async ({ page }, use) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      test.skip(true, 'TEST_ADMIN_EMAIL/PASSWORD no configurados');
      return;
    }
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await use(page);
  },
  userPage: async ({ page }, use) => {
    if (!USER_EMAIL || !USER_PASSWORD) {
      test.skip(true, 'TEST_USER_EMAIL/PASSWORD no configurados');
      return;
    }
    await login(page, USER_EMAIL, USER_PASSWORD);
    await use(page);
  },
});

async function login(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(tabla|dashboard|predicciones)/, { timeout: 10000 });
}

export { expect };