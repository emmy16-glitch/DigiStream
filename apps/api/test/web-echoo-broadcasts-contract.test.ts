import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const broadcastsPageUrl = new URL(
  '../../web/src/features/broadcasting/CreatorBroadcastsPage.tsx',
  import.meta.url,
);
const broadcastsCssUrl = new URL(
  '../../web/src/features/broadcasting/creator-broadcasts-page.css',
  import.meta.url,
);

test('Echoo Broadcasts keeps the real channel and broadcast API workflow', async () => {
  const source = await readFile(broadcastsPageUrl, 'utf8');

  assert.match(source, /\/api\/v1\/organisations\/\$\{organisation\.id\}\/channels/);
  assert.match(source, /\/api\/v1\/organisations\/\$\{organisation\.id\}\/channels\/\$\{channelId\}\/broadcasts/);
  assert.match(source, /body: jsonBody\(\{ status: 'pending_review' \}\)/);
  assert.match(source, /body: jsonBody\(\{ status: 'active' \}\)/);
  assert.match(source, /type FirstBroadcastChoice = 'go-live' \| 'schedule' \| 'finish-later' \| null;/);
  assert.match(source, /Create broadcast and open Studio/);
  assert.match(source, /Finish setup later/);
});

test('Echoo Broadcasts uses truthful lifecycle filters instead of invented analytics', async () => {
  const source = await readFile(broadcastsPageUrl, 'utf8');

  assert.match(source, /type BroadcastFilter = 'all' \| 'live' \| 'scheduled' \| 'ended';/);
  assert.match(source, /\{ label: 'All', value: 'all' \}/);
  assert.match(source, /\{ label: 'Live', value: 'live' \}/);
  assert.match(source, /\{ label: 'Scheduled', value: 'scheduled' \}/);
  assert.match(source, /\{ label: 'Ended', value: 'ended' \}/);
  assert.match(source, /if \(filter === 'live'\) return displayStatus === 'live';/);
  assert.match(source, /displayStatus === 'scheduled' \|\| displayStatus === 'overdue'/);
  assert.match(source, /displayStatus === 'completed' \|\| displayStatus === 'cancelled' \|\| displayStatus === 'failed'/);
  assert.doesNotMatch(source, /\b\d+(?:\.\d+)?K?\+?\s+(?:listeners|plays)\b/i);
  assert.doesNotMatch(source, />Analytics</);
});

test('each Broadcasts row exposes a lifecycle-specific real action and exact Studio context', async () => {
  const source = await readFile(broadcastsPageUrl, 'utf8');

  assert.match(source, /label: 'Continue setup'/);
  assert.match(source, /label: 'Run sound check'/);
  assert.match(source, /label: 'Open Studio to start'/);
  assert.match(source, /label: 'Check start progress'/);
  assert.match(source, /label: 'Manage live'/);
  assert.match(source, /label: 'View ending status'/);
  assert.match(source, /label: 'View recording'/);
  assert.match(source, /label: 'Create another'/);
  assert.match(source, /onOpenStudio\(\{[\s\S]*organisationId: organisation\.id,[\s\S]*channelId: selectedChannelId,[\s\S]*broadcastId: broadcast\.id,/);
  assert.doesNotMatch(source, /Open Broadcast Studio/);
  assert.equal([...source.matchAll(/>\s*New broadcast\s*</g)].length, 1);
});

test('Echoo Broadcasts remains responsive, focus-visible and touch friendly', async () => {
  const css = await readFile(broadcastsCssUrl, 'utf8');

  assert.match(css, /grid-template-columns:\s*auto minmax\(0, 1fr\) auto auto/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:\s*640px\)/);
  assert.match(css, /@media \(orientation:\s*landscape\) and \(max-height:\s*620px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
}
);
