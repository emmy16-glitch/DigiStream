import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const broadcastsPagePath = resolve(
  process.cwd(),
  'apps/web/src/features/broadcasting/CreatorBroadcastsPage.tsx',
);

test('first-channel form hides the competing empty-state create action', async () => {
  const source = await readFile(broadcastsPagePath, 'utf8');

  expect(source).toContain('channels.length === 0 && !showChannelForm');
  expect(source).toContain('actionLabel="Create channel"');
  expect(source).toContain('title="Create your first channel"');
  expect(source).toContain('aria-labelledby="create-channel-title"');
  expect(source).toContain("? 'Create and activate channel'");
});

test('channel creation keeps existing role-based activation ownership', async () => {
  const source = await readFile(broadcastsPagePath, 'utf8');

  expect(source).toContain("organisation.role === 'owner' || organisation.role === 'admin'");
  expect(source).toContain('if (canApproveChannel)');
  expect(source).toContain("body: jsonBody({ status: 'pending_review' })");
  expect(source).toContain("body: jsonBody({ status: 'active' })");
  expect(source).toContain('An owner or administrator must activate this channel before scheduling or going live.');
});
