import { randomUUID } from 'node:crypto';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const password = 'Playwright-creator-password-123!';

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
  await page.getByLabel('Display name').fill('Playwright Creator');
  await page.getByLabel('Email').fill(`playwright-${suffix}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account with email' }).click();

  await expect(page.getByRole('heading', { name: 'Create your organisation' })).toBeVisible();
  await page.getByLabel('Organisation name').fill(`Playwright Organisation ${suffix}`);
  await page.getByLabel('Public slug').fill(`playwright-${suffix}`);
  await page.getByRole('button', { name: 'Create organisation' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Playwright' })).toBeVisible();
}

test('creator workflow stays usable at desktop and Android sizes', async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${randomUUID().slice(0, 8)}`;
  const channelName = `Channel ${suffix}`;
  const broadcastTitle = `Broadcast ${suffix}`;

  await createCreatorWorkspace(page, suffix);
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'overview');

  await page.goto('/creator/broadcasts');
  await expect(page.getByRole('heading', { name: 'Broadcasts', exact: true }).last()).toBeVisible();

  const channelHeading = page.getByRole('heading', { name: 'Create a channel' });
  if (!(await channelHeading.isVisible())) {
    await page.getByRole('button', { name: 'Create channel', exact: true }).first().click();
  }

  const channelCard = page.locator('.creator-form-card').filter({ has: channelHeading });
  await channelCard.getByLabel('Channel name').fill(channelName);
  await channelCard.getByLabel('Public slug').fill(`channel-${suffix}`);
  await channelCard.getByLabel('Category').fill('community');
  await channelCard.getByLabel('Visibility').selectOption('public');
  await channelCard.getByLabel('Description').fill('Responsive Playwright channel');
  await channelCard.getByRole('button', { name: 'Create channel', exact: true }).click();

  const channelStrip = page.locator('.channel-strip');
  await expect(channelStrip).toContainText(channelName);
  await channelStrip.getByRole('button', { name: 'Activate channel' }).click();
  await expect(channelStrip).toContainText('Active');

  await page.getByRole('button', { name: 'Create broadcast', exact: true }).first().click();
  const broadcastHeading = page.getByRole('heading', { name: 'Create a broadcast' });
  const broadcastCard = page.locator('.creator-form-card').filter({ has: broadcastHeading });
  await broadcastCard.getByLabel('Broadcast title').fill(broadcastTitle);
  await broadcastCard.getByLabel('Public slug').fill(`broadcast-${suffix}`);
  await broadcastCard.getByLabel('Description').fill('Responsive Playwright broadcast');
  await broadcastCard.getByRole('button', { name: 'Create draft' }).click();

  const broadcastRow = page.locator('.broadcast-row').filter({ hasText: broadcastTitle });
  await expect(broadcastRow).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'broadcasts');

  await broadcastRow.getByRole('button', { name: 'Open in Studio' }).click();
  const studio = page.getByRole('dialog', { name: 'Broadcast studio' });
  await expect(studio).toBeVisible();
  await expect(studio.getByLabel('Channel').locator('option:checked')).toContainText(channelName);
  await expect(studio.getByLabel('Broadcast').locator('option:checked')).toContainText(broadcastTitle);
  await expect(studio.getByRole('button', { name: 'Join private studio' })).toBeDisabled();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'studio');
  await studio.getByRole('button', { name: 'Close broadcast studio' }).click();

  await page.goto('/creator/audience');
  await page.getByRole('button', { name: 'Manage backstage' }).click();
  const backstage = page.getByRole('dialog', { name: 'Creator backstage' });
  await expect(backstage).toBeVisible();

  if (testInfo.project.name.includes('android')) {
    const organisationBox = await backstage.getByLabel('Organisation').boundingBox();
    const channelBox = await backstage.getByLabel('Channel').boundingBox();
    const broadcastBox = await backstage.getByLabel('Broadcast').boundingBox();
    expect(organisationBox).not.toBeNull();
    expect(channelBox).not.toBeNull();
    expect(broadcastBox).not.toBeNull();
    expect(channelBox!.y).toBeGreaterThan(organisationBox!.y + organisationBox!.height - 1);
    expect(broadcastBox!.y).toBeGreaterThan(channelBox!.y + channelBox!.height - 1);
  }

  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'backstage');
  await backstage.getByRole('button', { name: 'Close backstage workspace' }).click();

  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'Creator live chat' });
  await expect(chat).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'chat');
  await chat.getByRole('button', { name: 'Close creator chat' }).click();

  await page.goto('/listen');
  await expect(page.getByRole('heading', { name: 'Live audio without the heavy video.' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'listener-discovery');
});
