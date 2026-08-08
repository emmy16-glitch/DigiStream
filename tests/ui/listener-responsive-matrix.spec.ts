import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const viewports = [
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'desktop-compact', width: 1280, height: 720 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'short-landscape', width: 844, height: 390 },
] as const;

const organisationName =
  'DigiStream Community Organisation With A Deliberately Long Listener-Facing Name';
const channelName =
  'Community Conversations And Public Audio With A Deliberately Long Channel Name';
const broadcastTitle =
  'A deliberately long live broadcast title that still keeps every listener control reachable';
const replayTitle =
  'A deliberately long published replay title that remains readable on every supported viewport';
const routePath = '/listen/test-org/test-channel/test-event';
const metadataPath = '/api/v1/broadcasts/test-org/test-channel/test-event';
const replayPath = '/listen/replay/test-org/test-channel/test-replay';
const replayMetadataPath = '/api/v1/replays/test-org/test-channel/test-replay';

function liveBroadcast() {
  const now = new Date();
  return {
    id: 'broadcast-live-responsive',
    slug: 'test-event',
    title: broadcastTitle,
    description:
      'A real listener-facing description used to verify responsive hierarchy without changing playback state.',
    status: 'live',
    scheduledStartAt: new Date(now.getTime() - 15 * 60_000).toISOString(),
    liveStartedAt: new Date(now.getTime() - 10 * 60_000).toISOString(),
    endedAt: null,
    organisation: {
      id: 'organisation-responsive',
      name: organisationName,
      slug: 'test-org',
    },
    channel: {
      id: 'channel-responsive',
      name: channelName,
      slug: 'test-channel',
      category: 'community',
    },
  };
}

function scheduledBroadcast() {
  return {
    id: 'broadcast-scheduled-responsive',
    slug: 'scheduled-event',
    title: 'Upcoming community programme with another deliberately long broadcast title',
    description: 'Scheduled listener responsive verification.',
    status: 'scheduled',
    scheduledStartAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    liveStartedAt: null,
    endedAt: null,
    organisation: {
      id: 'organisation-responsive',
      name: organisationName,
      slug: 'test-org',
    },
    channel: {
      id: 'channel-responsive',
      name: channelName,
      slug: 'test-channel',
      category: 'community',
    },
  };
}

const replay = {
  id: 'recording-responsive',
  recordingId: 'recording-responsive',
  organisationId: 'organisation-responsive',
  channelId: 'channel-responsive',
  broadcastId: 'broadcast-replay-responsive',
  title: replayTitle,
  slug: 'test-replay',
  description:
    'A published recording with long listener-facing metadata used only for responsive regression coverage.',
  endedAt: '2026-08-01T10:00:00.000Z',
  publishedAt: '2026-08-01T11:00:00.000Z',
  media: {
    format: 'mp3',
    contentType: 'audio/mpeg',
    sizeBytes: 8_388_608,
    durationMs: 3_725_000,
  },
  organisation: {
    id: 'organisation-responsive',
    name: organisationName,
    slug: 'test-org',
  },
  channel: {
    id: 'channel-responsive',
    name: channelName,
    slug: 'test-channel',
    category: 'community',
    visibility: 'public',
  },
  access: 'public',
  updatedAt: '2026-08-01T11:00:00.000Z',
};

async function mockListenerState(page: Page) {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 401,
      body: JSON.stringify({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
          requestId: 'listener-responsive-matrix',
        },
      }),
    });
  });

  await page.route('**/api/v1/broadcasts?*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/broadcasts') {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({ broadcasts: [liveBroadcast(), scheduledBroadcast()] }),
      });
      return;
    }
    await route.continue();
  });

  await page.route(`**${metadataPath}*`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === metadataPath) {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({ broadcast: liveBroadcast() }),
      });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/v1/replays?*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/replays') {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({ replays: [replay] }),
      });
      return;
    }
    await route.continue();
  });

  await page.route(`**${replayMetadataPath}`, async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({ replay }),
    });
  });
}

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

async function expectDialogContained(
  dialog: Locator,
  viewport: (typeof viewports)[number],
) {
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectVisibleTouchTargets(locator: Locator) {
  for (let index = 0; index < await locator.count(); index += 1) {
    await expectTouchTarget(locator.nth(index));
  }
}

test('listener discovery, live, request-to-speak and replay pass the exact responsive matrix', async ({ page }, testInfo: TestInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The exact six-viewport matrix runs once; Android projects retain their device-specific listener coverage.',
  );

  await mockListenerState(page);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto('/listen');
    const discovery = page.locator('.echoo-discovery-page');
    await expect(discovery).toBeVisible();
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(discovery);
    await expect(page.getByRole('heading', { name: 'Discover', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(broadcastTitle) })).toBeVisible();
    await expectVisibleTouchTargets(discovery.locator('.echoo-discovery-filters button:visible'));

    await page.goto(routePath);
    const listenerShell = page.locator('.listener-shell');
    await expect(listenerShell).toBeVisible();
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(listenerShell);
    await expect(page.getByRole('heading', { name: broadcastTitle })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Listen live' })).toBeVisible();
    await expectVisibleTouchTargets(
      page.locator(
        '.listener-controls button:visible, .listener-secondary-actions button:visible, .listener-secondary-actions a:visible, .listener-diagnostics summary:visible',
      ),
    );

    if (viewport.name === 'mobile-390' || viewport.name === 'mobile-360') {
      const stage = await page.locator('.listener-stage').boundingBox();
      expect(stage).not.toBeNull();
      expect(stage!.height).toBeLessThanOrEqual(230);
      await expect(page.getByLabel('Volume')).toBeHidden();
    }

    if (viewport.name === 'short-landscape') {
      const stage = await page.locator('.listener-stage').boundingBox();
      expect(stage).not.toBeNull();
      expect(stage!.height).toBeLessThanOrEqual(260);
    }

    const launcher = page.getByRole('button', { name: 'Request to speak', exact: true });
    await expect(launcher).toBeVisible();
    await expectTouchTarget(launcher);
    await launcher.click();

    const dialog = page.getByRole('dialog', { name: 'Request to join the conversation' });
    await expect(dialog).toBeVisible();
    await expectDialogContained(dialog, viewport);
    await expectNoInternalOverflow(dialog);
    await expectVisibleTouchTargets(
      dialog.locator('button:visible, input:visible, textarea:visible'),
    );
    await dialog.getByRole('button', { name: 'Close request-to-speak panel' }).click();
    await expect(dialog).toHaveCount(0);

    await page.goto(replayPath);
    const replayPage = page.locator('.echoo-replay-page');
    await expect(replayPage).toBeVisible();
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(replayPage);
    await expect(page.getByRole('heading', { name: replayTitle })).toBeVisible();
    await expectTouchTarget(page.getByRole('button', { name: 'Start listening' }));

    if (viewport.name === 'short-landscape') {
      const replayHero = await page.locator('.echoo-replay-hero').boundingBox();
      expect(replayHero).not.toBeNull();
      expect(replayHero!.height).toBeLessThanOrEqual(250);
    }

    if (viewport.name === 'mobile-390' || viewport.name === 'short-landscape') {
      await testInfo.attach(`listener-slice5-${viewport.name}`, {
        body: await page.screenshot({ animations: 'disabled', fullPage: true }),
        contentType: 'image/png',
      });
    }
  }
});
