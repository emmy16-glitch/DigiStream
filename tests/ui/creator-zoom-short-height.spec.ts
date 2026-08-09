import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const password = 'Playwright-creator-password-123!';

async function registerCreator(page: Page, suffix: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue with Email', exact: true }).click();
  await page.getByLabel('Full name').fill('Zoom Test Creator');
  await page.getByLabel('Email').fill(`zoom-${suffix}@example.test`);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await page.getByRole('button', { name: 'Broadcast audio' }).click();
  await expect(page.getByRole('heading', { name: 'Set up your creator workspace' })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test('signed-in identity and sign out remain discoverable at 200% zoom and short landscape height', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'CSS zoom verification is Chromium-specific.');

  const suffix = randomUUID().slice(0, 8);
  const email = `zoom-${suffix}@example.test`;
  await registerCreator(page, suffix);

  await page.setViewportSize({ width: 640, height: 360 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });

  const accountMenu = page.locator('.ds-mobile-account-menu');
  const accountTrigger = accountMenu.getByLabel('Open account and workspace menu');
  await expect(accountTrigger).toBeVisible();
  const triggerBox = await accountTrigger.boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(triggerBox!.height).toBeGreaterThanOrEqual(44);
  await accountTrigger.click();

  const popover = accountMenu.locator('.ds-mobile-account-popover');
  await expect(popover).toBeVisible();
  await expect(popover.getByText(`Signed in as ${email}`, { exact: true })).toBeVisible();

  const signOutButton = popover.getByRole('button', { name: 'Sign out Zoom Test Creator' });
  await expect(signOutButton).toBeVisible();
  await expect(signOutButton).toContainText('Sign out');

  const signOutBox = await signOutButton.boundingBox();
  expect(signOutBox).not.toBeNull();
  expect(signOutBox!.height).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);
});
