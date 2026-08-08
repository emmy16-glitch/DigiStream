import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const password = 'Playwright-creator-core-audit-123!';
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
  await page.getByLabel('Full name').fill('Creator Core Responsive Audit');
  await page.getByLabel('Email').fill(`creator-core-${suffix}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
}

async function createCreatorCoreState(page: Page, suffix: string) {
  const me = await apiJson(page, '/api/v1/auth/me');

  await apiJson(page, '/api/v1/organisations', 'POST', {
    name: `Secondary responsive workspace ${suffix}`,
    slug: `secondary-responsive-${suffix}`,
  });

  const primaryResponse = await apiJson(page, '/api/v1/organisations', 'POST', {
    name: `Primary responsive workspace ${suffix} with a deliberately long workspace name`,
    slug: `primary-responsive-${suffix}`,
  });
  const organisation = primaryResponse.organisation;

  const createdChannel = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels`,
    'POST',
    {
      name: `Responsive channel ${suffix} with a deliberately long channel name`,
      slug: `responsive-channel-${suffix}`,
      description: 'Creator core responsive matrix channel.',
      category: 'community',
      visibility: 'public',
    },
  );

  const pendingChannel = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels/${createdChannel.channel.id}`,
    'PATCH',
    { status: 'pending_review' },
  );
  const activeChannel = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels/${createdChannel.channel.id}`,
    'PATCH',
    { status: 'active' },
  );

  const broadcastResponse = await apiJson(
    page,
    `/api/v1/organisations/${organisation.id}/channels/${activeChannel.channel.id}/broadcasts`,
    'POST',
    {
      title: `Responsive draft broadcast ${suffix} with a deliberately long broadcast title`,
      slug: `responsive-draft-${suffix}`,
      description: 'Creator shell, Overview, Broadcasts and Studio responsive audit.',
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

async function auditCreatorShell(page: Page, viewport: (typeof viewports)[number]) {
  await expectNoPageOverflow(page);
  await expectNoInternalOverflow(page.locator('#ds-main-content'));

  const workspaceSelect = page.locator('.ds-workspace-select:visible');
  await expect(workspaceSelect).toHaveCount(1);
  await expectTouchTarget(workspaceSelect);

  const topbarButtons = page.locator('.ds-topbar-actions .ds-button:visible');
  for (let index = 0; index < await topbarButtons.count(); index += 1) {
    await expectTouchTarget(topbarButtons.nth(index));
  }

  if (viewport.width > 640) {
    const brand = page.getByRole('link', { name: 'Echoo creator home' });
    await expect(brand).toBeVisible();
    await expectTouchTarget(brand);
  } else {
    const mobileNavigationButtons = page.locator('.ds-creator-mobile-nav button:visible');
    expect(await mobileNavigationButtons.count()).toBeGreaterThan(0);
    for (let index = 0; index < await mobileNavigationButtons.count(); index += 1) {
      await expectTouchTarget(mobileNavigationButtons.nth(index));
    }
  }
}

test('creator shell, Overview, Broadcasts and Studio pass the exact responsive matrix', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop-chromium',
    'The exact six-viewport matrix runs once; Android projects retain their existing device-specific smoke coverage.',
  );

  const suffix = randomUUID().slice(0, 8);
  await registerCreator(page, suffix);
  const state = await createCreatorCoreState(page, suffix);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto('/creator/overview');
    const overview = page.locator('.echoo-overview-page');
    await expect(overview).toBeVisible();
    await auditCreatorShell(page, viewport);
    await expectNoInternalOverflow(overview);

    const overviewActions = overview.locator('button:visible');
    for (let index = 0; index < await overviewActions.count(); index += 1) {
      await expectTouchTarget(overviewActions.nth(index));
    }

    await page.goto('/creator/broadcasts');
    const broadcastsPage = page.locator('.echoo-broadcasts-page');
    await expect(broadcastsPage).toBeVisible();
    await auditCreatorShell(page, viewport);
    await expectNoInternalOverflow(broadcastsPage);

    const broadcastRow = page.locator('.broadcast-row').filter({ hasText: state.broadcastTitle });
    await expect(broadcastRow).toBeVisible();
    await expectNoInternalOverflow(broadcastRow);
    await expectTouchTarget(page.getByRole('button', { name: 'New broadcast', exact: true }));
    await expectTouchTarget(broadcastRow.getByRole('button', { name: 'Continue setup' }));

    const tabs = page.locator('.echoo-broadcast-tabs button:visible');
    for (let index = 0; index < await tabs.count(); index += 1) {
      await expectTouchTarget(tabs.nth(index));
    }

    await broadcastRow.getByRole('button', { name: 'Continue setup' }).click();
    const studio = page.getByRole('dialog', { name: 'Broadcast studio' });
    await expect(studio).toBeVisible();
    await expectNoPageOverflow(page);
    await expectNoInternalOverflow(studio);

    const studioBox = await studio.boundingBox();
    expect(studioBox).not.toBeNull();
    expect(studioBox!.x).toBeGreaterThanOrEqual(-1);
    expect(studioBox!.x + studioBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(studioBox!.y).toBeGreaterThanOrEqual(-1);
    expect(studioBox!.y + studioBox!.height).toBeLessThanOrEqual(viewport.height + 1);

    await expectTouchTarget(studio.locator('.studio-header > .ds-icon-button'));
    const studioSelects = studio.locator('.studio-field select:visible');
    for (let index = 0; index < await studioSelects.count(); index += 1) {
      await expectTouchTarget(studioSelects.nth(index));
    }
    await expectTouchTarget(studio.getByRole('button', { name: 'Join private studio' }));

    if (viewport.name === 'mobile-390' || viewport.name === 'short-landscape') {
      await testInfo.attach(`creator-core-${viewport.name}`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    }

    await page.goBack();
    await expect(studio).toHaveCount(0);
  }
});
