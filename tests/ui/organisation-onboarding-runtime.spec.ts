import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const password = 'Playwright-creator-password-123!';

async function openOrganisationSetup(page: Page) {
  const suffix = randomUUID().slice(0, 8);
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Display name').fill('Organisation Recovery Creator');
  await page.getByLabel('Email').fill(`organisation-recovery-${suffix}@example.test`);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account with email' }).click();

  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await page.getByRole('button', { name: 'Broadcast audio' }).click();
  await expect(page.getByRole('heading', { name: 'Set up your creator workspace' })).toBeVisible();
}

test('organisation slug conflicts stay editable across stale replies, repeated submits and refresh', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium');
  await openOrganisationSetup(page);

  let postCount = 0;
  await page.route('**/api/v1/organisations', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }

    postCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 180));
    await route.fulfill({
      contentType: 'application/json',
      status: 409,
      body: JSON.stringify({
        error: {
          code: 'ORGANISATION_SLUG_TAKEN',
          message: 'That organisation slug is already in use.',
          requestId: `organisation-conflict-${postCount}`,
        },
      }),
    });
  });

  const name = page.getByLabel('Organisation name');
  const slug = page.getByLabel('Public slug');
  const form = page.locator('.workspace-onboarding form');

  await name.fill('Recovery Church');
  await slug.fill('already-used');

  // Two submissions in the same event turn exercise the synchronous ref guard,
  // while the delayed conflict leaves time for the Creator to correct the slug.
  await form.evaluate((element) => {
    const formElement = element as HTMLFormElement;
    formElement.requestSubmit();
    formElement.requestSubmit();
  });
  await slug.fill('corrected-before-response');

  await expect.poll(() => postCount).toBe(1);
  await expect(name).toHaveValue('Recovery Church');
  await expect(slug).toHaveValue('corrected-before-response');
  await expect(page.getByText('That web address is already in use. Choose another one.')).toHaveCount(0);

  // A conflict for the current value is field-level, preserves the name and
  // returns focus to the slug instead of replacing the form with a Retry card.
  await form.evaluate((element) => (element as HTMLFormElement).requestSubmit());
  await expect.poll(() => postCount).toBe(2);
  await expect(page.getByText('That web address is already in use. Choose another one.')).toBeVisible();
  await expect(name).toHaveValue('Recovery Church');
  await expect(slug).toHaveValue('corrected-before-response');
  await expect(slug).toBeFocused();
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);

  // A refresh reloads authoritative organisation state. Unsaved form input is
  // not claimed as durable and no stale conflict survives the new page load.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await page.getByRole('button', { name: 'Broadcast audio' }).click();
  await expect(page.getByRole('heading', { name: 'Set up your creator workspace' })).toBeVisible();
  await expect(page.getByLabel('Organisation name')).toHaveValue('');
  await expect(page.getByLabel('Public slug')).toHaveValue('');
  await expect(page.getByText('That web address is already in use. Choose another one.')).toHaveCount(0);
});
