import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const studioUrl = new URL(
  '../../web/src/features/broadcasting/CreatorBroadcastStudio.tsx',
  import.meta.url,
);
const studioCssUrl = new URL(
  '../../web/src/features/broadcasting/creator-broadcast-studio.css',
  import.meta.url,
);

test('Echoo Studio preserves microphone, contribution and delivery as separate truths', async () => {
  const source = await readFile(studioUrl, 'utf8');

  assert.match(source, /<h3 id="studio-audio-title">Prepare studio audio<\/h3>/);
  assert.match(source, /<h3 id="studio-delivery-title">Verify and go live<\/h3>/);
  assert.match(source, /title="Microphone permission and input"/);
  assert.match(source, /title="Private studio connection"/);
  assert.match(source, /title="Public listener delivery"/);
  assert.match(source, /<TaskList/);
  assert.match(source, /microphoneReadyForDelivery/);
  assert.match(source, /publicDeliveryIsLive\(delivery\)/);
  assert.match(source, /Contribution and public delivery are verified/);
});

test('Studio keeps real operational actions and does not invent audience or bitrate data', async () => {
  const source = await readFile(studioUrl, 'utf8');

  assert.match(source, /Test microphone/);
  assert.match(source, /Join private studio/);
  assert.match(source, /Go live/);
  assert.match(source, /Retry public delivery/);
  assert.match(source, /Check delivery status/);
  assert.match(source, /End broadcast/);
  assert.match(source, /Open listener preview/);
  assert.doesNotMatch(source, /\b\d+(?:\.\d+)?K?\+?\s+listeners\b/i);
  assert.doesNotMatch(source, /\b128\s*kbps\b/i);
  assert.doesNotMatch(source, />Analytics</);
});

test('Echoo Studio uses the approved operational hierarchy instead of a decorative dashboard', async () => {
  const css = await readFile(studioCssUrl, 'utf8');

  assert.match(css, /grid-template-columns:\s*minmax\(245px, 285px\) minmax\(0, 1fr\)/);
  assert.match(css, /grid-template-areas:[\s\S]*"state audio"[\s\S]*"delivery audio"/);
  assert.match(css, /\.studio-status-card\s*\{[\s\S]*grid-area:\s*state/);
  assert.match(css, /\.studio-audio-card\s*\{[\s\S]*grid-area:\s*audio/);
  assert.match(css, /\.studio-delivery-card\s*\{[\s\S]*grid-area:\s*delivery/);
  assert.match(css, /background:\s*var\(--ds-accent-sky-soft\)/);
  assert.doesNotMatch(css, /#071a36|#0b2449|#123a70/);
  assert.doesNotMatch(css, /animation:\s*[^;]+infinite/);
});

test('Echoo Studio stays accessible across desktop, mobile and reduced-motion use', async () => {
  const css = await readFile(studioCssUrl, 'utf8');

  assert.match(css, /min-height:\s*46px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:\s*900px\)/);
  assert.match(css, /@media \(max-width:\s*640px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});
