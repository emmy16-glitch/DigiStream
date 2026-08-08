import { expect, test, type Page } from '@playwright/test';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test('Not Found and Session Expired use the final Echoo recovery states', async ({ page }) => {
  await page.goto('/listen/not/a/valid/extra/path');
  await expect(page.getByRole('heading', { name: 'Not Found' })).toBeVisible();
  await expect(page.getByText('Broadcast not found or no longer available.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto('/login?reason=session-expired&returnTo=%2Fcreator%2Foverview');
  await expect(page.getByRole('heading', { name: 'Session Expired' })).toBeVisible();
  await expect(page.getByText('Your session has expired.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in again' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Log in again' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByText('Your session ended. Sign in to continue.')).toBeVisible();
});

test('Loading becomes the truthful No Connection recovery state when the API is unreachable', async ({ page }) => {
  let releaseStatusRequest: (() => void) | undefined;

  await page.route('**/api/v1/status', async (route) => {
    await new Promise<void>((resolve) => {
      releaseStatusRequest = resolve;
    });
    await route.abort('internetdisconnected');
  });

  await page.goto('/login');
  await expect.poll(() => Boolean(releaseStatusRequest)).toBe(true);
  await expect(page.getByRole('heading', { name: 'Loading' })).toBeVisible();
  await expect(page.getByText('Please wait a moment...')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  releaseStatusRequest?.();

  await expect(page.getByRole('heading', { name: 'No Connection' })).toBeVisible();
  await expect(page.getByText('Check your internet connection and try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
