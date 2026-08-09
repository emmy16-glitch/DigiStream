import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const password = 'Playwright-secondary-audit-123!';
const viewports = [
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'desktop-compact', width: 1280, height: 720 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'short-landscape', width: 844, height: 390 },
] as const;

type ApiEnvelope = Record<string, any>;

async function apiJson(
  page: Page,
  path: string,
  method = 'GET',
  body: unknown = null,
  headers: Record<string, string> = {},
): Promise<ApiEnvelope> {
  return page.evaluate(
    async ({ requestPath, requestMethod, requestBody, requestHeaders }) => {
      const response = await fetch(requestPath, {
        method: requestMethod,
        credentials: 'include',
        headers: requestBody === null
          ? requestHeaders
          : { 'content-type': 'application/json', ...requestHeaders },
        body: requestBody === null ? undefined : JSON.stringify(requestBody),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${requestMethod} ${requestPath} failed (${response.status}): ${text}`);
      }
      return text ? JSON.parse(text) : {};
    },
    {
      requestPath: path,
      requestMethod: method,
      requestBody: body,
      requestHeaders: headers,
    },
  );
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

async function registerCreator(page: Page, suffix: string) {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Continue with Email' }).click();
  await page.getByLabel('Full name').fill('Secondary Flow Responsive Audit');
  await page.getByLabel('Email').fill(`secondary-flow-${suffix}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
}

async function createState(page: Page, suffix: string) {
  const me = await apiJson(page, '/api/v1/auth/me');
  const organisationResponse = await apiJson(page, '/api/v1/organisations', 'POST', {
    name: `Secondary flow workspace ${suffix} with a deliberately long workspace name`,
    slug: `secondary-flow-${suffix}`,
  });
  const organisation = organisationResponse.organisation;

  const channelResponse = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels`,
    'POST',
    {
      name: `Secondary flow channel ${suffix} with a deliberately long channel name`,
      slug: `secondary-flow-channel-${suffix}`,
      description: 'Chat, Studio Lobby and Recordings responsive audit.',
      category: 'community',
      visibility: 'public',
    },
  );
  const pendingChannel = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels/${channelResponse.channel.id}`,
    'PATCH',
    { status: 'pending_review' },
  );
  const activeChannel = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels/${pendingChannel.channel.id}`,
    'PATCH',
    { status: 'active' },
  );

  const broadcastResponse = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels/${activeChannel.channel.id}/broadcasts`,
    'POST',
    {
      title: `Scheduled conversation ${suffix} with a deliberately long broadcast title`,
      slug: `scheduled-conversation-${suffix}`,
      description: 'A real scheduled broadcast used for responsive product verification.',
    },
  );
  const scheduledAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const scheduledResponse = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/broadcasts/${broadcastResponse.broadcast.id}/schedule`,
    'POST',
    {
      expectedVersion: broadcastResponse.broadcast.lifecycleVersion,
      scheduledStartAt: scheduledAt,
    },
    { 'idempotency-key': `schedule-${suffix}` },
  );

  await page.evaluate(
    ({ userId, organisationId }) => {
      window.localStorage.setItem(`digistream.creator.workspace.${userId}`, organisationId);
    },
    { userId: me.user.id, organisationId: organisation.id },
  );

  return { broadcastTitle: scheduledResponse.broadcast.title as string };
}

async function expectCreatorShellUsable(page: Page) {
  await expectNoPageOverflow(page);
  await expectNoInternalOverflow(page.locator('#ds-main-content'));
  const visibleControls = page.locator('.ds-topbar-actions .ds-button:visible, .ds-creator-mobile-nav button:visible');
  for (let index = 0; index < await visibleControls.count(); index += 1) {
    await expectTouchTarget(visibleControls.nth(index));
  }
}

test('Chat, Studio Lobby and Recordings pass the exact responsive matrix', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The exact six-viewport matrix runs once; Android projects retain their device-specific coverage.',
  );

  const suffix = randomUUID().slice(0, 8);
  await registerCreator(page, suffix);
  const state = await createState(page, suffix);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto('/creator/chat');
    const chat = page.locator('.creator-chat-workspace');
    await expect(chat).toBeVisible();
    await expectCreatorShellUsable(page);
    await expectNoInternalOverflow(chat);
    await expect(chat.getByRole('heading', { name: 'Chat', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: new RegExp(state.broadcastTitle) })).toHaveCount(1);
    const chatSelects = chat.locator('select:visible');
    for (let index = 0; index < await chatSelects.count(); index += 1) {
      await expectTouchTarget(chatSelects.nth(index));
    }

    await page.goto('/creator/studio-lobby');
    await expect(page.getByRole('heading', { name: 'Studio Lobby and call-ins' })).toBeVisible();
    await expectCreatorShellUsable(page);
    const openLobby = page.locator('#ds-main-content').getByRole('button', { name: 'Open Studio Lobby', exact: true });
    await expectTouchTarget(openLobby);
    await openLobby.click();
    const lobby = page.locator('.backstage-workspace');
    await expect(lobby).toBeVisible();
    await expectNoInternalOverflow(lobby);
    const lobbyBox = await lobby.boundingBox();
    expect(lobbyBox).not.toBeNull();
    expect(lobbyBox!.x).toBeGreaterThanOrEqual(-1);
    expect(lobbyBox!.x + lobbyBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(lobbyBox!.y).toBeGreaterThanOrEqual(-1);
    expect(lobbyBox!.y + lobbyBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    await expectTouchTarget(lobby.locator('.backstage-close'));
    const lobbyControls = lobby.locator('button:visible, input:visible, select:visible');
    for (let index = 0; index < await lobbyControls.count(); index += 1) {
      await expectTouchTarget(lobbyControls.nth(index));
    }
    await lobby.locator('.backstage-close').click();
    await expect(lobby).toHaveCount(0);

    await page.goto('/creator/recordings');
    const recordings = page.locator('.creator-recordings-page');
    await expect(recordings).toBeVisible();
    await expectCreatorShellUsable(page);
    await expectNoInternalOverflow(recordings);
    await expect(recordings.getByRole('heading', { name: 'Recordings', exact: true })).toBeVisible();
    const recordingButtons = recordings.locator('button:visible');
    for (let index = 0; index < await recordingButtons.count(); index += 1) {
      await expectTouchTarget(recordingButtons.nth(index));
    }

    if (viewport.name === 'mobile-390' || viewport.name === 'short-landscape') {
      await testInfo.attach(`secondary-flows-${viewport.name}`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    }
  }
});
