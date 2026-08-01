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
  await page.getByLabel(/^Password/).fill(password);
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

  const channelNameInput = page.getByLabel('Channel name');
  const channelToggle = page.locator('.creator-broadcasts-intro-actions button').first();
  await expect.poll(async () => {
    const loading = await page.getByText('Loading channels', { exact: true }).isVisible();
    const formVisible = await channelNameInput.isVisible();
    const toggleVisible = await channelToggle.isVisible();
    return !loading && (formVisible || toggleVisible);
  }).toBe(true);

  if (!(await channelNameInput.isVisible())) {
    await channelToggle.click();
  }
  await expect(channelNameInput).toBeVisible();

  const channelForm = page.locator('form.creator-form-grid').filter({ has: channelNameInput });
  await channelNameInput.fill(channelName);
  await channelForm.getByLabel('Public slug').fill(`channel-${suffix}`);
  await channelForm.getByLabel('Category').fill('community');
  await channelForm.getByLabel('Visibility').selectOption('public');
  await channelForm.getByLabel('Description').fill('Responsive Playwright channel');
  await channelForm.getByRole('button', { name: 'Create channel', exact: true }).click();

  const channelStrip = page.locator('.channel-strip');
  await expect(channelStrip).toContainText(channelName);
  await channelStrip.getByRole('button', { name: 'Activate channel' }).click();
  await expect(channelStrip).toContainText('Active');

  await page
    .locator('.creator-broadcasts-intro-actions')
    .getByRole('button', { name: 'Create broadcast', exact: true })
    .click();
  const broadcastTitleInput = page.getByLabel('Broadcast title');
  await expect(broadcastTitleInput).toBeVisible();
  const broadcastForm = page.locator('form.creator-form-grid').filter({ has: broadcastTitleInput });
  await broadcastTitleInput.fill(broadcastTitle);
  await broadcastForm.getByLabel('Public slug').fill(`broadcast-${suffix}`);
  await broadcastForm.getByLabel('Description').fill('Responsive Playwright broadcast');
  await broadcastForm.getByRole('button', { name: 'Create draft' }).click();

  const broadcastRow = page.locator('.broadcast-row').filter({ hasText: broadcastTitle });
  await expect(broadcastRow).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (testInfo.project.name === 'android-desktop-site') {
    const headingFontSize = await page
      .getByRole('heading', { name: 'Broadcasts', exact: true })
      .last()
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(headingFontSize).toBeGreaterThanOrEqual(20);
    const studioButton = broadcastRow.getByRole('button', { name: 'Open in Studio' });
    const studioButtonBox = await studioButton.boundingBox();
    expect(studioButtonBox).not.toBeNull();
    expect(studioButtonBox!.height).toBeGreaterThanOrEqual(44);
  }
  await attachViewport(page, testInfo, 'broadcasts');

  await broadcastRow.getByRole('button', { name: 'Open in Studio' }).click();
  const studio = page.getByRole('dialog', { name: 'Broadcast studio' });
  await expect(studio).toBeVisible();
  const studioSelects = studio.locator('.studio-field select');
  await expect(studioSelects.nth(1).locator('option:checked')).toContainText(channelName);
  await expect(studioSelects.nth(2).locator('option:checked')).toContainText(broadcastTitle);
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

  await page.getByRole('button', { name: 'Open creator chat' }).click();
  const chat = page.getByRole('dialog', { name: 'Creator live chat' });
  await expect(chat).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'chat');
  await chat.getByRole('button', { name: 'Close creator chat' }).click();

  await page.goto('/creator/recordings');
  await expect(page.getByRole('heading', { name: 'Recordings and replay' })).toBeVisible();
  await expect(
    page.getByText('No completed broadcast needs a recording job', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('No recording jobs yet', { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'recordings');

  await page.goto('/listen');
  await expect(page.getByRole('heading', { name: 'Live audio without the heavy video.' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'listener-discovery');
});
