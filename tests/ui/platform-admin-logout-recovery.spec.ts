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

test('platform administration stays signed in until logout is confirmed by the server', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The logout truth contract runs once; responsive projects cover the shared authentication surfaces.',
  );

  let logoutAttempts = 0;
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ user: adminUser }),
    });
  });
  await page.route('**/api/v1/auth/providers', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        providers: {
          email: { enabled: true },
          google: { enabled: false, clientId: null },
        },
      }),
    });
  });
  await page.route('**/api/v1/admin/users?**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ users: [adminUser], nextCursor: null }),
    });
  });
  await page.route('**/api/v1/auth/logout', async (route) => {
    logoutAttempts += 1;
    if (logoutAttempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'DEPENDENCY_UNAVAILABLE',
            message: 'Logout could not be confirmed.',
          },
        }),
      });
      return;
    }
    await route.fulfill({ status: 204, body: '' });
  });

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

  const signOut = page.getByRole('button', { name: 'Sign out' });
  await signOut.click();

  await expect(page.getByRole('heading', { name: 'Sign out could not complete' })).toBeVisible();
  await expect(page.getByText('You are still signed in on this device.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await expect(page.getByText('admin@example.test', { exact: true })).toBeVisible();
  expect(logoutAttempts).toBe(1);

  await page.getByRole('button', { name: 'Try sign out again' }).click();
  await expect(page.getByRole('heading', { name: 'Users' })).toBeHidden();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  expect(logoutAttempts).toBe(2);
});
