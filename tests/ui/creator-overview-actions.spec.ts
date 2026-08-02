import { randomUUID } from 'node:crypto';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const password = 'Playwright-overview-password-123!';

async function attachViewport(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    overflow.scrollWidth,
    `page overflowed horizontally: ${overflow.scrollWidth}px > ${overflow.clientWidth}px`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function createCreatorWorkspace(page: Page, suffix: string) {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Display name').fill('Playwright Overview Creator');
  await page.getByLabel('Email').fill(`overview-${suffix}@example.test`);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account with email' }).click();

  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await page.getByRole('button', { name: 'Broadcast audio' }).click();

  await expect(page.getByRole('heading', { name: 'Set up your creator workspace' })).toBeVisible();
  await page.getByLabel('Organisation name').fill(`Overview Organisation ${suffix}`);
  await page.getByLabel('Public slug').fill(`overview-${suffix}`);
  await page.getByRole('button', { name: 'Continue to channel setup' }).click();

  await expect(page).toHaveURL(/\/creator\/broadcasts$/);
  await expect(page.getByRole('heading', { name: 'Create your first channel' })).toBeVisible();
}

async function createAndActivateChannel(page: Page, suffix: string) {
  const channelName = `Channel ${suffix}`;
  const channelNameInput = page.getByLabel('Channel name');
  await expect.poll(async () => {
    const loading = await page.getByText('Loading channels', { exact: true }).isVisible();
    return !loading && (await channelNameInput.isVisible());
  }).toBe(true);
  const channelForm = page.locator('form.creator-form-grid').filter({ has: channelNameInput });
  await channelNameInput.fill(channelName);
  await channelForm.getByLabel('Public slug').fill(`overview-channel-${suffix}`);
  await channelForm.getByRole('button', {
    name: 'Create and activate channel',
    exact: true,
  }).click();

  await expect(page.getByRole('heading', { name: 'How would you like to start?' })).toBeVisible();
}

test('Overview is state-aware: active channel with no broadcast shows a single create-broadcast action and survives refresh', async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${randomUUID().slice(0, 8)}`;

  await createCreatorWorkspace(page, suffix);
  await createAndActivateChannel(page, suffix);

  // Finish later keeps the active channel but chooses not to create a broadcast.
  await page.getByRole('button', { name: 'I’ll create a broadcast later', exact: true }).click();

  await expect(page).toHaveURL(/\/creator\/overview$/);
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();

  // Active channel with no broadcast -> the one contextual primary action.
  await expect(page.getByRole('button', { name: 'Create your first broadcast', exact: true })).toBeVisible();

  // No dead Studio or Backstage actions when no broadcast exists.
  await expect(page.getByRole('button', { name: 'Open broadcast studio', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Manage backstage', exact: true })).toHaveCount(0);

  // Exactly one primary action is exposed.
  await expect(page.locator('.workspace-welcome-actions .ds-button-primary')).toHaveCount(1);

  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, `overview-after-finish-later-${testInfo.project.name}`);

  // Refresh reconstructs the same valid next action from real API state.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Create your first broadcast', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open broadcast studio', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Manage backstage', exact: true })).toHaveCount(0);
  await expect(page.locator('.workspace-welcome-actions .ds-button-primary')).toHaveCount(1);

  // The action opens the existing Broadcasts page and existing first-broadcast flow.
  await page.getByRole('button', { name: 'Create your first broadcast', exact: true }).click();
  await expect(page).toHaveURL(/\/creator\/broadcasts$/);
  await expect(page.getByRole('heading', { name: 'How would you like to start?' })).toBeVisible();
});
