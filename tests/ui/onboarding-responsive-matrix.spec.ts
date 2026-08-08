import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const password = 'Playwright-onboarding-audit-password-123!';
const viewports = [
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'desktop-compact', width: 1280, height: 720 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'short-landscape', width: 844, height: 390 },
] as const;

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

async function auditStep(
  page: Page,
  surface: Locator,
  controls: Locator[],
  testInfo: TestInfo,
  screenshotPrefix: string,
) {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(surface).toBeVisible();
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(surface);

    for (const control of controls) {
      await expect(control).toBeVisible();
      await expectTouchTarget(control);
    }

    if (viewport.name === 'mobile-390' || viewport.name === 'short-landscape') {
      await testInfo.attach(`${screenshotPrefix}-${viewport.name}`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    }
  }
}

test('creator onboarding passes the exact responsive matrix with focus continuity', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The exact six-viewport matrix runs once; Android projects retain their existing device-specific smoke coverage.',
  );

  const suffix = randomUUID().slice(0, 10);
  const organisationName = `Responsive audit organisation ${suffix} with a deliberately long creator workspace name`;
  const channelName = `Responsive audit channel ${suffix} with a deliberately long listener-facing channel name`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Continue with Email' }).click();
  await page.getByLabel('Full name').fill('Onboarding Responsive Audit');
  await page.getByLabel('Email').fill(`onboarding-responsive-${suffix}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await page.getByRole('button', { name: 'Broadcast audio' }).click();

  const organisationHeading = page.getByRole('heading', { name: 'Set up your creator workspace' });
  await expect(organisationHeading).toBeVisible();
  await expect(organisationHeading).toBeFocused();
  await expect(
    page.getByText('Used in public Echoo links. Lowercase letters, numbers and hyphens only.'),
  ).toBeVisible();

  const organisationSurface = page.locator('.workspace-onboarding').filter({
    has: organisationHeading,
  });
  const organisationNameInput = page.getByLabel('Organisation name');
  const organisationSlugInput = page.getByLabel('Public slug');
  const continueToChannel = page.getByRole('button', { name: 'Continue to channel setup' });

  await organisationNameInput.fill(organisationName);
  await organisationSlugInput.fill(`responsive-org-${suffix}`);
  await auditStep(
    page,
    organisationSurface,
    [organisationNameInput, organisationSlugInput, continueToChannel],
    testInfo,
    'onboarding-step-1',
  );

  await continueToChannel.click();
  await expect(page).toHaveURL(/\/creator\/broadcasts$/);

  const channelHeading = page.getByRole('heading', { name: 'Create your first channel' });
  const channelNameInput = page.getByLabel('Channel name');
  await expect.poll(async () => {
    const loading = await page.getByText('Loading channels', { exact: true }).isVisible();
    return !loading && await channelHeading.isVisible() && await channelNameInput.isVisible();
  }).toBe(true);
  await expect(channelHeading).toBeFocused();

  const channelSurface = page.locator('section[aria-labelledby="create-channel-title"]');
  const channelForm = channelSurface.locator('form.creator-form-grid');
  const channelSlugInput = channelForm.getByLabel('Public slug');
  const categoryInput = channelForm.getByLabel('Category');
  const visibilitySelect = channelForm.getByLabel('Visibility');
  const channelDescription = channelForm.getByLabel('Description');
  const createChannel = channelForm.getByRole('button', {
    name: 'Create and activate channel',
    exact: true,
  });

  await channelNameInput.fill(channelName);
  await channelSlugInput.fill(`responsive-channel-${suffix}`);
  await categoryInput.fill('community');
  await visibilitySelect.selectOption('public');
  await channelDescription.fill(
    'A deliberately long responsive-audit description that verifies onboarding content remains readable and contained across narrow and short viewports.',
  );

  await auditStep(
    page,
    channelSurface,
    [
      channelNameInput,
      channelSlugInput,
      categoryInput,
      visibilitySelect,
      channelDescription,
      createChannel,
    ],
    testInfo,
    'onboarding-step-2',
  );
  await expectNoInternalOverflow(channelForm);

  await createChannel.click();

  const broadcastHeading = page.getByRole('heading', { name: 'How would you like to start?' });
  await expect(broadcastHeading).toBeVisible();
  await expect(broadcastHeading).toBeFocused();
  await expect(page.getByText('Step 3 of 3', { exact: true })).toBeVisible();

  const broadcastSurface = page.locator('section[aria-labelledby="create-broadcast-title"]');
  const broadcastChoices = page.getByRole('group', { name: 'First broadcast choices' });
  const startNow = broadcastChoices.getByRole('button', { name: 'Start now', exact: true });
  const scheduleLater = broadcastChoices.getByRole('button', {
    name: 'Schedule for later',
    exact: true,
  });
  const finishLater = broadcastChoices.getByRole('button', {
    name: 'Finish setup later',
    exact: true,
  });

  await auditStep(
    page,
    broadcastSurface,
    [startNow, scheduleLater, finishLater],
    testInfo,
    'onboarding-step-3',
  );
  await expectNoInternalOverflow(broadcastChoices);

  await scheduleLater.click();
  const broadcastForm = broadcastSurface.locator('form.creator-form-grid');
  const broadcastTitle = broadcastForm.getByLabel('Broadcast title');
  const broadcastSlug = broadcastForm.getByLabel('Public slug');
  const scheduleStart = broadcastForm.getByLabel('Schedule start');
  const broadcastDescription = broadcastForm.getByLabel('Description');
  const scheduleBroadcast = broadcastForm.getByRole('button', {
    name: 'Schedule broadcast',
    exact: true,
  });

  await broadcastTitle.fill(`Responsive audit broadcast ${suffix}`);
  await broadcastSlug.fill(`responsive-broadcast-${suffix}`);
  await broadcastDescription.fill('Responsive scheduling form audit without creating the broadcast.');

  await auditStep(
    page,
    broadcastSurface,
    [broadcastTitle, broadcastSlug, scheduleStart, broadcastDescription, scheduleBroadcast],
    testInfo,
    'onboarding-step-3-schedule',
  );
  await expectNoInternalOverflow(broadcastForm);
});
