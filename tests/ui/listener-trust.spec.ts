import { expect, test, type Page } from '@playwright/test';

const routePath = '/listen/test-org/test-channel/test-event';
const metadataPath = '/api/v1/broadcasts/test-org/test-channel/test-event';

function broadcastFixture(status: 'scheduled' | 'live') {
  const now = new Date();
  const scheduled = new Date(now.getTime() + 60 * 60_000);
  return {
    broadcast: {
      id: 'broadcast-1',
      slug: 'test-event',
      title: 'Sunday worship',
      description: 'A real DigiStream audio programme.',
      status,
      scheduledStartAt: scheduled.toISOString(),
      liveStartedAt: status === 'live' ? now.toISOString() : null,
      endedAt: null,
      organisation: {
        id: 'organisation-1',
        name: 'Test Organisation',
        slug: 'test-org',
      },
      channel: {
        id: 'channel-1',
        name: 'Test Channel',
        slug: 'test-channel',
        category: 'community',
      },
    },
  };
}

async function mockBroadcast(page: Page, status: 'scheduled' | 'live') {
  await page.route(`**${metadataPath}*`, async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === metadataPath) {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify(broadcastFixture(status)),
      });
      return;
    }

    await route.continue();
  });

  await page.route(`**${metadataPath}/call-ins`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 201,
      body: JSON.stringify({
        callIn: {
          id: 'call-in-1',
          displayName: 'Listener One',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        statusToken: 'test-status-token',
        statusExpiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      }),
    });
  });

  await page.route('**/api/v1/call-ins/test-status-token', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        callIn: {
          id: 'call-in-1',
          status: 'pending',
          displayName: 'Listener One',
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

async function mockVisitor(page: Page) {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 401,
      body: JSON.stringify({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
          requestId: 'playwright-listener',
        },
      }),
    });
  });
}

test('scheduled broadcast does not pretend to be live', async ({ page }) => {
  await mockVisitor(page);
  await mockBroadcast(page, 'scheduled');
  await page.goto(routePath);

  await expect(page.locator('.listener-live-badge.scheduled')).toBeVisible();
  await expect(page.locator('.listener-orb')).toHaveAttribute(
    'data-lifecycle-label',
    'UPCOMING',
  );
  await expect(page.getByText(/Starts in /)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add to calendar' })).toHaveAttribute(
    'download',
    'digistream-broadcast.ics',
  );
  await expect(page.getByRole('button', { name: 'Listen live' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retry playback' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Request to speak' })).toHaveCount(0);
  await expect(
    page.getByText('Chat will open when the broadcast starts.', { exact: true }),
  ).toBeVisible();

  const liveNow = page.getByRole('link', { name: 'Live now' });
  await expect(liveNow).not.toHaveAttribute('aria-current', 'page');
});

test('live lifecycle reveals audio controls without changing scheduled pages', async ({ page }) => {
  await mockVisitor(page);
  await mockBroadcast(page, 'live');
  await page.goto(routePath);

  await expect(page.locator('.listener-orb')).toHaveAttribute(
    'data-lifecycle-label',
    'LIVE',
  );
  await expect(page.getByRole('button', { name: 'Listen live' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mute' })).toBeVisible();
  await expect(page.getByLabel('Volume')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add to calendar' })).toHaveCount(0);
});

test('organisation owner receives creator action instead of listener call-in', async ({ page }) => {
  await mockBroadcast(page, 'live');
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        user: {
          id: 'user-1',
          displayName: 'Production Owner',
          email: 'owner@example.test',
        },
      }),
    });
  });
  await page.route('**/api/v1/organisations', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        organisations: [
          {
            id: 'organisation-1',
            name: 'Test Organisation',
            slug: 'test-org',
            role: 'owner',
          },
        ],
      }),
    });
  });

  await page.goto(routePath);

  await expect(page.getByRole('link', { name: 'Manage broadcast' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request to speak' })).toHaveCount(0);
});

test('mobile request-to-speak flow uses a modal sheet and keeps status visible', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await mockVisitor(page);
  await mockBroadcast(page, 'live');
  await page.goto(routePath);

  const launcher = page.getByRole('button', { name: 'Request to speak' });
  await expect(launcher).toBeVisible();
  await launcher.click();

  const dialog = page.getByRole('dialog', { name: 'Request to speak' });
  await expect(dialog).toBeVisible();
  await expect(launcher).toHaveCount(0);
  await expect(page.locator('.listener-call-in-backdrop')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

  await dialog.getByLabel('Display name').fill('Listener One');
  await dialog.getByLabel('Contact email').fill('listener@example.test');
  await dialog.getByLabel('What would you like to say?').fill('I would like to contribute briefly.');
  await dialog.getByRole('button', { name: 'Send request' }).click();

  await expect(page.getByText(/Request sent\. Your status will update here/)).toBeVisible();
  await expect(page.getByText('Waiting for review', { exact: true })).toBeVisible();
  await expect(dialog).toBeVisible();
});
