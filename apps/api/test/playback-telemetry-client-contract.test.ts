import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const clientUrl = new URL('../../web/src/lib/playback-telemetry-client.ts', import.meta.url);

test('playback telemetry de-duplicates paired player error signals and resets after real playback progress', async () => {
  const source = await readFile(clientUrl, 'utf8');

  assert.match(source, /let errorReportedSinceProgress = false;/);
  assert.match(source, /const reportError = \(\) => \{/);
  assert.match(source, /if \(errorReportedSinceProgress\) return;/);
  assert.match(source, /errorReportedSinceProgress = true;\s+send\('error'\);/);
  assert.match(source, /if \(state === 'playing'\) \{\s+errorReportedSinceProgress = false;/);
  assert.match(source, /if \(state === 'error'\) reportError\(\);/);
  assert.match(source, /player\.on\('error', reportError\);/);
});
