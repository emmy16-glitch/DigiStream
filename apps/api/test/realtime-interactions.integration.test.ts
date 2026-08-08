import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import net, { type Socket } from 'node:net';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  channels,
  organisationMemberships,
  organisations,
  users,
} from '../src/db/schema.js';
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
import { REALTIME_PROTOCOL } from '../src/modules/realtime/realtime.server.js';
import {
  encodeWebSocketFrame,
  WebSocketFrameParser,
} from '../src/modules/realtime/websocket-protocol.js';

const databaseUrl = process.env.DATABASE_URL;
type JsonMessage = Record<string, unknown>;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

class Client {
  private readonly parser = new WebSocketFrameParser({
    maxMessageBytes: 64 * 1024,
    expectMasked: false,
  });
  private readonly queue: JsonMessage[] = [];
  private readonly waiters: Array<{
    predicate: (message: JsonMessage) => boolean;
    resolve: (message: JsonMessage) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];

  constructor(private readonly socket: Socket, initialData: Buffer) {
    socket.on('error', () => undefined);
    socket.on('data', (chunk: Buffer) => this.receive(chunk));
    if (initialData.length) this.receive(initialData);
  }

  private receive(chunk: Buffer): void {
    for (const frame of this.parser.push(chunk)) {
      if (frame.type === 'ping') {
        this.socket.write(encodeWebSocketFrame(0xa, frame.payload, true));
        continue;
      }
      if (frame.type !== 'text') continue;
      const message = JSON.parse(frame.text) as JsonMessage;
      const index = this.waiters.findIndex((waiter) => waiter.predicate(message));
      if (index < 0) {
        this.queue.push(message);
        continue;
      }
      const [waiter] = this.waiters.splice(index, 1);
      if (waiter) {
        clearTimeout(waiter.timer);
        waiter.resolve(message);
      }
    }
  }

  send(message: JsonMessage): void {
    this.socket.write(encodeWebSocketFrame(0x1, JSON.stringify(message), true));
  }

  waitFor(predicate: (message: JsonMessage) => boolean, timeoutMs = 5_000): Promise<JsonMessage> {
    const queued = this.queue.findIndex(predicate);
    if (queued >= 0) {
      const [message] = this.queue.splice(queued, 1);
      assert.ok(message);
      return Promise.resolve(message);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.findIndex((waiter) => waiter.timer === timer);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new Error('Timed out waiting for realtime event.'));
      }, timeoutMs);
      this.waiters.push({ predicate, resolve, reject, timer });
    });
  }

  close(): void {
    this.socket.destroy();
  }
}

async function upgrade(address: string, cookie: string): Promise<Client> {
  const url = new URL(address);
  const socket = net.createConnection({ host: url.hostname, port: Number(url.port) });
  const key = randomBytes(16).toString('base64');
  return new Promise((resolve, reject) => {
    let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const boundary = buffer.indexOf('\r\n\r\n');
      if (boundary < 0) return;
      socket.off('data', onData);
      const headers = buffer.subarray(0, boundary).toString('utf8');
      assert.match(headers, /^HTTP\/1\.1 101/);
      resolve(new Client(socket, Buffer.from(buffer.subarray(boundary + 4))));
    };
    socket.once('error', reject);
    socket.on('data', onData);
    socket.once('connect', () => {
      socket.write(
        'GET /api/v1/realtime HTTP/1.1\r\n' +
          `Host: ${url.hostname}:${url.port}\r\n` +
          'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n` +
          `Sec-WebSocket-Protocol: ${REALTIME_PROTOCOL}\r\nCookie: ${cookie}\r\n\r\n`,
      );
    });
  });
}

function event(type: string, requestId?: string) {
  return (message: JsonMessage) =>
    message.type === type && (requestId === undefined || message.requestId === requestId);
}

test(
  'broadcast reactions are bounded and typing expires without leaking to unauthorized rooms',
  { skip: !databaseUrl, timeout: 90_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({
      database,
      realtime: {
        heartbeatIntervalMs: 5_000,
        maxReactionsPerWindow: 2,
        reactionWindowMs: 10_000,
        typingTtlMs: 1_000,
      },
    });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'Realtime-interaction-test-123!';
    const clients: Client[] = [];
    let organisationId = '';
    let ownerId = '';
    let listenerId = '';

    try {
      const ownerRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `rt-interaction-owner-${suffix}@example.test`,
          displayName: 'Interaction Owner',
          password,
        },
      });
      const listenerRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `rt-interaction-listener-${suffix}@example.test`,
          displayName: 'Interaction Listener',
          password,
        },
      });
      assert.equal(ownerRegistration.statusCode, 201);
      assert.equal(listenerRegistration.statusCode, 201);
      ownerId = ownerRegistration.json().user.id;
      listenerId = listenerRegistration.json().user.id;

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Interaction Network',
          slug: `interaction-${suffix}`,
          createdByUserId: ownerId,
        })
        .returning();
      assert.ok(organisation);
      organisationId = organisation.id;
      await database.db.insert(organisationMemberships).values({
        organisationId,
        userId: ownerId,
        role: 'owner',
      });

      const [channel] = await database.db
        .insert(channels)
        .values({
          organisationId,
          name: 'Interaction channel',
          slug: `interaction-channel-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: ownerId,
        })
        .returning();
      assert.ok(channel);
      const [broadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: channel.id,
          createdByUserId: ownerId,
          title: 'Interaction live broadcast',
          slug: `interaction-live-${suffix}`,
          status: 'live',
          contributionRoomName: `interaction-room-${suffix}`,
          deliveryStreamName: `interaction-stream-${suffix}`,
        })
        .returning();
      assert.ok(broadcast);

      const address = await app.listen({ host: '127.0.0.1', port: 0 });
      const owner = await upgrade(address, responseCookie(ownerRegistration));
      const listener = await upgrade(address, responseCookie(listenerRegistration));
      clients.push(owner, listener);
      await owner.waitFor(event('realtime.connected'));
      await listener.waitFor(event('realtime.connected'));

      const room = { kind: 'broadcast', id: broadcast.id, organisationId };
      owner.send({ type: 'join', requestId: 'owner-join', room });
      listener.send({ type: 'join', requestId: 'listener-join', room });
      await owner.waitFor(event('room.joined', 'owner-join'));
      await listener.waitFor(event('room.joined', 'listener-join'));

      owner.send({ type: 'typing.set', requestId: 'typing-on', room, active: true });
      const typingOn = await listener.waitFor(event('typing.changed', 'typing-on'));
      assert.equal(typingOn.active, true);
      assert.equal((typingOn.user as JsonMessage).id, ownerId);
      const expired = await listener.waitFor(
        (message) => message.type === 'typing.changed' && message.active === false && message.reason === 'expired',
        3_000,
      );
      assert.equal((expired.user as JsonMessage).id, ownerId);

      for (const [requestId, reaction] of [
        ['reaction-1', '👍'],
        ['reaction-2', '❤️'],
      ] as const) {
        owner.send({ type: 'reaction.send', requestId, room, reaction });
        const received = await listener.waitFor(event('reaction.sent', requestId));
        assert.equal(received.reaction, reaction);
        assert.equal((received.user as JsonMessage).id, ownerId);
      }

      owner.send({ type: 'reaction.send', requestId: 'reaction-3', room, reaction: '👏' });
      const limited = await owner.waitFor(event('realtime.error', 'reaction-3'));
      assert.equal((limited.error as JsonMessage).code, 'REALTIME_REACTION_RATE_LIMITED');
      assert.equal(typeof (limited.error as JsonMessage).retryAfterMs, 'number');

      owner.send({ type: 'reaction.send', requestId: 'bad-reaction', room, reaction: 'arbitrary' });
      const badReaction = await owner.waitFor(event('realtime.error', 'bad-reaction'));
      assert.equal((badReaction.error as JsonMessage).code, 'INVALID_REALTIME_REACTION');

      listener.send({ type: 'leave', requestId: 'leave', room });
      await listener.waitFor(event('room.left', 'leave'));
      listener.send({ type: 'typing.set', requestId: 'typing-after-leave', room, active: true });
      const afterLeave = await listener.waitFor(event('realtime.error', 'typing-after-leave'));
      assert.equal((afterLeave.error as JsonMessage).code, 'REALTIME_INTERACTION_ROOM_REQUIRED');

      const privateChannel = await database.db
        .insert(channels)
        .values({
          organisationId,
          name: 'Private interaction channel',
          slug: `private-interaction-${suffix}`,
          status: 'active',
          visibility: 'private',
          createdByUserId: ownerId,
        })
        .returning()
        .then(([row]) => row);
      assert.ok(privateChannel);
      const privateBroadcast = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: privateChannel.id,
          createdByUserId: ownerId,
          title: 'Private interaction broadcast',
          slug: `private-interaction-live-${suffix}`,
          status: 'live',
          contributionRoomName: `private-interaction-room-${suffix}`,
          deliveryStreamName: `private-interaction-stream-${suffix}`,
        })
        .returning()
        .then(([row]) => row);
      assert.ok(privateBroadcast);
      listener.send({
        type: 'reaction.send',
        requestId: 'private-reaction',
        room: { kind: 'broadcast', id: privateBroadcast.id, organisationId },
        reaction: '👍',
      });
      const privateError = await listener.waitFor(event('realtime.error', 'private-reaction'));
      assert.equal((privateError.error as JsonMessage).code, 'REALTIME_ROOM_NOT_AVAILABLE');
    } finally {
      for (const client of clients) client.close();
      await app.close();
      if (organisationId) {
        await database.db.delete(organisations).where(eq(organisations.id, organisationId));
      }
      if (ownerId) await database.db.delete(users).where(eq(users.id, ownerId));
      if (listenerId) await database.db.delete(users).where(eq(users.id, listenerId));
      await database.close();
    }
  },
);
