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
  await page.goto('/login');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue with Email', exact: true }).click();
  await page.getByLabel('Full name').fill('Playwright Creator');
  await page.getByLabel('Email').fill(`playwright-${suffix}@example.test`);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Listen to broadcasts' })).toBeVisible();
  await page.getByRole('button', { name: 'Broadcast audio' }).click();

  await expect(page.getByRole('heading', { name: 'Set up your creator workspace' })).toBeVisible();
  await expect(page.getByText('Step 1 of 3', { exact: true })).toBeVisible();
  await page.getByLabel('Organisation name').fill(`Playwright Organisation ${suffix}`);
  await page.getByLabel('Public slug').fill(`playwright-${suffix}`);
  await page.getByRole('button', { name: 'Continue to channel setup' }).click();

  await expect(page).toHaveURL(/\/creator\/broadcasts$/);
  await expect(page.getByRole('heading', { name: 'Broadcasts', exact: true }).last()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create your first channel' })).toBeVisible();
  await expect(page.getByText('Step 2 of 3', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Channel name')).toBeVisible();
}

test('creator workflow stays usable at desktop and Android sizes', async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${randomUUID().slice(0, 8)}`;
  const channelName = `Channel ${suffix}`;
  const broadcastTitle = `Broadcast ${suffix}`;

  await createCreatorWorkspace(page, suffix);
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'channel-onboarding');

  await expect(page.getByRole('heading', { name: 'Broadcasts', exact: true }).last()).toBeVisible();

  const channelNameInput = page.getByLabel('Channel name');
  await expect.poll(async () => {
    const loading = await page.getByText('Loading channels', { exact: true }).isVisible();
    return !loading && await channelNameInput.isVisible();
  }).toBe(true);
  await expect(
    page.locator('.creator-broadcasts-intro-actions').getByRole('button', { name: 'Create channel', exact: true }),
  ).toBeHidden();

  const channelForm = page.locator('form.creator-form-grid').filter({ has: channelNameInput });
  await channelNameInput.fill(channelName);
  await channelForm.getByLabel('Public slug').fill(`channel-${suffix}`);
  await channelForm.getByLabel('Category').fill('community');
  await channelForm.getByLabel('Visibility').selectOption('public');
  await channelForm.getByLabel('Description').fill('Responsive Playwright channel');
  await channelForm.getByRole('button', { name: 'Create and activate channel', exact: true }).click();

  const channelStrip = page.locator('.channel-strip');
  await expect(channelStrip).toContainText(channelName);
  await expect(channelStrip).toContainText('Active');
  await expect(channelStrip.getByRole('button', { name: 'Activate channel' })).toHaveCount(0);
  await expect(channelStrip.getByRole('button', { name: 'Try activation again' })).toHaveCount(0);

  await expect(page.getByRole('heading', { name: 'How would you like to start?' })).toBeVisible();
  await expect(page.getByText('Step 3 of 3', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start now', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Schedule for later', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finish setup later', exact: true })).toBeVisible();

  const broadcastSection = page.locator('section[aria-labelledby="create-broadcast-title"]');
  const broadcastForm = broadcastSection.locator('form.creator-form-grid');
  const initialSubmit = broadcastForm.locator('button[type="submit"]');
  await expect(page.getByLabel('Broadcast title')).toHaveCount(0);
  await expect(initialSubmit).toBeDisabled();
  await expect(initialSubmit).toHaveText('Choose how to continue');

  await page.getByRole('button', { name: 'Start now', exact: true }).click();
  const broadcastTitleInput = page.getByLabel('Broadcast title');
  await expect(broadcastTitleInput).toBeVisible();
  const createAndOpenStudio = broadcastForm.getByRole('button', {
    name: 'Create broadcast and open Studio',
  });
  await expect(createAndOpenStudio).toBeEnabled();
  await expect(broadcastForm.getByLabel('Schedule start')).toHaveCount(0);

  await broadcastTitleInput.fill(broadcastTitle);
  await broadcastForm.getByLabel('Public slug').fill(`broadcast-${suffix}`);
  await broadcastForm.getByLabel('Description').fill('Responsive Playwright broadcast');
  await createAndOpenStudio.click();

  const studio = page.getByRole('dialog', { name: 'Broadcast studio' });
  await expect(studio).toBeVisible();
  const studioSelects = studio.locator('.studio-field select');
  await expect(studioSelects.nth(1).locator('option:checked')).toContainText(channelName);
  await expect(studioSelects.nth(2).locator('option:checked')).toContainText(broadcastTitle);
  await expect(studio.getByRole('button', { name: 'Join private studio' })).toBeDisabled();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'studio-after-first-broadcast');

  const studioUrl = page.url();
  await page.goBack();
  await expect(studio).toHaveCount(0);
  expect(page.url()).toBe(studioUrl);

  const broadcastRow = page.locator('.broadcast-row').filter({ hasText: broadcastTitle });
  await expect(broadcastRow).toBeVisible();
  await expect(page.getByRole('button', { name: 'New broadcast', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (testInfo.project.name === 'android-desktop-site') {
    const headingFontSize = await page
      .getByRole('heading', { name: 'Broadcasts', exact: true })
      .last()
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(headingFontSize).toBeGreaterThanOrEqual(20);
    const studioButton = broadcastRow.getByRole('button', { name: 'Continue setup' });
    const studioButtonBox = await studioButton.boundingBox();
    expect(studioButtonBox).not.toBeNull();
    expect(studioButtonBox!.height).toBeGreaterThanOrEqual(44);
  }
  await attachViewport(page, testInfo, 'broadcasts');

  await broadcastRow.getByRole('button', { name: 'Continue setup' }).click();
  await expect(studio).toBeVisible();
  await expect(studioSelects.nth(1).locator('option:checked')).toContainText(channelName);
  await expect(studioSelects.nth(2).locator('option:checked')).toContainText(broadcastTitle);
  await page.goBack();
  await expect(studio).toHaveCount(0);

  await page.goto('/creator/studio-lobby');
  await expect(page.getByRole('heading', { name: 'Studio Lobby and call-ins' })).toBeVisible();
  const lobbyNavigationLabel = testInfo.project.name.includes('android') ? 'Lobby' : 'Studio Lobby';
  await expect(page.getByRole('button', { name: lobbyNavigationLabel, exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'People', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Open Studio Lobby' }).click();
  const backstage = page.getByRole('dialog', { name: 'Studio Lobby' });
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
  await attachViewport(page, testInfo, 'studio-lobby');
  await backstage.getByRole('button', { name: 'Close Studio Lobby' }).click();

  await page.getByRole('button', { name: 'Open creator chat' }).click();
  await expect(page).toHaveURL(/\/creator\/chat$/);
  await expect(page.getByRole('heading', { name: 'Chat', exact: true }).last()).toBeVisible();
  await expect(page.getByText('Real broadcast messages only', { exact: true })).toBeVisible();
  await expect(page.getByText('No chat-capable broadcast selected', { exact: true })).toBeVisible();
  await expect(page.getByText('No placeholder messages or audience counts are shown.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Broadcast chat', exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'chat');

  await page.goto('/creator/recordings');
  await expect(page.getByRole('heading', { name: 'Recordings', exact: true }).last()).toBeVisible();
  await expect(page.getByText('Your completed broadcasts.', { exact: true })).toBeVisible();
  await expect(page.getByText('No recordings yet', { exact: true })).toBeVisible();
  await expect(page.getByText('Echoo does not invent replay data.', { exact: false })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'recordings');

  await page.goto('/listen');
  await expect(page.getByRole('heading', { name: 'Discover', exact: true })).toBeVisible();
  await expect(page.getByText('Find live and upcoming broadcasts.', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Search broadcasts, creators…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Live', exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'listener-discovery');
});
