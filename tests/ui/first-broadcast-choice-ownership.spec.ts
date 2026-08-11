import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const broadcastsPagePath = resolve(
  process.cwd(),
  'apps/web/src/features/broadcasting/CreatorBroadcastsPage.tsx',
);

test('first broadcast setup exposes three mutually exclusive choices', async () => {
  const source = await readFile(broadcastsPagePath, 'utf8');

  expect(source).toContain("type FirstBroadcastChoice = 'go-live' | 'schedule' | 'finish-later' | null;");
  expect(source).toContain('aria-label="First broadcast choices" role="group"');
  expect(source).toContain("aria-pressed={firstBroadcastChoice === 'go-live'}");
  expect(source).toContain("aria-pressed={firstBroadcastChoice === 'schedule'}");
  expect(source).toContain("aria-pressed={firstBroadcastChoice === 'finish-later'}");
  expect(source).toContain('Start now');
  expect(source).toContain('Schedule for later');
  expect(source).toContain('Finish setup later');
});

test('first broadcast setup only shows fields relevant to the selected mode', async () => {
  const source = await readFile(broadcastsPagePath, 'utf8');

  expect(source).toContain("firstBroadcastChoice && firstBroadcastChoice !== 'finish-later'");
  expect(source).toContain("firstBroadcastChoice === 'schedule'");
  expect(source).toContain("required={firstBroadcastChoice === 'schedule'}");
  expect(source).toContain("setBroadcastForm((current) => ({ ...current, scheduledStartAt: '' }))");
  expect(source).toContain('setBroadcastForm(emptyBroadcastForm);');
});

test('first broadcast setup has one contextual final primary action', async () => {
  const source = await readFile(broadcastsPagePath, 'utf8');

  expect(source).toContain("firstBroadcastSetup && firstBroadcastChoice === 'finish-later'");
  expect(source).toContain('<Button icon="recording" onClick={finishFirstBroadcastLater} type="button" variant="primary">');
  expect(source).toContain("? 'Create broadcast and open Studio'");
  expect(source).toContain("? 'Schedule broadcast'");
  expect(source).toContain("? 'Choose how to continue'");
  expect(source).toContain('disabled={firstBroadcastSetup && !firstBroadcastChoice}');
});

test('finish-later never creates a broadcast', async () => {
  const source = await readFile(broadcastsPagePath, 'utf8');

  const finishGuard = source.indexOf("if (firstBroadcastSetup && firstBroadcastChoice === 'finish-later')");
  const createRequest = source.indexOf("apiRequest<BroadcastResponse>(");
  expect(finishGuard).toBeGreaterThan(-1);
  expect(createRequest).toBeGreaterThan(finishGuard);
  expect(source.slice(finishGuard, createRequest)).toContain('finishFirstBroadcastLater();');
  expect(source.slice(finishGuard, createRequest)).toContain('return;');
});
