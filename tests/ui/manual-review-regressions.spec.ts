import { expect, test } from '@playwright/test';

const broadcast = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Manual review broadcast',
  slug: 'manual-review-broadcast',
  description: 'A scheduled broadcast used for responsive regression coverage.',
  status: 'scheduled',
  scheduledStartAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  liveStartedAt: null,
  endedAt: null,
  organisation: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Manual Review Organisation',
    slug: 'manual-review-org',
  },
  channel: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Manual Review Channel',
    slug: 'manual-review-channel',
    category: 'community',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test('scheduled listener page keeps lifecycle honest and fixed creator CTA clear', async ({ page, context }) => {
  await page.route('**/api/v1/broadcasts/manual-review-org/manual-review-channel/manual-review-broadcast', async (route) => {
    await route.fulfill({ json: { broadcast } });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: '44444444-4444-4444-8444-444444444444',
          email: 'creator@example.test',
          displayName: 'Manual Review Creator',
        },
      },
    });
  });
  await page.route('**/api/v1/organisations', async (route) => {
    await route.fulfill({
      json: {
        organisations: [
          {
            id: broadcast.organisation.id,
            name: broadcast.organisation.name,
            slug: broadcast.organisation.slug,
            role: 'owner',
          },
        ],
      },
    });
  });

  await page.goto('/listen/manual-review-org/manual-review-channel/manual-review-broadcast');
  await expect(page.getByRole('heading', { name: broadcast.title })).toBeVisible();
  await expect(page.getByText('Upcoming', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Starts in /).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage broadcast' })).toBeVisible();

  const pseudoContent = await page.locator('.listener-orb').evaluate((element) =>
    getComputedStyle(element, '::after').content,
  );
  expect(['none', 'normal', '""']).toContain(pseudoContent);

  await context.setOffline(true);
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('Upcoming', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Connection restored\. Tap Listen live/)).toHaveCount(0);

  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'instant',
    }),
  );
  await page.waitForFunction(() =>
    Math.abs(
      window.scrollY + window.innerHeight - document.documentElement.scrollHeight,
    ) <= 4,
  );
  const footerAndAction = await page.evaluate(() => {
    const action = document.querySelector<HTMLElement>('.listener-call-in-role-action');
    const footer = document.querySelector<HTMLElement>('.ds-listener-footer');
    if (!action || !footer) return null;
    const actionRect = action.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    return {
      actionTop: actionRect.top,
      footerBottom: footerRect.bottom,
    };
  });
  expect(footerAndAction).not.toBeNull();
  expect(footerAndAction!.footerBottom).toBeLessThanOrEqual(
    footerAndAction!.actionTop - 4,
  );
});
