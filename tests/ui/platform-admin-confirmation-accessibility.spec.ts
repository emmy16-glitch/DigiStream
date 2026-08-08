import { expect, test } from '@playwright/test';

const adminUser = {
  id: 'admin-user',
  email: 'admin@example.test',
  displayName: 'Platform Admin',
  status: 'active',
  emailVerifiedAt: '2026-08-01T12:00:00.000Z',
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-01T12:00:00.000Z',
  capabilities: ['platform_admin'],
};

const managedUser = {
  id: 'managed-user',
  email: 'managed@example.test',
  displayName: 'Managed User',
  status: 'active',
  emailVerifiedAt: null,
  createdAt: '2026-08-02T12:00:00.000Z',
  updatedAt: '2026-08-02T12:00:00.000Z',
  capabilities: [],
};

test('platform-admin status confirmation owns focus, Escape recovery and post-mutation focus', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The interaction contract runs once; responsive projects already cover the platform-admin shell.',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ user: adminUser }),
    });
  });
  await page.route('**/api/v1/admin/users?**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ users: [adminUser, managedUser], nextCursor: null }),
    });
  });
  await page.route('**/api/v1/admin/users/managed-user/status', async (route) => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().postDataJSON()).toEqual({ status: 'suspended' });
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          ...managedUser,
          status: 'suspended',
          updatedAt: '2026-08-08T21:00:00.000Z',
        },
      }),
    });
  });

  await page.goto('/admin');
  const suspend = page.getByRole('button', { name: 'Suspend', exact: true });
  await expect(suspend).toBeVisible();

  await suspend.click();
  const dialog = page.getByRole('alertdialog', { name: 'Suspend this account?' });
  const cancel = dialog.getByRole('button', { name: 'Cancel' });
  await expect(dialog).toBeVisible();
  await expect(cancel).toBeFocused();
  await expect(dialog).toHaveAttribute('aria-describedby', 'platform-admin-confirm-description');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(suspend).toBeFocused();

  await suspend.press('Enter');
  await expect(cancel).toBeFocused();
  await cancel.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(suspend).toBeFocused();

  await suspend.press('Enter');
  const confirm = dialog.getByRole('button', { name: 'Confirm suspension' });
  await expect(cancel).toBeFocused();
  await confirm.click();

  const reactivate = page.getByRole('button', { name: 'Reactivate', exact: true });
  await expect(reactivate).toBeVisible();
  await expect(reactivate).toBeFocused();
  await expect(page.getByText('suspended', { exact: true })).toBeVisible();
});
