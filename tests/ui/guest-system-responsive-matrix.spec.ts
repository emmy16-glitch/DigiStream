import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const viewports = [
  { name: 'desktop-large', width: 1440, height: 900 },
  { name: 'desktop-compact', width: 1280, height: 720 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'short-landscape', width: 844, height: 390 },
] as const;

const guestToken = 'uiq-007-slice-6-responsive-guest-token-0001';

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

async function expectContained(
  locator: Locator,
  viewport: (typeof viewports)[number],
) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectSystemState(
  page: Page,
  viewport: (typeof viewports)[number],
  path: string,
  heading: string,
  action: string,
) {
  await page.goto(path);
  const systemPage = page.locator('.echoo-system-page');
  const card = page.locator('.echoo-system-card');
  const actionControl = page.getByRole('button', { name: action });

  await expect(systemPage).toBeVisible();
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  await expect(actionControl).toBeVisible();
  await expectNoPageOverflow(page);
  await expectNoInternalOverflow(card);
  await expectTouchTarget(actionControl);
  await expectContained(card, viewport);
  await expectContained(actionControl, viewport);
}

test('Guest Join and system states pass the exact responsive matrix', async ({ page }, testInfo: TestInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The exact six-viewport matrix runs once; Android projects retain their device-specific coverage.',
  );

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto(`/guest/${guestToken}`);
    const guestPage = page.locator('.guest-page');
    const guestShell = page.locator('.guest-shell');
    const guestBrand = page.getByRole('link', { name: 'Echoo home' });
    const displayName = page.getByLabel('Display name');
    const acceptInvitation = page.getByRole('button', { name: 'Accept invitation' });

    await expect(guestPage).toBeVisible();
    await expect(page.getByRole('heading', { name: 'You’re invited to join a live conversation.' })).toBeVisible();
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(guestShell);
    await expectTouchTarget(guestBrand);
    await expectTouchTarget(displayName);
    await expectTouchTarget(acceptInvitation);

    await displayName.fill('A deliberately long guest display name that remains contained across every viewport');
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(guestShell);

    await expectSystemState(
      page,
      viewport,
      '/this-route-does-not-exist',
      'Not Found',
      'Go back',
    );

    await expectSystemState(
      page,
      viewport,
      '/login?reason=session-expired',
      'Session Expired',
      'Log in again',
    );

    if (viewport.name === 'mobile-390' || viewport.name === 'short-landscape') {
      await testInfo.attach(`guest-system-slice6-${viewport.name}`, {
        body: await page.screenshot({ animations: 'disabled', fullPage: true }),
        contentType: 'image/png',
      });
    }
  }
});
