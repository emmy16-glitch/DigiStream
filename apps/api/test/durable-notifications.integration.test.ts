import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { count, eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { channels, organisationMemberships, organisations, users } from '../src/db/schema.js';
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
import { broadcastChatMessages } from '../src/modules/chat/broadcast-chat.schema.js';
import { userNotifications } from '../src/modules/notifications/notifications.schema.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'targeted chat moderation persists a durable notification before delivery',
  { skip: !databaseUrl, timeout: 90_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database, realtime: false });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'Durable-notification-password-123!';
    const userIds: string[] = [];
    let organisationId = '';

    try {
      const register = async (label: string) => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          payload: {
            email: `notification-${label}-${suffix}@example.test`,
            displayName: `Notification ${label}`,
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

      const [organisation] = await database.db.insert(organisations).values({
        name: 'Notification Network',
        slug: `notification-${suffix}`,
        createdByUserId: owner.userId,
      }).returning();
      assert.ok(organisation);
      organisationId = organisation.id;

      await database.db.insert(organisationMemberships).values({
        organisationId,
        userId: owner.userId,
        role: 'owner',
      });

      const [channel] = await database.db.insert(channels).values({
        organisationId,
        name: 'Notification channel',
        slug: `notification-channel-${suffix}`,
        status: 'active',
        visibility: 'public',
        createdByUserId: owner.userId,
      }).returning();
      assert.ok(channel);

      const [broadcast] = await database.db.insert(broadcastRecords).values({
        organisationId,
        channelId: channel.id,
        createdByUserId: owner.userId,
        title: 'Notification broadcast',
        slug: `notification-broadcast-${suffix}`,
        status: 'live',
        contributionRoomName: `notification-room-${suffix}`,
        deliveryStreamName: `notification-stream-${suffix}`,
      }).returning();
      assert.ok(broadcast);

      await database.db.insert(broadcastChatMessages).values({
        organisationId,
        broadcastId: broadcast.id,
        authorUserId: listener.userId,
        authorDisplayName: 'Notification Listener',
        clientMessageId: randomUUID(),
        body: 'A message that establishes chat participation.',
      });

      const path = `/api/v1/organisations/${organisationId}/broadcasts/${broadcast.id}/chat/moderation/users/${listener.userId}`;
      const rejected = await app.inject({
        method: 'PUT',
        url: path,
        headers: { cookie: outsider.cookie },
        payload: { action: 'mute', durationSeconds: 60 },
      });
      assert.equal(rejected.statusCode, 404);

      const [before] = await database.db.select({ value: count() }).from(userNotifications).where(eq(userNotifications.userId, listener.userId));
      assert.equal(before?.value, 0);

      const muted = await app.inject({
        method: 'PUT',
        url: path,
        headers: { cookie: owner.cookie },
        payload: { action: 'mute', durationSeconds: 60 },
      });
      assert.equal(muted.statusCode, 200);

      const rows = await database.db.select().from(userNotifications).where(eq(userNotifications.userId, listener.userId));
      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.type, 'chat.moderation.updated');
      assert.equal(rows[0]?.title, 'Live chat moderation updated');
      assert.equal((rows[0]?.metadata as { broadcastId?: string }).broadcastId, broadcast.id);
      assert.equal((rows[0]?.metadata as { restriction?: { userId?: string } }).restriction?.userId, listener.userId);
    } finally {
      await app.close();
      if (organisationId) {
        await database.db.delete(organisations).where(eq(organisations.id, organisationId));
      }
      for (const userId of userIds) {
        await database.db.delete(users).where(eq(users.id, userId));
      }
      await database.close();
    }
  },
);
