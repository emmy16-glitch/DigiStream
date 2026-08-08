import assert from 'node:assert/strict';
import type { Socket } from 'node:net';
import test from 'node:test';
import {
  RealtimeHub,
  type RealtimeConnection,
} from '../src/modules/realtime/realtime-hub.js';

function connection(id: string, userId: string): RealtimeConnection {
  return {
    id,
    userId,
    sessionId: `session-${id}`,
    socket: {} as Socket,
    rooms: new Set<string>(),
    awaitingPong: false,
    lastSessionCheckAt: 0,
    messageWindowStartedAt: 0,
    messageCount: 0,
    operationQueue: Promise.resolve(),
    send: () => true,
    close: () => undefined,
  };
}

test('room presence collapses multiple tabs into one truthful user identity', () => {
  const hub = new RealtimeHub();
  const room = 'broadcast:00000000-0000-4000-8000-000000000001';
  const firstTab = connection('tab-1', 'user-a');
  const secondTab = connection('tab-2', 'user-a');
  const otherUser = connection('tab-3', 'user-b');

  for (const member of [firstTab, secondTab, otherUser]) {
    hub.add(member);
    hub.join(member, room);
  }

  assert.equal(hub.countUserInRoom(room, 'user-a'), 2);
  assert.equal(hub.countUserInRoom(room, 'user-b'), 1);
  assert.deepEqual(hub.userIdsInRoom(room), ['user-a', 'user-b']);

  hub.leave(firstTab, room);
  assert.equal(hub.countUserInRoom(room, 'user-a'), 1);
  assert.deepEqual(hub.userIdsInRoom(room), ['user-a', 'user-b']);

  hub.remove(secondTab);
  assert.equal(hub.countUserInRoom(room, 'user-a'), 0);
  assert.deepEqual(hub.userIdsInRoom(room), ['user-b']);

  hub.remove(otherUser);
  assert.deepEqual(hub.userIdsInRoom(room), []);
});

test('duplicate joins do not inflate per-user room presence', () => {
  const hub = new RealtimeHub();
  const room = 'broadcast:00000000-0000-4000-8000-000000000002';
  const tab = connection('tab-1', 'user-a');
  hub.add(tab);

  hub.join(tab, room);
  hub.join(tab, room);

  assert.equal(hub.countUserInRoom(room, 'user-a'), 1);
  assert.deepEqual(hub.userIdsInRoom(room), ['user-a']);
});
