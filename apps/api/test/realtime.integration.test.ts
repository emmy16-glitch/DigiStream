import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import net, { type Socket } from 'node:net';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  authSessions,
  channels,
  organisationMemberships,
  organisations,
  users,
} from '../src/db/schema.js';
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
import {
  REALTIME_PROTOCOL,
  type RealtimeServerOptions,
} from '../src/modules/realtime/realtime.server.js';
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

class TestRealtimeClient {
  private readonly parser = new WebSocketFrameParser({
    maxMessageBytes: 64 * 1024,
    expectMasked: false,
  });
  private readonly queued: JsonMessage[] = [];
  private readonly waiters: Array<{
    predicate: (message: JsonMessage) => boolean;
    resolve: (message: JsonMessage) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];
  private closed = false;

  constructor(
    private readonly socket: Socket,
    initialData: Buffer,
  ) {
    socket.on('data', (chunk: Buffer) => this.receive(chunk));
    socket.on('close', () => {
      this.closed = true;
      for (const waiter of this.waiters.splice(0)) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error('The realtime socket closed.'));
      }
    });
    if (initialData.length > 0) this.receive(initialData);
  }

  private receive(chunk: Buffer): void {
    for (const frame of this.parser.push(chunk)) {
      if (frame.type === 'ping') {
        this.socket.write(encodeWebSocketFrame(0xa, frame.payload, true));
        continue;
      }
      if (frame.type === 'close') {
        if (!this.closed) {
          this.socket.write(encodeWebSocketFrame(0x8, frame.payload, true));
          this.socket.end();
        }
        continue;
      }
      if (frame.type !== 'text') continue;

      const message = JSON.parse(frame.text) as JsonMessage;
      const waiterIndex = this.waiters.findIndex((waiter) =>
        waiter.predicate(message),
      );
      if (waiterIndex >= 0) {
        const [waiter] = this.waiters.splice(waiterIndex, 1);
        if (waiter) {
          clearTimeout(waiter.timer);
          waiter.resolve(message);
        }
      } else {
        this.queued.push(message);
      }
    }
  }

  send(message: JsonMessage): void {
    this.socket.write(
      encodeWebSocketFrame(0x1, JSON.stringify(message), true),
    );
  }

  waitFor(
    predicate: (message: JsonMessage) => boolean,
    timeoutMs = 5_000,
  ): Promise<JsonMessage> {
    const queuedIndex = this.queued.findIndex(predicate);
    if (queuedIndex >= 0) {
      const [message] = this.queued.splice(queuedIndex, 1);
      assert.ok(message);
      return Promise.resolve(message);
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.findIndex((waiter) => waiter.timer === timer);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new Error('Timed out waiting for a realtime message.'));
      }, timeoutMs);
      this.waiters.push({ predicate, resolve, reject, timer });
    });
  }

  close(): void {
    if (this.closed || this.socket.destroyed) return;
    this.closed = true;
    this.socket.write(encodeWebSocketFrame(0x8, Buffer.from([0x03, 0xe8]), true));
    this.socket.end();
  }
}

async function upgrade(
  address: string,
  cookie?: string,
): Promise<{ statusCode: number; client?: TestRealtimeClient }> {
  const url = new URL(address);
  const port = Number(url.port);
  const host = url.hostname;
  const socket = net.createConnection({ host, port });
  const key = randomBytes(16).toString('base64');
  const cookieHeader = cookie ? `Cookie: ${cookie}\r\n` : '';

  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const onError = (error: Error) => reject(error);
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const boundary = buffer.indexOf('\r\n\r\n');
      if (boundary < 0) return;

      socket.off('data', onData);
      socket.off('error', onError);
      const headerText = buffer.subarray(0, boundary).toString('utf8');
      const statusCode = Number(headerText.match(/^HTTP\/1\.1 (\d{3})/)?.[1]);
      const remaining = buffer.subarray(boundary + 4);
      if (statusCode !== 101) {
        socket.destroy();
        resolve({ statusCode });
        return;
      }

      assert.match(headerText, new RegExp(`Sec-WebSocket-Protocol: ${REALTIME_PROTOCOL}`, 'i'));
      resolve({
        statusCode,
        client: new TestRealtimeClient(socket, remaining),
      });
    };

    socket.once('error', onError);
    socket.on('data', onData);
    socket.once('connect', () => {
      socket.write(
        'GET /api/v1/realtime HTTP/1.1\r\n' +
          `Host: ${host}:${port}\r\n` +
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

function messageType(type: string) {
  return (message: JsonMessage) => message.type === type;
}

function requestMessage(type: string, requestId: string) {
  return (message: JsonMessage) =>
    message.type === type && message.requestId === requestId;
}

test(
  'realtime connections authenticate sessions and isolate server-authorized rooms',
  { skip: !databaseUrl, timeout: 90_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const realtime: RealtimeServerOptions = {
      heartbeatIntervalMs: 1_000,
      sessionCheckIntervalMs: 1_000,
      maxConnectionsPerUser: 5,
    };
    const app = buildApp({ database, realtime });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'Realtime-test-password-123!';
    const ownerEmail = `realtime-owner-${suffix}@example.test`;
    const outsiderEmail = `realtime-outsider-${suffix}@example.test`;
    let organisationId = '';
    let ownerId = '';
    let outsiderId = '';
    const clients: TestRealtimeClient[] = [];

    try {
      const ownerRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: ownerEmail,
          displayName: 'Realtime Owner',
          password,
        },
      });
      assert.equal(ownerRegistration.statusCode, 201);
      ownerId = ownerRegistration.json().user.id;
      const ownerCookie = responseCookie(ownerRegistration);

      const outsiderRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: outsiderEmail,
          displayName: 'Realtime Outsider',
          password,
        },
      });
      assert.equal(outsiderRegistration.statusCode, 201);
      outsiderId = outsiderRegistration.json().user.id;
      const outsiderCookie = responseCookie(outsiderRegistration);

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Realtime Network',
          slug: `realtime-${suffix}`,
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

      const [publicChannel] = await database.db
        .insert(channels)
        .values({
          organisationId,
          name: 'Public realtime channel',
          slug: `public-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: ownerId,
        })
        .returning();
      const [privateChannel] = await database.db
        .insert(channels)
        .values({
          organisationId,
          name: 'Private realtime channel',
          slug: `private-${suffix}`,
          status: 'active',
          visibility: 'private',
          createdByUserId: ownerId,
        })
        .returning();
      assert.ok(publicChannel);
      assert.ok(privateChannel);

      const [publicBroadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: publicChannel.id,
          createdByUserId: ownerId,
          title: 'Public realtime broadcast',
          slug: `public-live-${suffix}`,
          status: 'live',
          contributionRoomName: `public-room-${suffix}`,
          deliveryStreamName: `public-stream-${suffix}`,
        })
        .returning();
      const [privateBroadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: privateChannel.id,
          createdByUserId: ownerId,
          title: 'Private realtime broadcast',
          slug: `private-live-${suffix}`,
          status: 'live',
          contributionRoomName: `private-room-${suffix}`,
          deliveryStreamName: `private-stream-${suffix}`,
        })
        .returning();
      assert.ok(publicBroadcast);
      assert.ok(privateBroadcast);

      const address = await app.listen({ host: '127.0.0.1', port: 0 });

      const unauthenticated = await upgrade(address);
      assert.equal(unauthenticated.statusCode, 401);

      const ownerUpgrade = await upgrade(address, ownerCookie);
      assert.equal(ownerUpgrade.statusCode, 101);
      assert.ok(ownerUpgrade.client);
      clients.push(ownerUpgrade.client);
      const ownerConnected = await ownerUpgrade.client.waitFor(
        messageType('realtime.connected'),
      );
      assert.equal((ownerConnected.user as JsonMessage).id, ownerId);
      assert.deepEqual(ownerConnected.rooms, [
        { key: `user:${ownerId}`, kind: 'user', id: ownerId },
      ]);

      const secondOwnerUpgrade = await upgrade(address, ownerCookie);
      assert.ok(secondOwnerUpgrade.client);
      clients.push(secondOwnerUpgrade.client);
      const secondOwnerConnected = await secondOwnerUpgrade.client.waitFor(
        messageType('realtime.connected'),
      );
      assert.notEqual(
        secondOwnerConnected.connectionId,
        ownerConnected.connectionId,
      );

      ownerUpgrade.client.send({
        type: 'join',
        requestId: 'owner-org',
        room: { kind: 'organisation', id: organisationId },
      });
      const ownerOrg = await ownerUpgrade.client.waitFor(
        requestMessage('room.joined', 'owner-org'),
      );
      assert.equal((ownerOrg.room as JsonMessage).key, `organisation:${organisationId}`);

      ownerUpgrade.client.send({
        type: 'join',
        requestId: 'owner-private',
        room: {
          kind: 'broadcast',
          id: privateBroadcast.id,
          organisationId,
        },
      });
      await ownerUpgrade.client.waitFor(
        requestMessage('room.joined', 'owner-private'),
      );

      const outsiderUpgrade = await upgrade(address, outsiderCookie);
      assert.ok(outsiderUpgrade.client);
      clients.push(outsiderUpgrade.client);
      await outsiderUpgrade.client.waitFor(messageType('realtime.connected'));

      outsiderUpgrade.client.send({
        type: 'join',
        requestId: 'other-user',
        room: { kind: 'user', id: ownerId },
      });
      const otherUser = await outsiderUpgrade.client.waitFor(
        requestMessage('realtime.error', 'other-user'),
      );
      assert.equal(
        (otherUser.error as JsonMessage).code,
        'REALTIME_ROOM_NOT_AVAILABLE',
      );

      outsiderUpgrade.client.send({
        type: 'join',
        requestId: 'outsider-org',
        room: { kind: 'organisation', id: organisationId },
      });
      await outsiderUpgrade.client.waitFor(
        requestMessage('realtime.error', 'outsider-org'),
      );

      outsiderUpgrade.client.send({
        type: 'join',
        requestId: 'outsider-public',
        room: {
          kind: 'broadcast',
          id: publicBroadcast.id,
          organisationId,
        },
      });
      const publicJoined = await outsiderUpgrade.client.waitFor(
        requestMessage('room.joined', 'outsider-public'),
      );
      assert.equal((publicJoined.room as JsonMessage).key, `broadcast:${publicBroadcast.id}`);

      outsiderUpgrade.client.send({
        type: 'join',
        requestId: 'outsider-private',
        room: {
          kind: 'broadcast',
          id: privateBroadcast.id,
          organisationId,
        },
      });
      await outsiderUpgrade.client.waitFor(
        requestMessage('realtime.error', 'outsider-private'),
      );

      outsiderUpgrade.client.send({ type: 'ping', requestId: 'client-ping' });
      await outsiderUpgrade.client.waitFor(
        requestMessage('realtime.pong', 'client-ping'),
      );

      outsiderUpgrade.client.send({
        type: 'leave',
        requestId: 'leave-public',
        room: {
          kind: 'broadcast',
          id: publicBroadcast.id,
          organisationId,
        },
      });
      await outsiderUpgrade.client.waitFor(
        requestMessage('room.left', 'leave-public'),
      );

      await database.db
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(eq(authSessions.userId, outsiderId));

      const revokedReconnect = await upgrade(address, outsiderCookie);
      assert.equal(revokedReconnect.statusCode, 401);

      const sessionEnded = await outsiderUpgrade.client.waitFor(
        messageType('realtime.session-ended'),
        5_000,
      );
      assert.equal(
        (sessionEnded.error as JsonMessage).code,
        'AUTHENTICATION_REQUIRED',
      );
    } finally {
      for (const client of clients) client.close();
      await app.close();

      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }
      if (ownerId) await database.db.delete(users).where(eq(users.id, ownerId));
      if (outsiderId) {
        await database.db.delete(users).where(eq(users.id, outsiderId));
      }
      await database.close();
    }
  },
);
