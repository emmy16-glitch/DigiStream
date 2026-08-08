import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

const password = 'Playwright-platform-admin-access-123!';

async function expectNoPageOverflow(page: import('@playwright/test').Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test('non-admin sessions see a truthful responsive access boundary at /admin', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The platform-admin access matrix runs once; existing Android projects cover device-specific smoke behavior.',
  );

  const suffix = randomUUID().slice(0, 10);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Continue with Email' }).click();
  await page.getByLabel('Full name').fill('Platform Admin Access Audit');
  await page.getByLabel('Email').fill(`platform-admin-access-${suffix}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();

  await page.goto('/admin');
  const denied = page.getByText('Platform administrator access required', { exact: true });
  await expect(denied).toBeVisible();
  await expect(page.getByText('Your creator and listener access is unchanged.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Creator workspace' })).toBeVisible();
  await expectNoPageOverflow(page);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(denied).toBeVisible();
  await expectNoPageOverflow(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(denied).toBeVisible();
  await expectNoPageOverflow(page);
});
