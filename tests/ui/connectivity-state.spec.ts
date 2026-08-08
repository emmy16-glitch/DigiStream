import { expect, test } from '@playwright/test';

test.describe('global connectivity state', () => {
  test.afterEach(async ({ context }) => {
    await context.setOffline(false);
  });

  test('reports local offline state without claiming server failure', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByTestId('connectivity-status')).toHaveCount(0);

    await context.setOffline(true);

    const status = page.getByTestId('connectivity-status');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toContainText('You appear to be offline.');
    await expect(status).toContainText('Server-backed actions may not work');
    await expect(status).not.toContainText('server is down');

    await context.setOffline(false);
    await expect(status).toContainText('Network available again.');
    await expect(status).toContainText('Retry any action that did not complete');
  });

  test('connectivity status is mounted outside authenticated product ownership', async ({ page, context }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('heading', { name: 'Not Found' })).toBeVisible();

    await context.setOffline(true);
    await expect(page.getByTestId('connectivity-status')).toContainText('You appear to be offline.');
    await expect(page.getByRole('heading', { name: 'Not Found' })).toBeVisible();
  });
});
