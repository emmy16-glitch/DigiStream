import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { users } from '../src/db/schema.js';
import { persistNotificationBeforeDelivery } from '../src/modules/notifications/notifications.repository.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'notification inbox is user-owned, cursor-paginated, idempotently readable and archivable',
  { skip: !databaseUrl, timeout: 90_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database, realtime: false });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'Notification-inbox-password-123!';
    const userIds: string[] = [];

    try {
      const register = async (label: string) => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          payload: {
            email: `inbox-${label.toLowerCase()}-${suffix}@example.test`,
            displayName: `Inbox ${label}`,
            password,
          },
        });
        assert.equal(response.statusCode, 201);
        const userId = response.json().user.id as string;
        userIds.push(userId);
        return { userId, cookie: responseCookie(response) };
      };

      const owner = await register('Owner');
      const outsider = await register('Outsider');

      const unauthenticated = await app.inject({ method: 'GET', url: '/api/v1/notifications' });
      assert.equal(unauthenticated.statusCode, 401);
      assert.equal(unauthenticated.json().error.code, 'AUTHENTICATION_REQUIRED');

      const created = [];
      for (let index = 0; index < 4; index += 1) {
        created.push(
          await persistNotificationBeforeDelivery(database.db, {
            userId: owner.userId,
            type: 'test.notification',
            title: `Owner notification ${index + 1}`,
            body: `Owner notification body ${index + 1}`,
            metadata: { sequence: index + 1 },
          }),
        );
      }
      await persistNotificationBeforeDelivery(database.db, {
        userId: outsider.userId,
        type: 'test.notification',
        title: 'Outsider notification',
        body: 'This must never appear in the owner inbox.',
      });

      // PostgreSQL can retain microseconds while a JavaScript Date cursor retains
      // milliseconds. Force four distinct database timestamps into one JS millisecond
      // so pagination proves it cannot skip a sub-millisecond sibling row.
      for (let index = 0; index < created.length; index += 1) {
        await database.pool.query(
          `update user_notifications
              set created_at = $2::timestamptz
            where id = $1`,
          [created[index]!.id, `2026-08-08T19:00:00.123${index + 1}00Z`],
        );
      }

      const firstPage = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?limit=2',
        headers: { cookie: owner.cookie },
      });
      assert.equal(firstPage.statusCode, 200);
      assert.equal(firstPage.headers['cache-control'], 'no-store');
      assert.equal(firstPage.json().notifications.length, 2);
      assert.equal(firstPage.json().unreadCount, 4);
      assert.equal(typeof firstPage.json().nextCursor, 'string');
      assert.equal(
        firstPage.json().notifications.some((item: { title: string }) => item.title === 'Outsider notification'),
        false,
      );

      const secondPage = await app.inject({
        method: 'GET',
        url: `/api/v1/notifications?limit=2&before=${encodeURIComponent(firstPage.json().nextCursor)}`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(secondPage.statusCode, 200);
      assert.equal(secondPage.json().notifications.length, 2);
      const firstIds = new Set(firstPage.json().notifications.map((item: { id: string }) => item.id));
      for (const item of secondPage.json().notifications as Array<{ id: string }>) {
        assert.equal(firstIds.has(item.id), false);
      }
      const pagedIds = new Set([
        ...firstPage.json().notifications.map((item: { id: string }) => item.id),
        ...secondPage.json().notifications.map((item: { id: string }) => item.id),
      ]);
      assert.deepEqual(pagedIds, new Set(created.map((item) => item.id)));

      const invalidCursor = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?before=not-a-cursor',
        headers: { cookie: owner.cookie },
      });
      assert.equal(invalidCursor.statusCode, 400);
      assert.equal(invalidCursor.json().error.code, 'NOTIFICATION_CURSOR_INVALID');

      const targetId = created[0]!.id;
      const read = await app.inject({
        method: 'PUT',
        url: `/api/v1/notifications/${targetId}/read`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(read.statusCode, 200);
      assert.equal(typeof read.json().notification.readAt, 'string');
      const firstReadAt = read.json().notification.readAt;

      const replayRead = await app.inject({
        method: 'PUT',
        url: `/api/v1/notifications/${targetId}/read`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(replayRead.statusCode, 200);
      assert.equal(replayRead.json().notification.readAt, firstReadAt);

      const crossUserRead = await app.inject({
        method: 'PUT',
        url: `/api/v1/notifications/${targetId}/read`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(crossUserRead.statusCode, 404);
      assert.equal(crossUserRead.json().error.code, 'NOTIFICATION_NOT_FOUND');

      const archive = await app.inject({
        method: 'DELETE',
        url: `/api/v1/notifications/${targetId}`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(archive.statusCode, 200);
      assert.equal(typeof archive.json().notification.archivedAt, 'string');
      const firstArchivedAt = archive.json().notification.archivedAt;

      const replayArchive = await app.inject({
        method: 'DELETE',
        url: `/api/v1/notifications/${targetId}`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(replayArchive.statusCode, 200);
      assert.equal(replayArchive.json().notification.archivedAt, firstArchivedAt);

      const activeInbox = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?limit=100',
        headers: { cookie: owner.cookie },
      });
      assert.equal(activeInbox.statusCode, 200);
      assert.equal(activeInbox.json().notifications.length, 3);
      assert.equal(activeInbox.json().unreadCount, 3);

      const archivedInbox = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?limit=100&includeArchived=true',
        headers: { cookie: owner.cookie },
      });
      assert.equal(archivedInbox.statusCode, 200);
      assert.equal(archivedInbox.json().notifications.length, 4);
    } finally {
      await app.close();
      for (const userId of userIds) {
        await database.db.delete(users).where(eq(users.id, userId));
      }
      await database.close();
    }
  },
);

test(
  'notification realtime preference persists while durable inbox remains authoritative',
  { skip: !databaseUrl, timeout: 90_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database, realtime: false });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'Notification-preference-password-123!';
    let userId = '';

    try {
      const registration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `preference-${suffix}@example.test`,
          displayName: 'Preference User',
          password,
        },
      });
      assert.equal(registration.statusCode, 201);
      userId = registration.json().user.id;
      const cookie = responseCookie(registration);

      const defaults = await app.inject({
        method: 'GET',
        url: '/api/v1/notification-preferences',
        headers: { cookie },
      });
      assert.equal(defaults.statusCode, 200);
      assert.deepEqual(defaults.json().preferences, {
        realtimeDeliveryEnabled: true,
        updatedAt: null,
      });

      const invalid = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notification-preferences',
        headers: { cookie },
        payload: { realtimeDeliveryEnabled: 'false' },
      });
      assert.equal(invalid.statusCode, 400);
      assert.equal(invalid.json().error.code, 'NOTIFICATION_PREFERENCES_INVALID');

      const disabled = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notification-preferences',
        headers: { cookie },
        payload: { realtimeDeliveryEnabled: false },
      });
      assert.equal(disabled.statusCode, 200);
      assert.equal(disabled.json().preferences.realtimeDeliveryEnabled, false);
      assert.equal(typeof disabled.json().preferences.updatedAt, 'string');

      await persistNotificationBeforeDelivery(database.db, {
        userId,
        type: 'test.preference',
        title: 'Durable truth remains',
        body: 'This notification remains available even when immediate delivery is disabled.',
      });

      const afterRefresh = await app.inject({
        method: 'GET',
        url: '/api/v1/notification-preferences',
        headers: { cookie },
      });
      assert.equal(afterRefresh.statusCode, 200);
      assert.equal(afterRefresh.json().preferences.realtimeDeliveryEnabled, false);

      const inbox = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: { cookie },
      });
      assert.equal(inbox.statusCode, 200);
      assert.equal(inbox.json().notifications.length, 1);
      assert.equal(inbox.json().notifications[0].title, 'Durable truth remains');
      assert.equal(inbox.json().unreadCount, 1);
    } finally {
      await app.close();
      if (userId) await database.db.delete(users).where(eq(users.id, userId));
      await database.close();
    }
  },
);
