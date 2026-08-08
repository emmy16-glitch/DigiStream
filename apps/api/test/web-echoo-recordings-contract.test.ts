import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const recordingsPageUrl = new URL(
  '../../web/src/features/recordings/CreatorRecordingsPage.tsx',
  import.meta.url,
);
const recordingsCssUrl = new URL(
  '../../web/src/features/recordings/creator-recordings-page.css',
  import.meta.url,
);

test('Creator Recordings follows the Echoo completed-broadcast reference', async () => {
  const source = await readFile(recordingsPageUrl, 'utf8');

  assert.match(source, /<h2>Recordings<\/h2>/);
  assert.match(source, /<p>Your completed broadcasts\.<\/p>/);
  assert.match(source, /recordings-reference-list/);
  assert.match(source, /recording-reference-row/);
  assert.match(source, /recording-reference-artwork/);
  assert.match(source, /recording-reference-status/);
  assert.match(source, />Play</);
  assert.match(source, /recording-more-menu/);
});

test('Creator Recordings keeps authoritative recording and replay APIs', async () => {
  const source = await readFile(recordingsPageUrl, 'utf8');

  assert.match(source, /\/api\/v1\/organisations\/\$\{organisation\.id\}\/recordings/);
  assert.match(source, /\/api\/v1\/organisations\/\$\{organisation\.id\}\/broadcasts\/\$\{source\.broadcast\.id\}\/recording/);
  assert.match(source, /method: 'POST'/);
  assert.match(source, /method: 'PATCH'/);
  assert.match(source, /memberReplayPath/);
  assert.match(source, /publicReplayPath/);
  assert.match(source, /RECORDING_REFRESH_INTERVAL_MS = 15_000/);
});

test('Creator Recordings preserves lifecycle and access truth instead of reference mock data', async () => {
  const source = await readFile(recordingsPageUrl, 'utf8');

  for (const status of [
    'recording',
    'uploading',
    'processing',
    'ready',
    'failed',
    'published',
    'private',
    'archived',
    'deleted',
  ]) {
    assert.match(source, new RegExp(`'${status}'`));
  }

  assert.match(source, /Choose published or private visibility before listener playback becomes available/);
  assert.match(source, /Echoo does not invent replay data/);
  assert.doesNotMatch(source, /Morning Vibes With Sam/);
  assert.doesNotMatch(source, /Sunday Service/);
  assert.doesNotMatch(source, /Prayer Meeting/);
  assert.doesNotMatch(source, /Youth Connect/);
});

test('Creator Recordings uses the Echoo light responsive visual system', async () => {
  const css = await readFile(recordingsCssUrl, 'utf8');

  assert.match(css, /grid-template-columns:\s*4\.5rem minmax\(0, 1\.55fr\)/);
  assert.match(css, /background:\s*#e4edf9/);
  assert.match(css, /var\(--ds-surface-1\)/);
  assert.match(css, /var\(--ds-text-primary\)/);
  assert.match(css, /var\(--ds-accent-soft\)/);
  assert.match(css, /min-height:\s*var\(--ds-control-min-height\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:\s*900px\)/);
  assert.match(css, /@media \(max-width:\s*620px\)/);
  assert.match(css, /@media \(max-width:\s*430px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
});
