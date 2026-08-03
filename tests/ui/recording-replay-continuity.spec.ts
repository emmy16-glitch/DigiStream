import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const recordingsSource = readFileSync(
  resolve(
    process.cwd(),
    'apps/web/src/features/recordings/CreatorRecordingsPage.tsx',
  ),
  'utf8',
);

test('processing recordings refresh from authoritative API state', () => {
  expect(recordingsSource).toContain('PROCESSING_RECORDING_STATUSES');
  expect(recordingsSource).toContain('RECORDING_REFRESH_INTERVAL_MS = 15_000');
  expect(recordingsSource).toContain("document.visibilityState === 'visible'");
  expect(recordingsSource).toContain("document.addEventListener('visibilitychange'");
  expect(recordingsSource).toContain('loadWorkspace({ background: true })');
});

test('background recovery cannot overwrite newer state or fabricate failure', () => {
  expect(recordingsSource).toContain('loadSequenceRef.current + 1');
  expect(recordingsSource).toContain('sequence !== loadSequenceRef.current');
  expect(recordingsSource).toContain('if (!background) setError(readableError(requestError))');
  expect(recordingsSource).toContain('return () => {\n      loadSequenceRef.current += 1;');
});
