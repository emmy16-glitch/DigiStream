import { randomUUID } from 'node:crypto';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const password = 'Playwright-creator-password-123!';

async function createCreatorAtChannelSetup(page: Page, testInfo: TestInfo) {
  const suffix = `${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${randomUUID().slice(0, 8)}`;

  await page.goto('/login');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Display name').fill('Android Acceptance Creator');
  await page.getByLabel('Email').fill(`android-${suffix}@example.test`);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account with email' }).click();

  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await page.getByRole('button', { name: 'Broadcast audio' }).click();
  await expect(page.getByRole('heading', { name: 'Set up your creator workspace' })).toBeVisible();

  await page.getByLabel('Organisation name').fill(`Android Acceptance ${suffix}`);
  await page.getByLabel('Public slug').fill(`android-${suffix}`);
  await page.getByRole('button', { name: 'Continue to channel setup' }).click();

  await expect(page).toHaveURL(/\/creator\/broadcasts$/);
  await expect(page.getByRole('heading', { name: 'Create your first channel' })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function expectVisibleAboveCreatorChrome(page: Page, locator: ReturnType<Page['locator']>) {
  const nav = page.locator('.ds-creator-mobile-nav');
  await locator.scrollIntoViewIfNeeded();

  const [navVisible, navBox, targetBox, viewportHeight] = await Promise.all([
    nav.isVisible(),
    nav.boundingBox(),
    locator.boundingBox(),
    page.evaluate(() => window.innerHeight),
  ]);

  expect(targetBox).not.toBeNull();
  const lowerBoundary = navVisible && navBox ? navBox.y : viewportHeight;
  expect(targetBox!.y + targetBox!.height).toBeLessThanOrEqual(lowerBoundary + 1);
}

test('Android portrait and short landscape keep account, forms and creator chrome usable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'android-chrome');
  await createCreatorAtChannelSetup(page, testInfo);

  const accountArea = page.getByLabel('Signed-in account actions');
  const signOut = page.getByRole('button', { name: 'Sign out' });
  const channelName = page.getByLabel('Channel name');
  const continueHeading = page.getByRole('heading', { name: 'Create your first channel' });

  await expect(accountArea).toContainText('Account');
  await expect(accountArea).toContainText('Signed in as');
  await expect(signOut).toBeVisible();
  const portraitSignOutBox = await signOut.boundingBox();
  expect(portraitSignOutBox).not.toBeNull();
  expect(portraitSignOutBox!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('.ds-creator-mobile-nav')).toBeVisible();
  await expectVisibleAboveCreatorChrome(page, channelName);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(continueHeading).toBeVisible();
  await expect(channelName).toBeVisible();
  await expect(signOut).toBeVisible();
  await expectVisibleAboveCreatorChrome(page, channelName);
  await expectNoHorizontalOverflow(page);

  await testInfo.attach('issue-84-short-landscape', {
    body: await page.screenshot({ animations: 'disabled', fullPage: true }),
    contentType: 'image/png',
  });
});

test('Android desktop-site and 200% zoom retain obvious account access and readable creator content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'android-desktop-site');
  await createCreatorAtChannelSetup(page, testInfo);

  const accountArea = page.getByLabel('Signed-in account actions');
  const signOut = page.getByRole('button', { name: 'Sign out' });
  await expect(accountArea).toContainText('Account');
  await expect(accountArea).toContainText('Signed in as');
  await expect(signOut).toBeVisible();

  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });

  await expect(page.getByRole('heading', { name: 'Create your first channel' })).toBeVisible();
  await page.getByLabel('Channel name').scrollIntoViewIfNeeded();
  await expect(page.getByLabel('Channel name')).toBeVisible();
  await expect(signOut).toBeVisible();

  const signOutBox = await signOut.boundingBox();
  expect(signOutBox).not.toBeNull();
  expect(signOutBox!.height).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);

  await testInfo.attach('issue-84-desktop-site-200-percent', {
    body: await page.screenshot({ animations: 'disabled', fullPage: true }),
    contentType: 'image/png',
  });
});
