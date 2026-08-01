import { expect, test, type Page } from '@playwright/test';

const replay = {
  id: 'recording-1',
  recordingId: 'recording-1',
  organisationId: 'organisation-1',
  channelId: 'channel-1',
  broadcastId: 'broadcast-1',
  title: 'Sunday worship replay',
  slug: 'sunday-worship-replay',
  description: 'Recorded worship audio published through DigiStream.',
  endedAt: '2026-08-01T10:00:00.000Z',
  publishedAt: '2026-08-01T11:00:00.000Z',
  media: {
    format: 'mp3',
    contentType: 'audio/mpeg',
    sizeBytes: 2048,
    durationMs: 185_000,
  },
  organisation: {
    id: 'organisation-1',
    name: 'Test Organisation',
    slug: 'test-org',
  },
  channel: {
    id: 'channel-1',
    name: 'Test Channel',
    slug: 'test-channel',
    category: 'worship',
    visibility: 'public',
  },
  access: 'public',
  updatedAt: '2026-08-01T11:00:00.000Z',
};

async function mockReplayApi(page: Page) {
  await page.route('**/api/v1/replays?limit=60', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({ replays: [replay] }),
    });
  });

  await page.route(
    '**/api/v1/replays/test-org/test-channel/sunday-worship-replay',
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          contentType: 'application/json',
          status: 200,
          body: JSON.stringify({ replay }),
        });
        return;
      }
      await route.continue();
    },
  );

  await page.route(
    '**/api/v1/replays/test-org/test-channel/sunday-worship-replay/access',
    async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({
          access: {
            mode: 'playback',
            url: '/api/v1/recording-media?token=playwright-replay-token',
            expiresAt: new Date(Date.now() + 120_000).toISOString(),
          },
        }),
      });
    },
  );

  await page.route('**/api/v1/recording-media?token=playwright-replay-token', async (route) => {
    await route.fulfill({
      contentType: 'audio/mpeg',
      headers: {
        'accept-ranges': 'bytes',
        'cache-control': 'private, no-store',
      },
      status: 200,
      body: Buffer.from('playwright-replay-audio'),
    });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    )
    .toBe(true);
}

test('public replay discovery exposes only real API metadata and active Replay navigation', async ({
  page,
}) => {
  await mockReplayApi(page);
  await page.goto('/listen/replays');

  await expect(page.getByRole('heading', { name: 'Published recordings' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sunday worship replay/ })).toBeVisible();
  await expect(page.getByText('3:05', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Replays' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expectNoHorizontalOverflow(page);
});

test('mobile replay page mints playback only after the listener chooses Start listening', async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await mockReplayApi(page);
  await page.goto('/listen/replay/test-org/test-channel/sunday-worship-replay');

  await expect(page.getByRole('heading', { name: 'Sunday worship replay' })).toBeVisible();
  await expect(page.locator('audio')).toHaveCount(0);

  await page.getByRole('button', { name: 'Start listening' }).click();

  const audio = page.locator('audio');
  await expect(audio).toBeVisible();
  await expect(audio).toHaveAttribute(
    'src',
    '/api/v1/recording-media?token=playwright-replay-token',
  );
  await expect(page.getByText(/Access expires/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
