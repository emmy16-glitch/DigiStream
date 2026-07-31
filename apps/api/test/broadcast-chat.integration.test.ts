import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'durable broadcast chat preserves authorization, idempotency and history',
  { skip: !databaseUrl, timeout: 90_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const app = buildApp({ database, realtime: false });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'Durable-chat-password-123!';
    let organisationId = '';
    const userIds: string[] = [];

    try {
      const register = async (label: string) => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          payload: {
            email: `chat-${label}-${suffix}@example.test`,
            displayName: `Chat ${label}`,
            password,
          },
        });
        assert.equal(response.statusCode, 201);
        const userId = response.json().user.id as string;
        userIds.push(userId);
        return { userId, cookie: responseCookie(response) };
      };

      const owner = await register('Owner');
      const listener = await register('Listener');
      const outsider = await register('Outsider');

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Durable Chat Network',
          slug: `durable-chat-${suffix}`,
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(organisation);
      organisationId = organisation.id;

      await database.db.insert(organisationMemberships).values({
        organisationId,
        userId: owner.userId,
        role: 'owner',
      });

      const [publicChannel] = await database.db
        .insert(channels)
        .values({
          organisationId,
          name: 'Public chat channel',
          slug: `public-chat-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: owner.userId,
        })
        .returning();
      const [privateChannel] = await database.db
        .insert(channels)
        .values({
          organisationId,
          name: 'Private chat channel',
          slug: `private-chat-${suffix}`,
          status: 'active',
          visibility: 'private',
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(publicChannel);
      assert.ok(privateChannel);

      const [publicBroadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: publicChannel.id,
          createdByUserId: owner.userId,
          title: 'Public durable chat',
          slug: `public-durable-${suffix}`,
          status: 'live',
          contributionRoomName: `public-chat-room-${suffix}`,
          deliveryStreamName: `public-chat-stream-${suffix}`,
        })
        .returning();
      const [completedBroadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: publicChannel.id,
          createdByUserId: owner.userId,
          title: 'Completed durable chat',
          slug: `completed-durable-${suffix}`,
          status: 'completed',
          contributionRoomName: `completed-chat-room-${suffix}`,
          deliveryStreamName: `completed-chat-stream-${suffix}`,
        })
        .returning();
      const [privateBroadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: privateChannel.id,
          createdByUserId: owner.userId,
          title: 'Private durable chat',
          slug: `private-durable-${suffix}`,
          status: 'live',
          contributionRoomName: `private-chat-room-${suffix}`,
          deliveryStreamName: `private-chat-stream-${suffix}`,
        })
        .returning();
      assert.ok(publicBroadcast);
      assert.ok(completedBroadcast);
      assert.ok(privateBroadcast);

      const publicPath =
        `/api/v1/broadcasts/${organisation.slug}/${publicChannel.slug}/` +
        `${publicBroadcast.slug}/chat/messages`;
      const completedPath =
        `/api/v1/broadcasts/${organisation.slug}/${publicChannel.slug}/` +
        `${completedBroadcast.slug}/chat/messages`;
      const privatePath =
        `/api/v1/organisations/${organisationId}/broadcasts/` +
        `${privateBroadcast.id}/chat/messages`;

      const unauthenticated = await app.inject({
        method: 'GET',
        url: publicPath,
      });
      assert.equal(unauthenticated.statusCode, 401);

      const emptyHistory = await app.inject({
        method: 'GET',
        url: publicPath,
        headers: { cookie: listener.cookie },
      });
      assert.equal(emptyHistory.statusCode, 200);
      assert.deepEqual(emptyHistory.json().messages, []);
      assert.equal(emptyHistory.json().chat.canSend, true);
      assert.equal(emptyHistory.headers['cache-control'], 'no-store');

      const invalidClientId = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: 'not-a-uuid', body: 'Hello' },
      });
      assert.equal(invalidClientId.statusCode, 400);
      assert.equal(
        invalidClientId.json().error.code,
        'CHAT_CLIENT_MESSAGE_ID_INVALID',
      );

      const clientId = randomUUID();
      const created = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: clientId, body: 'Hello from the listener' },
      });
      assert.equal(created.statusCode, 201);
      assert.equal(created.json().replayed, false);
      assert.equal(created.json().message.clientMessageId, clientId);
      assert.equal(created.json().message.author.id, listener.userId);

      const replayed = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: clientId, body: 'Hello from the listener' },
      });
      assert.equal(replayed.statusCode, 200);
      assert.equal(replayed.json().replayed, true);
      assert.equal(replayed.json().message.id, created.json().message.id);

      const conflict = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: clientId, body: 'Different content' },
      });
      assert.equal(conflict.statusCode, 409);
      assert.equal(conflict.json().error.code, 'CHAT_IDEMPOTENCY_CONFLICT');

      for (const body of ['Second message', 'Third message']) {
        const response = await app.inject({
          method: 'POST',
          url: publicPath,
          headers: { cookie: owner.cookie },
          payload: { clientMessageId: randomUUID(), body },
        });
        assert.equal(response.statusCode, 201);
      }

      const firstPage = await app.inject({
        method: 'GET',
        url: `${publicPath}?limit=2`,
        headers: { cookie: listener.cookie },
      });
      assert.equal(firstPage.statusCode, 200);
      assert.equal(firstPage.json().messages.length, 2);
      assert.equal(firstPage.json().pageInfo.hasMore, true);
      assert.equal(typeof firstPage.json().pageInfo.nextCursor, 'string');
      assert.deepEqual(
        firstPage.json().messages.map((message: { body: string }) => message.body),
        ['Second message', 'Third message'],
      );

      const olderPage = await app.inject({
        method: 'GET',
        url:
          `${publicPath}?limit=2&before=` +
          encodeURIComponent(firstPage.json().pageInfo.nextCursor),
        headers: { cookie: listener.cookie },
      });
      assert.equal(olderPage.statusCode, 200);
      assert.deepEqual(
        olderPage.json().messages.map((message: { body: string }) => message.body),
        ['Hello from the listener'],
      );
      assert.equal(olderPage.json().pageInfo.hasMore, false);

      const outsiderPrivate = await app.inject({
        method: 'GET',
        url: privatePath,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(outsiderPrivate.statusCode, 404);
      assert.equal(outsiderPrivate.json().error.code, 'CHAT_NOT_AVAILABLE');

      const ownerPrivate = await app.inject({
        method: 'POST',
        url: privatePath,
        headers: { cookie: owner.cookie },
        payload: {
          clientMessageId: randomUUID(),
          body: 'Private member message',
        },
      });
      assert.equal(ownerPrivate.statusCode, 201);

      const completedHistory = await app.inject({
        method: 'GET',
        url: completedPath,
        headers: { cookie: listener.cookie },
      });
      assert.equal(completedHistory.statusCode, 200);
      assert.equal(completedHistory.json().chat.canSend, false);
      assert.equal(completedHistory.json().chat.status, 'completed');

      const completedWrite = await app.inject({
        method: 'POST',
        url: completedPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: randomUUID(), body: 'Too late' },
      });
      assert.equal(completedWrite.statusCode, 409);
      assert.equal(completedWrite.json().error.code, 'CHAT_READ_ONLY');

      const oversized = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: randomUUID(), body: 'x'.repeat(1001) },
      });
      assert.equal(oversized.statusCode, 400);
      assert.equal(oversized.json().error.code, 'CHAT_MESSAGE_INVALID');
    } finally {
      await app.close();
      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }
      for (const userId of userIds) {
        await database.db.delete(users).where(eq(users.id, userId));
      }
      await database.close();
    }
  },
);
