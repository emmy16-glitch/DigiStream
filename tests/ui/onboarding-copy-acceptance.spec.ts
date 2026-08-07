import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const appPath = resolve(process.cwd(), 'apps/web/src/App.tsx');
const broadcastsPath = resolve(
  process.cwd(),
  'apps/web/src/features/broadcasting/CreatorBroadcastsPage.tsx',
);
const overviewPath = resolve(
  process.cwd(),
  'apps/web/src/features/onboarding/CreatorOverviewPage.tsx',
);

async function source(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

test('creator intent and organisation setup use one short decision sentence', async () => {
  const app = await source(appPath);

  expect(app).toContain('Choose whether you want to listen or create a broadcast.');
  expect(app).toContain('Create your organisation to continue to channel setup.');
  expect(app).toContain('Continue to channel setup');

  expect(app).not.toContain(
    'Listen without creating a workspace, or continue into the existing creator setup to broadcast audio.',
  );
  expect(app).not.toContain(
    'Your organisation owns its channels, broadcasts, guests and team access. Channel setup comes next.',
  );
});

test('first-channel setup keeps hierarchy out of primary onboarding copy', async () => {
  const broadcasts = await source(broadcastsPath);

  expect(broadcasts).toContain('Create your first channel');
  expect(broadcasts).toContain('Choose your channel details and who can find it.');
  expect(broadcasts).toContain('Create and activate channel');
  expect(broadcasts).not.toContain('Organisation → Channel → Broadcast');
  expect(broadcasts).not.toContain(
    'Your organisation contains channels, and each channel contains broadcasts.',
  );
});

test('first-broadcast decision copy names only the three real choices', async () => {
  const broadcasts = await source(broadcastsPath);

  expect(broadcasts).toContain('How would you like to start?');
  expect(broadcasts).toContain(
    'Choose whether to start now, schedule for later or finish setup later.',
  );
  expect(broadcasts).toContain('Start now');
  expect(broadcasts).toContain('Schedule for later');
  expect(broadcasts).toContain('Finish setup later');
  expect(broadcasts).not.toContain('Choose what happens next for ${selectedChannel.name}.');
});

test('returning creator overview stays ordinary-language and action-led', async () => {
  const app = await source(appPath);
  const overview = await source(overviewPath);

  expect(app).toContain('<CreatorOverviewPage');
  expect(overview).toContain('Here’s what’s happening with your broadcasts.');
  expect(overview).toContain("case 'create_channel':");
  expect(overview).toContain("label: 'Create your first channel'");
  expect(overview).toContain("case 'create_broadcast':");
  expect(overview).toContain("label: 'Create broadcast'");
  expect(overview).toContain("case 'prepare_broadcast':");
  expect(overview).toContain("label: 'Prepare broadcast'");
  expect(overview).not.toContain('connected broadcasts workspace');
  expect(overview).not.toContain('manage listeners from DigiStream');
  expect(overview).not.toContain('Version 0');
});