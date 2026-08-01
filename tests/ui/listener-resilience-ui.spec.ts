import { expect, test, type Page } from '@playwright/test';

const routePath = '/listen/resilience-org/resilience-channel/live-event';
const metadataPath =
  '/api/v1/broadcasts/resilience-org/resilience-channel/live-event';

async function mockLiveBroadcast(page: Page) {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 401,
      body: JSON.stringify({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
          requestId: 'listener-resilience-ui',
        },
      }),
    });
  });

  await page.route(`**${metadataPath}*`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== metadataPath) {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        broadcast: {
          id: 'resilience-broadcast-1',
          slug: 'live-event',
          title: 'Listener resilience check',
          description: 'A live event used to verify listener-facing connection states.',
          status: 'live',
          scheduledStartAt: new Date(Date.now() - 15 * 60_000).toISOString(),
          liveStartedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
          endedAt: null,
          organisation: {
            id: 'resilience-org-1',
            name: 'Resilience Organisation',
            slug: 'resilience-org',
          },
          channel: {
            id: 'resilience-channel-1',
            name: 'Resilience Channel',
            slug: 'resilience-channel',
            category: 'community',
          },
        },
      }),
    });
  });
}

test('live listener page keeps transport details secondary and has one page landmark', async ({
  page,
}) => {
  await mockLiveBroadcast(page);
  await page.goto(routePath);

  await expect(page.getByRole('button', { name: 'Listen live' })).toBeVisible();
  await expect(page.getByText('Ready', { exact: true })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('.ds-listener-header')).toHaveCount(1);

  const diagnostics = page.getByText('Technical details', { exact: true });
  await expect(diagnostics).toBeVisible();
  await expect(page.getByText(/WebRTC|LL-HLS/)).toHaveCount(0);

  await diagnostics.click();
  await expect(page.getByText(/Automatic WebRTC to LL-HLS selection/)).toBeVisible();
});

test('mobile listener keeps mute available while collapsing the full volume slider', async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await mockLiveBroadcast(page);
  await page.goto(routePath);

  await expect(page.getByRole('button', { name: 'Mute' })).toBeVisible();
  await expect(page.getByLabel('Volume')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Listen live' })).toBeVisible();
});
