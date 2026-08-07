import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appUrl = new URL('../../web/src/App.tsx', import.meta.url);
const chatWorkspaceUrl = new URL(
  '../../web/src/features/chat/CreatorChatWorkspace.tsx',
  import.meta.url,
);
const chatCssUrl = new URL(
  '../../web/src/features/chat/creator-chat-workspace.css',
  import.meta.url,
);
const broadcastChatUrl = new URL(
  '../../web/src/features/chat/BroadcastChat.tsx',
  import.meta.url,
);

test('Creator Chat is a first-class routed creator destination', async () => {
  const app = await readFile(appUrl, 'utf8');

  assert.match(app, /\| 'Chat'/);
  assert.match(app, /label: 'Chat', shortLabel: 'Chat', icon: 'chat', path: '\/creator\/chat'/);
  assert.match(app, /onClick=\{\(\) => selectNavigation\('Chat'\)\}/);
  assert.match(app, /activeNav === 'Chat'/);
  assert.match(app, /<CreatorChatWorkspace \/>/);
  assert.doesNotMatch(app, /chatOpen/);
});

test('Creator Chat reuses authoritative broadcast chat APIs and realtime owner', async () => {
  const workspace = await readFile(chatWorkspaceUrl, 'utf8');
  const broadcastChat = await readFile(broadcastChatUrl, 'utf8');

  assert.match(workspace, /\/api\/v1\/organisations/);
  assert.match(workspace, /\/channels/);
  assert.match(workspace, /\/broadcasts/);
  assert.match(workspace, /<BroadcastChat/);
  assert.match(workspace, /\/chat\/messages/);
  assert.match(broadcastChat, /new WebSocket\(realtimeEndpoint\(\), REALTIME_PROTOCOL\)/);
  assert.match(broadcastChat, /chat\.message\.created/);
  assert.match(broadcastChat, /Messages are stored before live delivery/);
});

test('Creator Chat keeps lifecycle truth and does not invent audience data', async () => {
  const workspace = await readFile(chatWorkspaceUrl, 'utf8');

  assert.match(workspace, /scheduled/);
  assert.match(workspace, /starting/);
  assert.match(workspace, /live/);
  assert.match(workspace, /reconnecting/);
  assert.match(workspace, /ending/);
  assert.match(workspace, /completed/);
  assert.match(workspace, /No placeholder messages or audience counts are shown/);
  assert.doesNotMatch(workspace, /\b\d+(?:\.\d+)?K?\+?\s+(?:listeners|messages|viewers)\b/i);
});

test('Creator Chat follows Echoo light responsive visual system', async () => {
  const css = await readFile(chatCssUrl, 'utf8');

  assert.match(css, /grid-template-columns:\s*minmax\(280px, 0\.82fr\) minmax\(0, 1\.18fr\)/);
  assert.match(css, /linear-gradient\(150deg, #071a36 0%, #0d2c59 56%, #1f4e8c 100%\)/);
  assert.match(css, /var\(--ds-surface-1\)/);
  assert.match(css, /min-height:\s*var\(--ds-control-min-height\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:\s*820px\)/);
  assert.match(css, /@media \(max-width:\s*560px\)/);
  assert.match(css, /@media \(orientation:\s*landscape\) and \(max-height:\s*620px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
});
