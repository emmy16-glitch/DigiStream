import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appUrl = new URL('../../web/src/App.tsx', import.meta.url);
const broadcastsUrl = new URL(
  '../../web/src/features/broadcasting/CreatorBroadcastsPage.tsx',
  import.meta.url,
);
const mainUrl = new URL('../../web/src/main.tsx', import.meta.url);
const onboardingCssUrl = new URL(
  '../../web/src/features/onboarding/echoo-onboarding.css',
  import.meta.url,
);

test('Echoo onboarding stylesheet is loaded after shared application styles', async () => {
  const main = await readFile(mainUrl, 'utf8');

  assert.match(main, /import '\.\/styles\.css';[\s\S]*import '\.\/features\/onboarding\/echoo-onboarding\.css';/);
  assert.match(main, /Echoo root element was not found/);
});

test('focused onboarding reuses the existing intent and organisation flow', async () => {
  const app = await readFile(appUrl, 'utf8');

  assert.match(app, /id="creator-intent-title">What would you like to do\?/);
  assert.match(app, />\s*Broadcast audio\s*<\/Button>/);
  assert.match(app, /href="\/listen"[\s\S]*Listen to broadcasts/);
  assert.match(app, /Step 1 of 3/);
  assert.match(app, /Set up your creator workspace/);
  assert.match(app, /Continue to channel setup/);
  assert.match(app, /\/api\/v1\/organisations/);
  assert.doesNotMatch(app, /type="file"/);
});

test('focused onboarding keeps the existing first-channel and first-broadcast decisions', async () => {
  const broadcasts = await readFile(broadcastsUrl, 'utf8');

  assert.match(broadcasts, /Step 2 of 3/);
  assert.match(broadcasts, /Create your first channel/);
  assert.match(broadcasts, /Create and activate channel/);
  assert.match(broadcasts, /Step 3 of 3/);
  assert.match(broadcasts, /How would you like to start\?/);
  assert.match(broadcasts, /Start now/);
  assert.match(broadcasts, /Schedule for later/);
  assert.match(broadcasts, /Finish setup later/);
  assert.match(broadcasts, /aria-pressed=\{firstBroadcastChoice === 'go-live'\}/);
  assert.match(broadcasts, /aria-pressed=\{firstBroadcastChoice === 'schedule'\}/);
  assert.match(broadcasts, /aria-pressed=\{firstBroadcastChoice === 'finish-later'\}/);
});

test('Echoo onboarding presentation suppresses normal navigation only during setup states', async () => {
  const css = await readFile(onboardingCssUrl, 'utf8');

  assert.match(css, /:has\(#creator-intent-title\)/);
  assert.match(css, /:has\(#workspace-onboarding-title\)/);
  assert.match(css, /:has\(\[aria-label='First broadcast choices'\]\)/);
  assert.match(css, /\.ds-creator-mobile-nav[\s\S]*display:\s*none/);
  assert.match(css, /\.ds-creator-navigation[\s\S]*display:\s*none/);
  assert.match(css, /--echoo-onboarding-blue:\s*var\(--ds-pink-500\)/);
  assert.match(css, /--echoo-onboarding-navy:\s*var\(--ds-ink\)/);
  assert.match(css, /min-height:\s*118px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /@media \(max-width:\s*640px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});