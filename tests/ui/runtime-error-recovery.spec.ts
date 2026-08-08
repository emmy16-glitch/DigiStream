import { expect, test } from '@playwright/test';

test.describe('application runtime error recovery', () => {
  test('shows a plain-language bounded recovery state for an unexpected render failure', async ({ page }) => {
    await page.goto('/?__digistream_test_runtime_error=1');

    await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect(page.getByText('DigiStream could not finish displaying this page.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible();

    const body = page.locator('body');
    await expect(body).not.toContainText('Intentional development-only runtime recovery probe');
    await expect(body).not.toContainText('componentStack');
  });
});
