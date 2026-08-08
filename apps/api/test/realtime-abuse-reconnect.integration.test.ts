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
  private closed = false;

  constructor(private readonly socket: Socket, initialData: Buffer) {
    socket.on('error', () => undefined);
    socket.on('data', (chunk: Buffer) => this.receive(chunk));
    socket.on('close', () => this.finishClose());
    if (initialData.length > 0) this.receive(initialData);
  }

  private finishClose(): void {
    if (this.closed) return;
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('The realtime socket closed.'));
    }
  }

  private receive(chunk: Buffer): void {
    for (const frame of this.parser.push(chunk)) {
      if (frame.type === 'ping') {
        if (!this.socket.destroyed && !this.socket.writableEnded) {
          this.socket.write(encodeWebSocketFrame(0xa, frame.payload, true));
        }
        continue;
      }
      if (frame.type === 'close') {
        this.finishClose();
        this.socket.destroy();
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
    assert.equal(this.closed, false);
    assert.equal(this.socket.destroyed, false);
    this.socket.write(encodeWebSocketFrame(0x1, JSON.stringify(message), true));
  }

  waitFor(predicate: (message: JsonMessage) => boolean, timeoutMs = 5_000): Promise<JsonMessage> {
    const queuedIndex = this.queue.findIndex(predicate);
    if (queuedIndex >= 0) {
      const [message] = this.queue.splice(queuedIndex, 1);
      assert.ok(message);
      return Promise.resolve(message);
    }
    if (this.closed) return Promise.reject(new Error('The realtime socket was already closed.'));

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
    this.finishClose();
    this.socket.destroy();
  }
}

async function upgrade(
  address: string,
  cookie?: string,
): Promise<{ statusCode: number; client?: Client }> {
  const url = new URL(address);
  const socket = net.createConnection({ host: url.hostname, port: Number(url.port) });
  const key = randomBytes(16).toString('base64');
  const cookieHeader = cookie ? `Cookie: ${cookie}\r\n` : '';

  return new Promise((resolve, reject) => {
    let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    const onError = (error: Error) => reject(error);
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const boundary = buffer.indexOf('\r\n\r\n');
      if (boundary < 0) return;

      socket.off('data', onData);
      socket.off('error', onError);
      const headers = buffer.subarray(0, boundary).toString('utf8');
      const statusCode = Number(headers.match(/^HTTP\/1\.1 (\d{3})/)?.[1]);
      const remaining = Buffer.from(buffer.subarray(boundary + 4));
      if (statusCode !== 101) {
        socket.destroy();
        resolve({ statusCode });
        return;
      }
      assert.match(headers, new RegExp(`Sec-WebSocket-Protocol: ${REALTIME_PROTOCOL}`, 'i'));
      resolve({ statusCode, client: new Client(socket, remaining) });
    };

    socket.once('error', onError);
    socket.on('data', onData);
    socket.once('connect', () => {
      socket.write(
        'GET /api/v1/realtime HTTP/1.1\r\n' +
          `Host: ${url.hostname}:${url.port}\r\n` +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Key: ${key}\r\n` +
          'Sec-WebSocket-Version: 13\r\n' +
          `Sec-WebSocket-Protocol: ${REALTIME_PROTOCOL}\r\n` +
          cookieHeader +
          '\r\n',
      );
    });
  });
}

function event(type: string, requestId?: string) {
  return (message: JsonMessage) =>
    message.type === type && (requestId === undefined || message.requestId === requestId);
}

function errorCode(message: JsonMessage): string | undefined {
  return (message.error as JsonMessage | undefined)?.code as string | undefined;
}

test(
  'realtime reconnect starts from server truth and unauthorized rooms stay private',
  { skip: !databaseUrl, timeout: 90_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({
      database,
      realtime: {
        heartbeatIntervalMs: 5_000,
        sessionCheckIntervalMs: 1_000,
      },
    });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'Realtime-reconnect-test-123!';
    const clients: Client[] = [];
    let organisationId = '';
    let ownerId = '';
    let listenerId = '';

    try {
      const ownerRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `rt-reconnect-owner-${suffix}@example.test`,
          displayName: 'Reconnect Owner',
          password,
        },
      });
      const listenerRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `rt-reconnect-listener-${suffix}@example.test`,
          displayName: 'Reconnect Listener',
          password,
        },
      });
      assert.equal(ownerRegistration.statusCode, 201);
      assert.equal(listenerRegistration.statusCode, 201);
      ownerId = ownerRegistration.json().user.id;
      listenerId = listenerRegistration.json().user.id;
      const listenerCookie = responseCookie(listenerRegistration);

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Reconnect Network',
          slug: `reconnect-${suffix}`,
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

      const [publicChannel, privateChannel] = await Promise.all([
        database.db.insert(channels).values({
          organisationId,
          name: 'Reconnect public',
          slug: `reconnect-public-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: ownerId,
        }).returning().then(([row]) => row),
        database.db.insert(channels).values({
          organisationId,
          name: 'Reconnect private',
          slug: `reconnect-private-${suffix}`,
          status: 'active',
          visibility: 'private',
          createdByUserId: ownerId,
        }).returning().then(([row]) => row),
      ]);
      assert.ok(publicChannel);
      assert.ok(privateChannel);

      const [publicBroadcast, privateBroadcast] = await Promise.all([
        database.db.insert(broadcastRecords).values({
          organisationId,
          channelId: publicChannel.id,
          createdByUserId: ownerId,
          title: 'Reconnect public broadcast',
          slug: `reconnect-public-live-${suffix}`,
          status: 'live',
          contributionRoomName: `reconnect-public-room-${suffix}`,
          deliveryStreamName: `reconnect-public-stream-${suffix}`,
        }).returning().then(([row]) => row),
        database.db.insert(broadcastRecords).values({
          organisationId,
          channelId: privateChannel.id,
          createdByUserId: ownerId,
          title: 'Reconnect private broadcast',
          slug: `reconnect-private-live-${suffix}`,
          status: 'live',
          contributionRoomName: `reconnect-private-room-${suffix}`,
          deliveryStreamName: `reconnect-private-stream-${suffix}`,
        }).returning().then(([row]) => row),
      ]);
      assert.ok(publicBroadcast);
      assert.ok(privateBroadcast);

      const address = await app.listen({ host: '127.0.0.1', port: 0 });
      assert.equal((await upgrade(address)).statusCode, 401);

      const firstUpgrade = await upgrade(address, listenerCookie);
      assert.equal(firstUpgrade.statusCode, 101);
      assert.ok(firstUpgrade.client);
      clients.push(firstUpgrade.client);
      const firstConnected = await firstUpgrade.client.waitFor(event('realtime.connected'));
      assert.deepEqual(firstConnected.rooms, [
        { key: `user:${listenerId}`, kind: 'user', id: listenerId },
      ]);

      const publicRoom = {
        kind: 'broadcast',
        id: publicBroadcast.id,
        organisationId,
      };
      firstUpgrade.client.send({ type: 'join', requestId: 'first-public-join', room: publicRoom });
      await firstUpgrade.client.waitFor(event('room.joined', 'first-public-join'));
      firstUpgrade.client.close();

      const reconnectUpgrade = await upgrade(address, listenerCookie);
      assert.equal(reconnectUpgrade.statusCode, 101);
      assert.ok(reconnectUpgrade.client);
      clients.push(reconnectUpgrade.client);
      const reconnected = await reconnectUpgrade.client.waitFor(event('realtime.connected'));
      assert.deepEqual(reconnected.rooms, [
        { key: `user:${listenerId}`, kind: 'user', id: listenerId },
      ]);

      reconnectUpgrade.client.send({
        type: 'typing.set',
        requestId: 'stale-room-interaction',
        room: publicRoom,
        active: true,
      });
      const staleRoom = await reconnectUpgrade.client.waitFor(
        event('realtime.error', 'stale-room-interaction'),
      );
      assert.equal(errorCode(staleRoom), 'REALTIME_INTERACTION_ROOM_REQUIRED');

      reconnectUpgrade.client.send({ type: 'join', requestId: 'rejoin-public', room: publicRoom });
      await reconnectUpgrade.client.waitFor(event('room.joined', 'rejoin-public'));
      reconnectUpgrade.client.send({
        type: 'reaction.send',
        requestId: 'reaction-after-rejoin',
        room: publicRoom,
        reaction: '👍',
      });
      await reconnectUpgrade.client.waitFor(event('reaction.sent', 'reaction-after-rejoin'));

      reconnectUpgrade.client.send({
        type: 'join',
        requestId: 'private-room',
        room: { kind: 'broadcast', id: privateBroadcast.id, organisationId },
      });
      const privateRoomError = await reconnectUpgrade.client.waitFor(
        event('realtime.error', 'private-room'),
      );
      assert.equal(errorCode(privateRoomError), 'REALTIME_ROOM_NOT_AVAILABLE');
      assert.equal((privateRoomError.error as JsonMessage).message, 'The requested room is unavailable.');

      reconnectUpgrade.client.send({
        type: 'join',
        requestId: 'organisation-room',
        room: { kind: 'organisation', id: organisationId },
      });
      const organisationError = await reconnectUpgrade.client.waitFor(
        event('realtime.error', 'organisation-room'),
      );
      assert.equal(errorCode(organisationError), 'REALTIME_ROOM_NOT_AVAILABLE');
      assert.equal((organisationError.error as JsonMessage).message, 'The requested room is unavailable.');
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

test(
  'realtime command abuse is bounded and invalid commands do not widen room access',
  { skip: !databaseUrl, timeout: 90_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({
      database,
      realtime: {
        heartbeatIntervalMs: 5_000,
        maxMessagesPerWindow: 5,
        messageWindowMs: 10_000,
      },
    });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'Realtime-abuse-test-123!';
    let userId = '';
    const clients: Client[] = [];

    try {
      const registration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `rt-abuse-${suffix}@example.test`,
          displayName: 'Realtime Abuse Test',
          password,
        },
      });
      assert.equal(registration.statusCode, 201);
      userId = registration.json().user.id;
      const address = await app.listen({ host: '127.0.0.1', port: 0 });
      const upgraded = await upgrade(address, responseCookie(registration));
      assert.equal(upgraded.statusCode, 101);
      assert.ok(upgraded.client);
      clients.push(upgraded.client);
      await upgraded.client.waitFor(event('realtime.connected'));

      upgraded.client.send({ type: 'not-supported', requestId: 'unsupported' });
      const unsupported = await upgraded.client.waitFor(event('realtime.error', 'unsupported'));
      assert.equal(errorCode(unsupported), 'UNSUPPORTED_REALTIME_COMMAND');

      upgraded.client.send({
        type: 'join',
        requestId: 'arbitrary-room',
        room: { kind: 'broadcast', id: 'not-a-uuid', organisationId: 'not-a-uuid' },
      });
      const invalidRoom = await upgraded.client.waitFor(event('realtime.error', 'arbitrary-room'));
      assert.equal(errorCode(invalidRoom), 'INVALID_REALTIME_ROOM');

      for (let index = 0; index < 3; index += 1) {
        const requestId = `allowed-ping-${index}`;
        upgraded.client.send({ type: 'ping', requestId });
        await upgraded.client.waitFor(event('realtime.pong', requestId));
      }

      upgraded.client.send({ type: 'ping', requestId: 'over-limit' });
      const limited = await upgraded.client.waitFor(
        (message) => message.type === 'realtime.error' && errorCode(message) === 'REALTIME_RATE_LIMITED',
      );
      assert.equal(errorCode(limited), 'REALTIME_RATE_LIMITED');
    } finally {
      for (const client of clients) client.close();
      await app.close();
      if (userId) await database.db.delete(users).where(eq(users.id, userId));
      await database.close();
    }
  },
);
