import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appUrl = new URL('../../web/src/App.tsx', import.meta.url);
const overviewUrl = new URL(
  '../../web/src/features/onboarding/CreatorOverviewPage.tsx',
  import.meta.url,
);
const creatorLobbyUrl = new URL(
  '../../web/src/features/guests/CreatorBackstageWorkspace.tsx',
  import.meta.url,
);
const guestJoinUrl = new URL(
  '../../web/src/features/guests/GuestJoinPage.tsx',
  import.meta.url,
);

test('Studio Lobby is the user-facing creator navigation name', async () => {
  const app = await readFile(appUrl, 'utf8');
  const overview = await readFile(overviewUrl, 'utf8');

  assert.match(app, /label: 'Studio Lobby'/);
  assert.match(app, /path: '\/creator\/studio-lobby'/);
  assert.match(app, /pathname === '\/creator\/audience'\) return 'Studio Lobby'/);
  assert.match(app, /aria-label="Open Studio Lobby"/);
  assert.match(app, />\s*Open Studio Lobby\s*</);
  assert.match(overview, /label: 'Studio Lobby'/);
});

test('Studio Lobby names the producer and external guest surfaces', async () => {
  const creatorLobby = await readFile(creatorLobbyUrl, 'utf8');
  const guestJoin = await readFile(guestJoinUrl, 'utf8');

  assert.match(creatorLobby, />\s*Studio Lobby\s*</);
  assert.match(creatorLobby, /Sign in to manage the Studio Lobby/);
  assert.match(guestJoin, /<h1>You’re invited to join a live conversation\.<\/h1>/);
  assert.match(guestJoin, /'Join Studio Lobby'/);
  assert.match(guestJoin, />\s*Leave Studio Lobby\s*</);
});

test('the product rename does not rename authoritative backstage API ownership', async () => {
  const creatorLobby = await readFile(creatorLobbyUrl, 'utf8');

  assert.match(creatorLobby, /\$\{base\}\/backstage\/participants/);
  assert.match(
    creatorLobby,
    /\/backstage\/participants\/\$\{encodeURIComponent\(participant\.identity\)\}\/mute/,
  );
  assert.match(creatorLobby, /stateKey: 'digistream\.creator-backstage'/);
});
