import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const password = 'Playwright-communication-audit-123!';
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
): Promise<ApiEnvelope> {
  return page.evaluate(
    async ({ requestPath, requestMethod, requestBody }) => {
      const response = await fetch(requestPath, {
        method: requestMethod,
        credentials: 'include',
        headers: requestBody === null ? undefined : { 'content-type': 'application/json' },
        body: requestBody === null ? undefined : JSON.stringify(requestBody),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`${requestMethod} ${requestPath} failed (${response.status}): ${text}`);
      }
      return text ? JSON.parse(text) : {};
    },
    { requestPath: path, requestMethod: method, requestBody: body },
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
  await page.getByLabel('Full name').fill('Communication Responsive Audit');
  await page.getByLabel('Email').fill(`communication-${suffix}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
}

async function createCommunicationState(page: Page, suffix: string) {
  const me = await apiJson(page, '/api/v1/auth/me');
  const organisationResponse = await apiJson(page, '/api/v1/organisations', 'POST', {
    name: `Communication workspace ${suffix} with a deliberately long organisation name`,
    slug: `communication-workspace-${suffix}`,
  });
  const organisation = organisationResponse.organisation;

  const channelResponse = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels`,
    'POST',
    {
      name: `Communication channel ${suffix} with a deliberately long channel name`,
      slug: `communication-channel-${suffix}`,
      description: 'Responsive audit channel for creator communication surfaces.',
      category: 'community',
      visibility: 'public',
    },
  );
  const channel = channelResponse.channel;

  await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels/${channel.id}`,
    'PATCH',
    { status: 'pending_review' },
  );
  const activeChannelResponse = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels/${channel.id}`,
    'PATCH',
    { status: 'active' },
  );
  const activeChannel = activeChannelResponse.channel;

  const scheduledStartAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const broadcastResponse = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels/${activeChannel.id}/broadcasts`,
    'POST',
    {
      title: `Communication broadcast ${suffix} with a deliberately long scheduled title`,
      slug: `communication-broadcast-${suffix}`,
      description: 'Real scheduled broadcast used for Chat and Studio Lobby responsive auditing.',
      scheduledStartAt,
    },
  );

  await page.evaluate(
    ({ userId, organisationId }) => {
      window.localStorage.setItem(`digistream.creator.workspace.${userId}`, organisationId);
    },
    { userId: me.user.id, organisationId: organisation.id },
  );

  return {
    broadcastTitle: broadcastResponse.broadcast.title as string,
  };
}

async function auditChat(page: Page, viewport: (typeof viewports)[number], broadcastTitle: string) {
  await page.goto('/creator/chat');
  const workspace = page.locator('.creator-chat-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace.getByRole('heading', { name: 'Chat', exact: true })).toBeVisible();
  await expectNoPageOverflow(page);
  await expectNoInternalOverflow(workspace);

  const context = page.getByRole('complementary', { name: 'Conversation context' });
  await expect(context).toBeVisible();
  await expectNoInternalOverflow(context);

  const selects = context.locator('select:visible');
  expect(await selects.count()).toBe(3);
  for (let index = 0; index < await selects.count(); index += 1) {
    await expectTouchTarget(selects.nth(index));
  }

  await expect(context.getByText(broadcastTitle, { exact: true }).first()).toBeVisible();
  const chat = workspace.locator('.broadcast-chat');
  await expect(chat).toBeVisible();
  await expectNoInternalOverflow(chat);
  await expect(chat.getByText('Chat opens when the broadcast starts.', { exact: true })).toBeVisible();

  if (viewport.name === 'mobile-390' || viewport.name === 'short-landscape') {
    const body = page.locator('.creator-chat-body');
    await expectNoInternalOverflow(body);
  }
}

async function auditStudioLobby(page: Page, viewport: (typeof viewports)[number], broadcastTitle: string) {
  await page.goto('/creator/studio-lobby');
  const openButton = page.getByRole('button', { name: 'Open Studio Lobby', exact: true });
  await expect(openButton).toBeVisible();
  await expectTouchTarget(openButton);
  await expectNoPageOverflow(page);

  await openButton.click();
  const dialog = page.getByRole('dialog', { name: 'Studio Lobby' });
  await expect(dialog).toBeVisible();
  await expectNoInternalOverflow(dialog);

  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);

  await expectTouchTarget(page.getByRole('button', { name: 'Close Studio Lobby' }));
  const selects = dialog.locator('.backstage-selection select:visible');
  expect(await selects.count()).toBe(3);
  for (let index = 0; index < await selects.count(); index += 1) {
    await expectTouchTarget(selects.nth(index));
  }

  await expect(dialog.getByText(broadcastTitle, { exact: true }).first()).toBeVisible();
  const inviteForm = dialog.locator('.backstage-invite-form');
  await expect(inviteForm).toBeVisible();
  await expectNoInternalOverflow(inviteForm);
  const inviteControls = inviteForm.locator('input:visible, select:visible, button:visible');
  for (let index = 0; index < await inviteControls.count(); index += 1) {
    await expectTouchTarget(inviteControls.nth(index));
  }

  await page.goBack();
  await expect(dialog).toHaveCount(0);
}

async function auditRecordings(page: Page) {
  await page.goto('/creator/recordings');
  const recordings = page.locator('.creator-recordings-page');
  await expect(recordings).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recordings', exact: true })).toBeVisible();
  await expect(page.getByText('No recordings yet', { exact: true })).toBeVisible();
  await expectNoPageOverflow(page);
  await expectNoInternalOverflow(recordings);
  await expectTouchTarget(page.getByRole('button', { name: 'Refresh', exact: true }));
  await expect(page.locator('.recording-reference-row')).toHaveCount(0);
}

test('Chat, Studio Lobby and Recordings pass the exact responsive matrix', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The exact six-viewport matrix runs once; Android projects retain their existing device-specific smoke coverage.',
  );

  const suffix = randomUUID().slice(0, 8);
  await registerCreator(page, suffix);
  const state = await createCommunicationState(page, suffix);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await auditChat(page, viewport, state.broadcastTitle);
    await auditStudioLobby(page, viewport, state.broadcastTitle);
    await auditRecordings(page);

    if (viewport.name === 'mobile-390' || viewport.name === 'short-landscape') {
      await page.goto('/creator/chat');
      await expect(page.locator('.creator-chat-workspace')).toBeVisible();
      await testInfo.attach(`communication-${viewport.name}`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    }
  }
});
