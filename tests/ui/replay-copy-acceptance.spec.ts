import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const replaySourcePath = resolve(
  process.cwd(),
  'apps/web/src/features/listening/ReplayDiscoveryPage.tsx',
);

test('Replay discovery uses concise listener-facing copy', async () => {
  const source = await readFile(replaySourcePath, 'utf8');

  expect(source).toContain('Replay completed broadcasts.');
  expect(source).toContain('Choose a published recording and continue listening at your own pace.');
  expect(source).toContain('Checking for recordings you can listen to.');
  expect(source).toContain('No public replays yet');
  expect(source).toContain('Published recordings will appear here.');
  expect(source).toContain('Listen to this completed broadcast.');
});

test('Replay discovery does not expose storage or artifact terminology', async () => {
  const source = await readFile(replaySourcePath, 'utf8');

  expect(source).not.toContain('private storage');
  expect(source).not.toContain('short-lived listening link');
  expect(source).not.toContain('verified recording');
  expect(source).not.toContain('verified artifact');
});
