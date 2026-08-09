import { randomUUID } from 'node:crypto';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const password = 'Playwright-creator-password-123!';

async function createCreatorAtChannelSetup(page: Page, testInfo: TestInfo) {
  const suffix = `${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${randomUUID().slice(0, 8)}`;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue with Email', exact: true }).click();
  await page.getByLabel('Full name').fill('Android Navigation Creator');
  await page.getByLabel('Email').fill(`android-nav-${suffix}@example.test`);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await page.getByRole('button', { name: 'Broadcast audio' }).click();
  await expect(page.getByRole('heading', { name: 'Set up your creator workspace' })).toBeVisible();

  await page.getByLabel('Organisation name').fill(`Android Navigation ${suffix}`);
  await page.getByLabel('Public slug').fill(`android-nav-${suffix}`);
  await page.getByRole('button', { name: 'Continue to channel setup' }).click();

  await expect(page).toHaveURL(/\/creator\/broadcasts$/);
  await expect(page.getByRole('heading', { name: 'Create your first channel' })).toBeVisible();
}

test('Android creator navigation owns keyboard activation and restores focus across browser Back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'android-chrome');
  await createCreatorAtChannelSetup(page, testInfo);

  const mobileNavigation = page.getByRole('navigation', { name: 'Creator mobile navigation' });
  const home = mobileNavigation.getByRole('button', { name: 'Home', exact: true });
  const main = page.locator('#ds-main-content');

  await home.focus();
  await expect(home).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/creator\/overview$/);
  await expect(main).toBeFocused();

  const accountTrigger = page.locator('.ds-mobile-account-menu').getByLabel('Open account and workspace menu');
  await expect(accountTrigger).toBeVisible();
  await accountTrigger.focus();
  await expect(accountTrigger).toBeFocused();
  await page.keyboard.press('Escape');

  await expect(page).toHaveURL(/\/creator\/overview$/);
  await expect(accountTrigger).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(/\/creator\/broadcasts$/);
  await expect(main).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Create your first channel' })).toBeVisible();
});
