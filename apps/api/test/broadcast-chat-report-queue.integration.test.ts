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
  'chat report queue is tenant-safe, role-gated and cursor-paginated',
  { skip: !databaseUrl, timeout: 90_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database, realtime: false });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'Report-queue-password-123!';
    const userIds: string[] = [];
    let organisationId = '';

    try {
      const register = async (label: string) => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          payload: {
            email: `report-queue-${label}-${suffix}@example.test`,
            displayName: `Queue ${label}`,
            password,
          },
        });
        assert.equal(response.statusCode, 201);
        const userId = response.json().user.id as string;
        userIds.push(userId);
        return { userId, cookie: responseCookie(response) };
      };

      const owner = await register('Owner');
      const moderator = await register('Moderator');
      const analyst = await register('Analyst');
      const listener = await register('Listener');
      const reporterTwo = await register('ReporterTwo');
      const outsider = await register('Outsider');

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Queue Test Network',
          slug: `queue-test-${suffix}`,
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(organisation);
      organisationId = organisation.id;

      await database.db.insert(organisationMemberships).values([
        { organisationId, userId: owner.userId, role: 'owner' },
        { organisationId, userId: moderator.userId, role: 'moderator' },
        { organisationId, userId: analyst.userId, role: 'analyst' },
      ]);

      const [channel] = await database.db
        .insert(channels)
        .values({
          organisationId,
          name: 'Queue Test Channel',
          slug: `queue-channel-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(channel);

      const [broadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: channel.id,
          createdByUserId: owner.userId,
          title: 'Queue Test Broadcast',
          slug: `queue-broadcast-${suffix}`,
          status: 'live',
          contributionRoomName: `queue-room-${suffix}`,
          deliveryStreamName: `queue-stream-${suffix}`,
        })
        .returning();
      assert.ok(broadcast);

      const publicMessages =
        `/api/v1/broadcasts/${organisation.slug}/${channel.slug}/${broadcast.slug}/chat/messages`;
      const message = await app.inject({
        method: 'POST',
        url: publicMessages,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: randomUUID(), body: 'Message requiring moderator review.' },
      });
      assert.equal(message.statusCode, 201);
      const messageId = message.json().message.id as string;
      const reportPath = `${publicMessages}/${messageId}/report`;

      for (const [cookie, reason] of [
        [listener.cookie, 'Potential harassment'],
        [reporterTwo.cookie, 'Potentially unsafe content'],
      ] as const) {
        const report = await app.inject({
          method: 'POST',
          url: reportPath,
          headers: { cookie },
          payload: { reason },
        });
        assert.equal(report.statusCode, 201);
      }

      const queuePath = `/api/v1/organisations/${organisationId}/chat/moderation/reports`;

      const unauthenticated = await app.inject({ method: 'GET', url: queuePath });
      assert.equal(unauthenticated.statusCode, 401);
      assert.equal(unauthenticated.json().error.code, 'AUTHENTICATION_REQUIRED');

      const hiddenFromOutsider = await app.inject({
        method: 'GET',
        url: queuePath,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(hiddenFromOutsider.statusCode, 404);
      assert.equal(hiddenFromOutsider.json().error.code, 'ORGANISATION_NOT_FOUND');

      const analystForbidden = await app.inject({
        method: 'GET',
        url: queuePath,
        headers: { cookie: analyst.cookie },
      });
      assert.equal(analystForbidden.statusCode, 403);
      assert.equal(analystForbidden.json().error.code, 'CHAT_MODERATION_FORBIDDEN');

      const firstPage = await app.inject({
        method: 'GET',
        url: `${queuePath}?limit=1`,
        headers: { cookie: moderator.cookie },
      });
      assert.equal(firstPage.statusCode, 200);
      assert.equal(firstPage.headers['cache-control'], 'no-store');
      assert.equal(firstPage.json().reports.length, 1);
      assert.equal(firstPage.json().reports[0].organisationId, organisationId);
      assert.equal(firstPage.json().reports[0].messageId, messageId);
      assert.equal(firstPage.json().reports[0].message.body, 'Message requiring moderator review.');
      assert.equal(firstPage.json().pageInfo.hasMore, true);
      assert.equal(typeof firstPage.json().pageInfo.nextCursor, 'string');

      const secondPage = await app.inject({
        method: 'GET',
        url: `${queuePath}?limit=1&cursor=${encodeURIComponent(firstPage.json().pageInfo.nextCursor)}`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(secondPage.statusCode, 200);
      assert.equal(secondPage.json().reports.length, 1);
      assert.notEqual(secondPage.json().reports[0].id, firstPage.json().reports[0].id);
      assert.equal(secondPage.json().pageInfo.hasMore, false);
      assert.equal(secondPage.json().pageInfo.nextCursor, null);

      const invalidCursor = await app.inject({
        method: 'GET',
        url: `${queuePath}?cursor=not-a-valid-cursor`,
        headers: { cookie: moderator.cookie },
      });
      assert.equal(invalidCursor.statusCode, 400);
      assert.equal(invalidCursor.json().error.code, 'VALIDATION_ERROR');
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
