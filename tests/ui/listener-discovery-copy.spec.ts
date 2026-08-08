import { expect, test } from '@playwright/test';

test('listener discovery keeps infrastructure language out of primary copy', async ({ page }) => {
  await page.route('**/api/v1/broadcasts?limit=40', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({ broadcasts: [] }),
    });
  });

  await page.goto('/listen');

  await expect(page.getByRole('heading', { name: 'Discover', exact: true })).toBeVisible();
  await expect(page.getByText('Find live and upcoming broadcasts.', { exact: true })).toBeVisible();
  await expect(page.getByText('No matching broadcast is live right now', { exact: true })).toBeVisible();
  await expect(page.getByText('No matching upcoming broadcasts', { exact: true })).toBeVisible();

  await expect(page.getByText(/WebRTC/i)).toHaveCount(0);
  await expect(page.getByText(/LL-HLS/i)).toHaveCount(0);
  await expect(page.getByText(/falls back automatically/i)).toHaveCount(0);
  await expect(page.getByText(/Broadcast Studio/i)).toHaveCount(0);
});
