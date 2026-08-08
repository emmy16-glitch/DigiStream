import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const viewports = [
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'desktop-compact', width: 1280, height: 720 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'short-landscape', width: 844, height: 390 },
] as const;

const guestToken = 'responsive-guest-token-abcdefghijklmnopqrstuvwxyz-123456';
const guestRoute = `/guest/${guestToken}`;

async function expectNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function expectNoInternalOverflow(locator: Locator) {
  const dimensions = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function expectTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function primeAcceptedGuestSession(page: Page) {
  await page.addInitScript(
    ({ storageKey, token, session }) => {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ tokenSuffix: token.slice(-12), session }),
      );
    },
    {
      storageKey: 'digistream-external-guest-session',
      token: guestToken,
      session: {
        invitationId: 'invitation-responsive',
        organisationId: 'organisation-responsive',
        broadcastId: 'broadcast-responsive',
        displayName: 'Guest With A Deliberately Long Display Name For Responsive Acceptance',
        admitted: false,
        expiresAt: '2030-08-08T18:00:00.000Z',
        sessionToken: 'guest-session-responsive',
      },
    },
  );

  await page.route('**/api/v1/guest-contribution-token', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 409,
      body: JSON.stringify({
        error: {
          code: 'GUEST_SESSION_UNAVAILABLE',
          message: 'The host has not admitted this guest session yet.',
          requestId: 'guest-responsive-matrix',
        },
      }),
    });
  });
}

test('guest join and terminal system states pass the exact responsive matrix', async ({ page }, testInfo: TestInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The exact six-viewport matrix runs once; Android projects retain their device-specific acceptance coverage.',
  );

  await primeAcceptedGuestSession(page);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto(guestRoute);
    const guestPage = page.locator('.guest-page');
    const guestShell = page.locator('.guest-shell');
    await expect(guestPage).toBeVisible();
    await expect(page.getByRole('heading', { name: 'You’re invited to join a live conversation.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Check your audio' })).toBeVisible();
    await expect(page.getByText('Waiting for the host to admit you', { exact: true })).toBeVisible();
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(guestShell);
    await expectTouchTarget(page.getByRole('link', { name: 'Echoo home' }));
    await expectTouchTarget(page.getByRole('button', { name: 'Prepare microphone' }));
    await expectTouchTarget(page.getByRole('button', { name: 'Join Studio Lobby' }));
    await expectTouchTarget(page.getByLabel('Microphone input'));

    await page.goto('/login?reason=session-expired');
    const expiredState = page.locator('.echoo-system-page-session-expired');
    await expect(expiredState).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Session Expired' })).toBeVisible();
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(expiredState.locator('.echoo-system-card'));
    await expectTouchTarget(page.getByRole('button', { name: 'Log in again' }));

    await page.goto('/this-route-does-not-exist');
    const missingState = page.locator('.echoo-system-page-not-found');
    await expect(missingState).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Not Found' })).toBeVisible();
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(missingState.locator('.echoo-system-card'));
    await expectTouchTarget(page.getByRole('button', { name: 'Go back' }));

    if (viewport.name === 'mobile-390' || viewport.name === 'short-landscape') {
      await testInfo.attach(`guest-system-slice6-${viewport.name}`, {
        body: await page.screenshot({ animations: 'disabled', fullPage: true }),
        contentType: 'image/png',
      });
    }
  }
});
