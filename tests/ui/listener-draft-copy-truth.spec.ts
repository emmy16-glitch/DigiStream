import { expect, test } from '@playwright/test';

const routePath = '/listen/draft-org/draft-channel/draft-event';
const metadataPath = '/api/v1/broadcasts/draft-org/draft-channel/draft-event';

test('draft listener page never implies active audio delivery when description is absent', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 401,
      body: JSON.stringify({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
          requestId: 'playwright-draft-copy',
        },
      }),
    });
  });

  await page.route(`**${metadataPath}*`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== metadataPath) {
      await route.continue();
      return;
    }

    await route.fulfill({
      contentType: 'application/json',
      status: 200,
      body: JSON.stringify({
        broadcast: {
          id: 'draft-broadcast-1',
          slug: 'draft-event',
          title: 'Draft programme',
          description: null,
          status: 'draft',
          scheduledStartAt: null,
          liveStartedAt: null,
          endedAt: null,
          organisation: {
            id: 'draft-organisation-1',
            name: 'Draft Organisation',
            slug: 'draft-org',
          },
          channel: {
            id: 'draft-channel-1',
            name: 'Draft Channel',
            slug: 'draft-channel',
            category: 'community',
          },
        },
      }),
    });
  });

  await page.goto(routePath);

  await expect(page.getByRole('heading', { name: 'Draft programme' })).toBeVisible();
  await expect(page.getByText('This broadcast is still being prepared.')).toBeVisible();
  await expect(page.getByText('This broadcast is not available to listeners yet.')).toBeVisible();
  await expect(page.getByText('Live audio delivered through DigiStream.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Listen live' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mute' })).toHaveCount(0);
  await expect(page.getByLabel('Volume')).toHaveCount(0);
});
