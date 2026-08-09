import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const shellSourceUrl = new URL('../../web/src/design-system/shells.tsx', import.meta.url);
const shellStylesUrl = new URL('../../web/src/design-system/creator-shell.css', import.meta.url);
const connectivitySourceUrl = new URL('../../web/src/design-system/ConnectivityStatus.tsx', import.meta.url);
const chatSourceUrl = new URL('../../web/src/features/chat/CreatorChatWorkspace.tsx', import.meta.url);
const lobbySourceUrl = new URL('../../web/src/features/guests/CreatorBackstageWorkspace.tsx', import.meta.url);
const studioSourceUrl = new URL('../../web/src/features/broadcasting/CreatorBroadcastStudio.tsx', import.meta.url);
const analyticsSourceUrl = new URL('../../web/src/features/analytics/CreatorAnalyticsPage.tsx', import.meta.url);
const discoverySourceUrl = new URL('../../web/src/features/listening/ListenerDiscoveryPage.tsx', import.meta.url);

test('mobile creator navigation keeps four primary destinations and an accessible More menu', async () => {
  const [source, styles] = await Promise.all([
    readFile(shellSourceUrl, 'utf8'),
    readFile(shellStylesUrl, 'utf8'),
  ]);

  assert.match(source, /visibleNavigation\.slice\(0, 4\)/);
  assert.match(source, /aria-label="More creator destinations"/);
  assert.match(source, /mobileMoreRef\.current\.open = false/);
  assert.match(styles, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
});

test('restored connectivity notice is bounded and dismissible', async () => {
  const source = await readFile(connectivitySourceUrl, 'utf8');

  assert.match(source, /RESTORED_NOTICE_DURATION_MS = 6_000/);
  assert.match(source, /window\.setTimeout\(\(\) => setWasOffline\(false\)/);
  assert.match(source, /aria-label="Dismiss network restored message"/);
});

test('mobile account actions move behind one labelled profile affordance without losing workspace switching', async () => {
  const source = await readFile(shellSourceUrl, 'utf8');
  assert.match(source, /aria-label="Open account and workspace menu"/);
  assert.match(source, /ds-mobile-account-actions/);
  assert.match(
    source,
    /ds-mobile-account-popover[\s\S]*canSwitchWorkspace \? workspaceSelect\(\) : null/,
  );
});

test('chat and Lobby explain draft eligibility before operational controls', async () => {
  const [chat, lobby] = await Promise.all([
    readFile(chatSourceUrl, 'utf8'),
    readFile(lobbySourceUrl, 'utf8'),
  ]);
  assert.match(chat, /is still a draft\. Finish its setup or schedule it before opening chat/);
  assert.match(chat, /Continue broadcast setup/);
  assert.match(lobby, /The requested broadcast is no longer eligible/);
  assert.match(lobby, /Only scheduled or active broadcasts can load real guest and call-in controls/);
});

test('Studio diagnostics and Stats preserve truth behind progressive disclosure', async () => {
  const [studio, analytics] = await Promise.all([
    readFile(studioSourceUrl, 'utf8'),
    readFile(analyticsSourceUrl, 'utf8'),
  ]);
  assert.match(studio, /The broadcast did not start from this failed Studio action/);
  assert.match(studio, /<summary>Technical details<\/summary>/);
  assert.match(analytics, /<summary>Playback health and advanced analytics<\/summary>/);
});

test('public discovery distinguishes offline failure and retries with a visible loading state', async () => {
  const discovery = await readFile(discoverySourceUrl, 'utf8');
  assert.match(discovery, /setOffline\(!navigator\.onLine\)/);
  assert.match(discovery, /kind=\{offline \? 'offline' : 'error'\}/);
  assert.match(discovery, /onAction=\{\(\) => void refresh\(true\)\}/);
  assert.match(discovery, /if \(showLoading\) setLoading\(true\)/);
});
