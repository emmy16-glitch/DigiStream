import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const discoveryUrl = new URL(
  '../../web/src/features/listening/ListenerDiscoveryPage.tsx',
  import.meta.url,
);
const discoveryCssUrl = new URL(
  '../../web/src/features/listening/listener-discovery-reference.css',
  import.meta.url,
);
const callInUrl = new URL(
  '../../web/src/features/listening/ListenerCallInPanel.tsx',
  import.meta.url,
);
const callInCssUrl = new URL(
  '../../web/src/features/listening/listener-call-in-reference.css',
  import.meta.url,
);
const replayUrl = new URL(
  '../../web/src/features/listening/ReplayListeningPage.tsx',
  import.meta.url,
);
const replayCssUrl = new URL(
  '../../web/src/features/listening/replay-listening-reference.css',
  import.meta.url,
);

test('Listener Discovery follows the Echoo reference without fake audience metrics', async () => {
  const source = await readFile(discoveryUrl, 'utf8');
  const css = await readFile(discoveryCssUrl, 'utf8');

  assert.match(source, /<h1>Discover<\/h1>/);
  assert.match(source, /Find live and upcoming broadcasts\./);
  assert.match(source, /Search broadcasts, creators…/);
  assert.match(source, /\/api\/v1\/broadcasts\?limit=40/);
  assert.match(source, /isFutureUpcomingBroadcast/);
  assert.match(source, /broadcast\.channel\.category/);
  assert.match(source, /broadcast\.organisation\.name/);
  assert.doesNotMatch(source, /\d+\s+listeners/i);
  assert.doesNotMatch(source, /Morning Vibes With Sam/);
  assert.doesNotMatch(source, /Worship Night/);
  assert.doesNotMatch(source, /Tech Talk Live/);

  assert.match(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /background:\s*var\(--ds-brand-soft\)/);
  assert.match(css, /@media \(max-width:\s*640px\)/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /#071f43|#21d07a/);
});

test('Listener call-in keeps the authoritative request and status workflow under the Echoo request design', async () => {
  const source = await readFile(callInUrl, 'utf8');
  const css = await readFile(callInCssUrl, 'utf8');

  assert.match(source, /Request to join the conversation/);
  assert.match(source, /Request to speak/);
  assert.match(source, /name="microphone"/);
  assert.match(source, /\$\{metadataEndpoint\}\/call-ins/);
  assert.match(source, /\/api\/v1\/call-ins\/\$\{encodeURIComponent\(statusToken\)\}/);
  assert.match(source, /sessionStorage\.setItem/);
  assert.match(source, /setInterval\(\(\) => void refreshStatus\(\), 5_000\)/);
  assert.match(source, /relationship === 'production'/);
  assert.match(source, /relationship === 'moderator'/);
  assert.match(source, /relationship === 'analyst'/);
  assert.match(source, /Open Studio Lobby/);
  assert.match(source, /Approval does not turn it on automatically/);
  assert.match(source, /useModalDialog/);
  assert.match(source, /useMobileOverlayLayout/);

  assert.match(css, /echoo-call-in-mic/);
  assert.match(css, /min-height:\s*var\(--ds-control-min-height\)/);
  assert.match(css, /@media \(max-width:\s*620px\)/);
  assert.match(css, /:focus-visible/);
});

test('Replay player keeps short-lived access and real media metadata while rejecting mock reference metrics', async () => {
  const source = await readFile(replayUrl, 'utf8');
  const css = await readFile(replayCssUrl, 'utf8');

  assert.match(source, /kind === 'member-replay'/);
  assert.match(source, /\/api\/v1\/replays/);
  assert.match(source, /\/access/);
  assert.match(source, /body: jsonBody\(\{ mode: 'playback' \}\)/);
  assert.match(source, /accessExpiresAt/);
  assert.match(source, /audioRef\.current\?\.pause\(\)/);
  assert.match(source, /<audio/);
  assert.match(source, /controls/);
  assert.match(source, /replay\.media\.durationMs/);
  assert.match(source, /replay\.media\.sizeBytes/);
  assert.match(source, /replay\.media\.format/);
  assert.match(source, /echoo-replay-hero/);
  assert.match(source, /echoo-replay-details/);
  assert.doesNotMatch(source, /254 plays/i);
  assert.doesNotMatch(source, /\blikes?\b/i);
  assert.doesNotMatch(source, /waveform/i);

  assert.match(css, /echoo-replay-hero-play/);
  assert.match(css, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width:\s*640px\)/);
  assert.match(css, /@media \(max-width:\s*420px\)/);
  assert.match(css, /:focus-visible/);
});
