import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const password = 'Playwright-entry-audit-password-123!';
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

async function auditPublicEntrySurfaces(page: Page, testInfo: TestInfo) {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Live audio\./ })).toBeVisible();
    await expect(page.getByText(/backstage/i)).toHaveCount(0);
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(page.locator('.landing-hero'));
    await expectTouchTarget(page.getByRole('link', { name: 'Echoo home' }));
    await expectTouchTarget(page.getByRole('link', { name: 'Start a broadcast' }));
    await expectTouchTarget(page.getByRole('link', { name: 'Listen now' }));

    if (viewport.width > 820) {
      await expectTouchTarget(page.getByRole('link', { name: 'Login' }));
    }

    if (viewport.name === 'short-landscape') {
      const hero = page.locator('.landing-hero');
      const visual = page.locator('.landing-hero-visual');
      const [heroBox, visualBox] = await Promise.all([hero.boundingBox(), visual.boundingBox()]);
      expect(heroBox).not.toBeNull();
      expect(visualBox).not.toBeNull();
      expect(visualBox!.x + visualBox!.width).toBeLessThanOrEqual(
        heroBox!.x + heroBox!.width + 1,
      );
    }

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    const continueEmail = page.getByRole('button', { name: 'Continue with Email' });
    await expect(continueEmail).toBeEnabled();
    await expectTouchTarget(continueEmail);
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(page.locator('.auth-mobile-card'));

    await continueEmail.click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expectTouchTarget(page.getByRole('link', { name: 'Echoo home' }));
    await expectTouchTarget(page.getByRole('button', { name: 'Sign in', exact: true }));
    await expectTouchTarget(page.getByRole('button', { name: 'Create account', exact: true }));
    await expectTouchTarget(page.getByRole('button', { name: 'Show password' }).first());
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(page.locator('.auth-mobile-card'));

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expectTouchTarget(page.getByRole('link', { name: 'Echoo home' }));
    await expectTouchTarget(page.getByRole('button', { name: 'Login', exact: true }));
    await expectTouchTarget(page.getByRole('button', { name: 'Show password' }));
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(page.locator('.auth-mobile-card'));

    if (viewport.name === 'mobile-390' || viewport.name === 'short-landscape') {
      await testInfo.attach(`entry-${viewport.name}`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    }
  }
}

test('landing and authentication pass the exact entry responsive matrix', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The exact six-viewport matrix runs once; Android projects retain their existing device-specific smoke coverage.',
  );

  await auditPublicEntrySurfaces(page, testInfo);
});

test('creator intent remains reachable and unclipped across the exact matrix', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The exact six-viewport matrix runs once; Android projects retain their existing device-specific smoke coverage.',
  );

  const suffix = randomUUID().slice(0, 10);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Continue with Email' }).click();
  await page.getByLabel('Full name').fill('Entry Audit Creator');
  await page.getByLabel('Email').fill(`entry-audit-${suffix}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const intent = page.locator('.workspace-onboarding');
    await expect(intent).toBeVisible();
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(intent);
    await expectTouchTarget(page.getByRole('button', { name: 'Broadcast audio' }));
    await expectTouchTarget(page.getByRole('link', { name: 'Listen to broadcasts' }));
  }
});
