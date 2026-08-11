import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appUrl = new URL('../../web/src/App.tsx', import.meta.url);
const overviewUrl = new URL(
  '../../web/src/features/onboarding/CreatorOverviewPage.tsx',
  import.meta.url,
);
const overviewCssUrl = new URL(
  '../../web/src/features/onboarding/creator-overview-page.css',
  import.meta.url,
);

test('creator Overview uses the dedicated Echoo dashboard with existing API-backed state', async () => {
  const app = await readFile(appUrl, 'utf8');

  assert.match(app, /import \{ CreatorOverviewPage \}/);
  assert.match(app, /<CreatorOverviewPage/);
  assert.match(app, /broadcasts=\{broadcasts\}/);
  assert.match(app, /channels=\{channels\}/);
  assert.match(app, /overview=\{overviewState\}/);
  assert.match(app, /setupState=\{setupState\}/);
  assert.doesNotMatch(app, /<MetricCard/);
  assert.doesNotMatch(app, /<Panel title="Broadcast studio"/);
});

test('Echoo Overview matches the approved hierarchy without fabricated audience metrics', async () => {
  const overview = await readFile(overviewUrl, 'utf8');

  assert.match(overview, /Here’s what’s happening with your broadcasts\./);
  assert.match(overview, /title="Current work"/);
  assert.match(overview, /label="Current and upcoming broadcasts"/);
  assert.match(overview, />Quick actions</);
  assert.match(overview, /title="Recent broadcasts"/);
  assert.match(overview, /broadcast\.status === 'live'/);
  assert.match(overview, /broadcast\.status === 'scheduled'/);
  assert.match(overview, /presentationStatus\(broadcast\.status, broadcast\.scheduledStartAt\)/);
  assert.match(overview, /durationLabel\(broadcast\)/);
  assert.doesNotMatch(overview, /\b128\s+listeners\b/i);
  assert.doesNotMatch(overview, /\b256\s+listeners\b/i);
  assert.doesNotMatch(overview, /\b\d+(?:\.\d+)?K?\+?\s+(?:listeners|plays)\b/i);
  assert.doesNotMatch(overview, />Analytics</);
});

test('Overview actions stay lifecycle-aware and do not imply reconnecting is verified live', async () => {
  const overview = await readFile(overviewUrl, 'utf8');

  assert.match(overview, /tone=\{liveBroadcast \? 'live' : 'warning'\}/);
  assert.match(overview, /Public delivery is reconnecting\./);
  assert.match(overview, /Manage live broadcast/);
  assert.match(overview, /Prepare broadcast/);
  assert.match(overview, /Finish channel setup/);
  assert.match(overview, /Manage schedule/);
  assert.match(overview, /action=\{<Button onClick=\{onOpenBroadcasts\} variant="ghost">View all<\/Button>\}/);
});

test('Echoo Overview remains responsive and uses accessible interaction sizes', async () => {
  const css = await readFile(overviewCssUrl, 'utf8');

  assert.match(css, /\.echoo-overview-now-grid[\s\S]*gap:\s*var\(--ds-space-3\)/);
  assert.match(css, /\.echoo-overview-quick-grid[\s\S]*display:\s*flex/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:\s*640px\)/);
  assert.match(css, /@media \(orientation:\s*landscape\) and \(max-height:\s*620px\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
