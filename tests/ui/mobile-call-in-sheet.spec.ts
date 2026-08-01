import { expect, test, type Page } from '@playwright/test';

const routePath = '/listen/mobile-org/mobile-channel/mobile-event';
const metadataPath = '/api/v1/broadcasts/mobile-org/mobile-channel/mobile-event';

async function mockMobileCallIn(page: Page) {
  await page.addInitScript(() => {
    const viewport = new EventTarget() as EventTarget & {
      height: number;
      width: number;
      offsetTop: number;
      offsetLeft: number;
      pageTop: number;
      pageLeft: number;
      scale: number;
    };
    Object.assign(viewport, {
      height: 520,
      width: 412,
      offsetTop: 16,
      offsetLeft: 0,
      pageTop: 16,
      pageLeft: 0,
      scale: 1,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: viewport,
    });
  });

  await page.route(`**${metadataPath}*`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === metadataPath) {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({
          broadcast: {
            id: 'mobile-broadcast-1',
            slug: 'mobile-event',
            title: 'Mobile call-in broadcast',
            description: 'A live event for mobile sheet verification.',
            status: 'live',
            scheduledStartAt: new Date(
              Date.now() - 20 * 60_000,
            ).toISOString(),
            liveStartedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
            endedAt: null,
            organisation: {
              id: 'mobile-organisation-1',
              name: 'Mobile Organisation',
              slug: 'mobile-org',
            },
            channel: {
              id: 'mobile-channel-1',
              name: 'Mobile Channel',
              slug: 'mobile-channel',
              category: 'community',
            },
          },
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        user: {
          id: 'mobile-listener-1',
          displayName: 'Mobile Listener',
          email: 'mobile-listener@example.test',
        },
      }),
    });
  });

  await page.route('**/api/v1/organisations', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({ organisations: [] }),
    });
  });

  await page.route(`**${metadataPath}/call-ins`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 201,
      body: JSON.stringify({
        callIn: {
          id: 'mobile-call-in-1',
          displayName: 'Mobile Listener',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        statusToken: 'mobile-status-token',
        statusExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      }),
    });
  });

  await page.route('**/api/v1/call-ins/mobile-status-token', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        callIn: {
          id: 'mobile-call-in-1',
          status: 'pending',
          displayName: 'Mobile Listener',
          contactProvided: true,
          createdAt: new Date().toISOString(),
          decidedAt: null,
          statusExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
          guidance: 'Your request is waiting for the production team.',
        },
      }),
    });
  });
}

test('mobile request-to-speak sheet follows the visible viewport and preserves status', async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await mockMobileCallIn(page);
  await page.goto(routePath);

  const launcher = page.getByRole('button', { name: 'Request to speak' });
  await expect(launcher).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.body.classList.contains('ds-listener-fixed-action-visible'),
      ),
    )
    .toBe(true);

  await launcher.click();

  const dialog = page.getByRole('dialog', { name: 'Request to speak' });
  await expect(dialog).toBeVisible();
  await expect(launcher).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.body.classList.contains('ds-listener-fixed-action-visible'),
      ),
    )
    .toBe(false);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe('hidden');

  const overlay = page.locator('.listener-call-in.open');
  await expect
    .poll(() =>
      overlay.evaluate((element) => ({
        height: element.style.getPropertyValue(
          '--ds-overlay-viewport-height',
        ),
        top: element.style.getPropertyValue('--ds-overlay-viewport-top'),
        keyboard: element.style.getPropertyValue(
          '--ds-overlay-keyboard-inset',
        ),
      })),
    )
    .toEqual({ height: '520px', top: '16px', keyboard: '379px' });

  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(15);
  expect(box!.y + box!.height).toBeLessThanOrEqual(537);

  await expect(dialog.getByLabel('Display name')).toHaveValue('Mobile Listener');
  await expect(dialog.getByLabel('Contact email')).toHaveValue(
    'mobile-listener@example.test',
  );
  await expect(dialog.locator('[data-icon="close"]')).toBeVisible();

  await dialog
    .getByLabel('What would you like to say?')
    .fill('I would like to contribute briefly.');
  await dialog.getByRole('button', { name: 'Send request' }).click();

  await expect(
    page.getByText(/Request sent\. Your status will update here/),
  ).toBeVisible();
  await expect(page.getByText('Waiting for review', { exact: true })).toBeVisible();
  await expect(dialog).toBeVisible();

  await dialog
    .getByRole('button', { name: 'Close request-to-speak panel' })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Call-in pending' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.body.classList.contains('ds-listener-fixed-action-visible'),
      ),
    )
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe('');
});
