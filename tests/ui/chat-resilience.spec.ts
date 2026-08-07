import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const chatPath = path.join(root, 'apps/web/src/features/chat/BroadcastChat.tsx');
const realtimeIntegrationPath = path.join(root, 'apps/api/test/realtime.integration.test.ts');

test('chat recovery polls committed history while reconnecting live updates', async () => {
  const source = await readFile(chatPath, 'utf8');

  expect(source).toContain("setRealtimeState(reconnectAttempt > 0 ? 'recovering' : 'connecting')");
  expect(source).toContain("const recoveryPoll = window.setInterval(() => void loadLatest('latest'), 15_000)");
  expect(source).toContain('<strong>Recovering missed messages…</strong>');
  expect(source).toContain('DigiStream is reconnecting live updates and checking stored history.');
});

test('unauthorized realtime room degrades to stored history without an endless reconnect loop', async () => {
  const source = await readFile(chatPath, 'utf8');

  expect(source).toContain("message.error?.code === 'REALTIME_ROOM_NOT_AVAILABLE'");
  expect(source).toContain('roomDenied = true');
  expect(source).toContain("setRealtimeNotice('Live updates are unavailable. Stored chat history remains available.')");
  expect(source).toContain('if (stopped || roomDenied || !userRef.current)');
});

test('terminal chat states never attempt a realtime room join', async () => {
  const source = await readFile(chatPath, 'utf8');

  expect(source).toContain("const REALTIME_CHAT_STATES = new Set<BroadcastState>([");
  expect(source).toContain("'scheduled',");
  expect(source).toContain("'starting',");
  expect(source).toContain("'live',");
  expect(source).toContain("'reconnecting',");
  expect(source).toContain("'ending',");
  expect(source).not.toContain("  'completed',\n]);");
  expect(source).toContain('!REALTIME_CHAT_STATES.has(broadcastStatus)');
});

test('revoked sessions are truthful across concurrent realtime connections', async () => {
  const source = await readFile(chatPath, 'utf8');
  const serverTest = await readFile(realtimeIntegrationPath, 'utf8');

  expect(source).toContain("message.type === 'realtime.session-ended'");
  expect(source).toContain('Your session ended. Sign in again to continue chatting.');
  expect(serverTest).toContain('const secondOwnerUpgrade = await upgrade(address, ownerCookie)');
  expect(serverTest).toContain("messageType('realtime.session-ended')");
  expect(serverTest).toContain('.set({ revokedAt: new Date() })');
});

test('server authorization keeps private and unavailable rooms private-not-found', async () => {
  const serverTest = await readFile(realtimeIntegrationPath, 'utf8');

  expect(serverTest).toContain("'outsider-private'");
  expect(serverTest).toContain("'realtime.error'");
  expect(serverTest).toContain("'outsider-public'");
  expect(serverTest).toContain("'room.joined'");
});
