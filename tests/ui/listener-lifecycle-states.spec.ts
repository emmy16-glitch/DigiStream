import { expect, test, type Page } from '@playwright/test';

const routePath = '/listen/lifecycle-org/lifecycle-channel/lifecycle-event';
const metadataPath =
  '/api/v1/broadcasts/lifecycle-org/lifecycle-channel/lifecycle-event';

type LifecycleStatus =
  | 'scheduled'
  | 'starting'
  | 'live'
  | 'reconnecting'
  | 'ending'
  | 'completed'
  | 'cancelled'
  | 'failed';

function broadcastFixture(
  status: LifecycleStatus,
  scheduledStartAt = new Date(Date.now() + 60 * 60_000).toISOString(),
) {
  const now = new Date().toISOString();
  return {
    broadcast: {
      id: 'lifecycle-broadcast-1',
      slug: 'lifecycle-event',
      title: 'Lifecycle verification broadcast',
      description: 'A real DigiStream lifecycle presentation check.',
      status,
      scheduledStartAt,
      liveStartedAt:
        status === 'live' ||
        status === 'reconnecting' ||
        status === 'ending' ||
        status === 'completed'
          ? now
          : null,
      endedAt:
        status === 'completed' || status === 'cancelled' || status === 'failed'
          ? now
          : null,
      organisation: {
        id: 'lifecycle-organisation-1',
        name: 'Lifecycle Organisation',
        slug: 'lifecycle-org',
      },
      channel: {
        id: 'lifecycle-channel-1',
        name: 'Lifecycle Channel',
        slug: 'lifecycle-channel',
        category: 'community',
      },
    },
  };
}

async function mockLifecycleBroadcast(
  page: Page,
  status: LifecycleStatus,
  scheduledStartAt?: string,
) {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 401,
      body: JSON.stringify({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
          requestId: 'playwright-lifecycle',
        },
      }),
    });
  });

  await page.route(`**${metadataPath}*`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === metadataPath) {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify(broadcastFixture(status, scheduledStartAt)),
      });
      return;
    }
    await route.continue();
  });
}

test('overdue scheduled event is presented as missed without live controls or calendar action', async ({
  page,
}) => {
  await mockLifecycleBroadcast(
    page,
    'scheduled',
    new Date(Date.now() - 60 * 60_000).toISOString(),
  );
  await page.goto(routePath);

  await expect(page.locator('.listener-live-badge.overdue')).toBeVisible();
  await expect(page.locator('.listener-orb')).toHaveAttribute(
    'data-lifecycle-label',
    'MISSED',
  );
  await expect(page.getByRole('button', { name: 'Listen live' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Add to calendar' })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Refresh broadcast status' }),
  ).toBeVisible();
});

const lifecycleCases: Array<{
  status: Exclude<LifecycleStatus, 'scheduled' | 'live'>;
  artLabel: string;
  playable: boolean;
}> = [
  { status: 'starting', artLabel: 'CONNECTING', playable: false },
  { status: 'reconnecting', artLabel: 'RECOVERING', playable: true },
  { status: 'ending', artLabel: 'ENDING', playable: true },
  { status: 'completed', artLabel: 'ENDED', playable: false },
  { status: 'cancelled', artLabel: 'CANCELLED', playable: false },
  { status: 'failed', artLabel: 'UNAVAILABLE', playable: false },
];

for (const lifecycle of lifecycleCases) {
  test(`${lifecycle.status} lifecycle uses truthful art and control availability`, async ({
    page,
  }) => {
    await mockLifecycleBroadcast(page, lifecycle.status);
    await page.goto(routePath);

    await expect(page.locator('.listener-orb')).toHaveAttribute(
      'data-lifecycle-label',
      lifecycle.artLabel,
    );
    await expect(page.locator(`.listener-live-badge.${lifecycle.status}`)).toBeVisible();

    const listenButton = page.getByRole('button', { name: 'Listen live' });
    if (lifecycle.playable) {
      await expect(listenButton).toBeVisible();
      await expect(page.getByRole('button', { name: 'Mute' })).toBeVisible();
    } else {
      await expect(listenButton).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Mute' })).toHaveCount(0);
      await expect(page.getByLabel('Volume')).toHaveCount(0);
    }
  });
}
