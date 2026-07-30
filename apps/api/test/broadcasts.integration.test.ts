import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  organisationMemberships,
  organisations,
  users,
} from '../src/db/schema.js';
import { channelRecords } from '../src/modules/channels/channels.schema.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'broadcast scheduling and media lifecycle preserve authorization and concurrency',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const mediaSecret = `media-${suffix}-secret`;
    const app = buildApp({ database, mediaControlSecret: mediaSecret });
    const userIds: string[] = [];
    let organisationId: string | undefined;

    async function register(
      label: string,
    ): Promise<{ userId: string; cookie: string }> {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `${label}-${suffix}@example.test`,
          displayName: `${label} User`,
          password,
        },
      });
      assert.equal(response.statusCode, 201);
      const userId = response.json().user.id as string;
      userIds.push(userId);
      return { userId, cookie: responseCookie(response) };
    }

    try {
      const owner = await register('Owner');
      const broadcaster = await register('Broadcaster');
      const analyst = await register('Analyst');
      const stranger = await register('Stranger');

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Broadcast Network',
          slug: `broadcast-network-${suffix}`,
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(organisation);
      organisationId = organisation.id;

      await database.db.insert(organisationMemberships).values([
        {
          organisationId,
          userId: owner.userId,
          role: 'owner',
        },
        {
          organisationId,
          userId: broadcaster.userId,
          role: 'broadcaster',
          invitedByUserId: owner.userId,
        },
        {
          organisationId,
          userId: analyst.userId,
          role: 'analyst',
          invitedByUserId: owner.userId,
        },
      ]);

      const [channel] = await database.db
        .insert(channelRecords)
        .values({
          organisationId,
          name: 'Main Channel',
          slug: `main-${suffix}`,
          description: 'The main public channel.',
          category: 'community',
          status: 'active',
          visibility: 'public',
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(channel);

      const analystCreate = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channel.id}/broadcasts`,
        headers: { cookie: analyst.cookie },
        payload: { title: 'Forbidden Show', slug: `forbidden-${suffix}` },
      });
      assert.equal(analystCreate.statusCode, 403);

      const creation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channel.id}/broadcasts`,
        headers: { cookie: broadcaster.cookie },
        payload: {
          title: 'Community Live',
          slug: `community-live-${suffix}`,
          description: 'A live community programme.',
        },
      });
      assert.equal(creation.statusCode, 201);
      assert.equal(creation.json().broadcast.status, 'draft');
      assert.equal(creation.json().broadcast.lifecycleVersion, 0);
      const broadcastId = creation.json().broadcast.id as string;
      const broadcastSlug = creation.json().broadcast.slug as string;

      const duplicate = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channel.id}/broadcasts`,
        headers: { cookie: broadcaster.cookie },
        payload: {
          title: 'Duplicate',
          slug: broadcastSlug,
        },
      });
      assert.equal(duplicate.statusCode, 409);

      const update = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}`,
        headers: { cookie: broadcaster.cookie },
        payload: {
          title: 'Community Live Updated',
          expectedVersion: 0,
        },
      });
      assert.equal(update.statusCode, 200);
      assert.equal(update.json().broadcast.lifecycleVersion, 1);

      const staleUpdate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}`,
        headers: { cookie: broadcaster.cookie },
        payload: {
          title: 'Stale Change',
          expectedVersion: 0,
        },
      });
      assert.equal(staleUpdate.statusCode, 409);
      assert.equal(staleUpdate.json().error.code, 'BROADCAST_VERSION_CONFLICT');

      const scheduledStartAt = new Date(Date.now() + 10 * 60_000).toISOString();
      const scheduleKey = `schedule-${suffix}`;
      const schedule = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/schedule`,
        headers: {
          cookie: broadcaster.cookie,
          'idempotency-key': scheduleKey,
        },
        payload: { expectedVersion: 1, scheduledStartAt },
      });
      assert.equal(schedule.statusCode, 200);
      assert.equal(schedule.json().broadcast.status, 'scheduled');
      assert.equal(schedule.json().broadcast.lifecycleVersion, 2);

      const scheduleReplay = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/schedule`,
        headers: {
          cookie: broadcaster.cookie,
          'idempotency-key': scheduleKey,
        },
        payload: { expectedVersion: 1, scheduledStartAt },
      });
      assert.equal(scheduleReplay.statusCode, 200);
      assert.equal(scheduleReplay.json().broadcast.lifecycleVersion, 2);

      const conflictingKey = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/start`,
        headers: {
          cookie: broadcaster.cookie,
          'idempotency-key': scheduleKey,
        },
        payload: { expectedVersion: 2 },
      });
      assert.equal(conflictingKey.statusCode, 409);
      assert.equal(conflictingKey.json().error.code, 'IDEMPOTENCY_KEY_CONFLICT');

      const start = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/start`,
        headers: {
          cookie: broadcaster.cookie,
          'idempotency-key': `start-${suffix}`,
        },
        payload: { expectedVersion: 2 },
      });
      assert.equal(start.statusCode, 200);
      assert.equal(start.json().broadcast.status, 'starting');
      assert.equal(start.json().broadcast.lifecycleVersion, 3);

      const unauthorizedMedia = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/media/broadcasts/${broadcastId}/events`,
        headers: { 'x-digistream-media-secret': 'wrong-secret' },
        payload: {
          event: 'contribution_ready',
          idempotencyKey: `media-wrong-${suffix}`,
        },
      });
      assert.equal(unauthorizedMedia.statusCode, 401);

      const contributionReady = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/media/broadcasts/${broadcastId}/events`,
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          event: 'contribution_ready',
          idempotencyKey: `contribution-ready-${suffix}`,
        },
      });
      assert.equal(contributionReady.statusCode, 200);
      assert.equal(contributionReady.json().broadcast.status, 'starting');
      assert.equal(contributionReady.json().broadcast.lifecycleVersion, 4);

      const deliveryReady = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/media/broadcasts/${broadcastId}/events`,
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          event: 'delivery_ready',
          idempotencyKey: `delivery-ready-${suffix}`,
        },
      });
      assert.equal(deliveryReady.statusCode, 200);
      assert.equal(deliveryReady.json().broadcast.status, 'live');
      assert.equal(deliveryReady.json().broadcast.lifecycleVersion, 5);
      assert.ok(deliveryReady.json().broadcast.liveStartedAt);

      const publicDetail = await app.inject({
        method: 'GET',
        url: `/api/v1/broadcasts/${organisation.slug}/${channel.slug}/${broadcastSlug}`,
      });
      assert.equal(publicDetail.statusCode, 200);
      assert.equal(publicDetail.json().broadcast.status, 'live');
      assert.equal('contributionRoomName' in publicDetail.json().broadcast, false);

      const sourceLost = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/media/broadcasts/${broadcastId}/events`,
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          event: 'source_lost',
          idempotencyKey: `source-lost-${suffix}`,
        },
      });
      assert.equal(sourceLost.statusCode, 200);
      assert.equal(sourceLost.json().broadcast.status, 'reconnecting');
      assert.equal(sourceLost.json().broadcast.lifecycleVersion, 6);

      const contributionRecovered = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/media/broadcasts/${broadcastId}/events`,
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          event: 'contribution_ready',
          idempotencyKey: `contribution-recovered-${suffix}`,
        },
      });
      assert.equal(contributionRecovered.statusCode, 200);
      assert.equal(contributionRecovered.json().broadcast.status, 'live');
      assert.equal(contributionRecovered.json().broadcast.lifecycleVersion, 7);

      const end = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/end`,
        headers: {
          cookie: owner.cookie,
          'idempotency-key': `end-${suffix}`,
        },
        payload: { expectedVersion: 7 },
      });
      assert.equal(end.statusCode, 200);
      assert.equal(end.json().broadcast.status, 'ending');
      assert.equal(end.json().broadcast.lifecycleVersion, 8);

      const completed = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/media/broadcasts/${broadcastId}/events`,
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          event: 'delivery_stopped',
          idempotencyKey: `delivery-stopped-${suffix}`,
        },
      });
      assert.equal(completed.statusCode, 200);
      assert.equal(completed.json().broadcast.status, 'completed');
      assert.equal(completed.json().broadcast.lifecycleVersion, 9);
      assert.ok(completed.json().broadcast.endedAt);

      const invalidEnd = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/end`,
        headers: {
          cookie: owner.cookie,
          'idempotency-key': `invalid-end-${suffix}`,
        },
        payload: { expectedVersion: 9 },
      });
      assert.equal(invalidEnd.statusCode, 409);
      assert.equal(
        invalidEnd.json().error.code,
        'INVALID_BROADCAST_STATUS_TRANSITION',
      );

      const publicList = await app.inject({
        method: 'GET',
        url: '/api/v1/broadcasts?status=completed&limit=10',
      });
      assert.equal(publicList.statusCode, 200);
      assert.ok(
        publicList
          .json()
          .broadcasts.some((item: { id: string }) => item.id === broadcastId),
      );

      const strangerRead = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}`,
        headers: { cookie: stranger.cookie },
      });
      assert.equal(strangerRead.statusCode, 404);
    } finally {
      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }
      for (const userId of userIds) {
        await database.db.delete(users).where(eq(users.id, userId));
      }
      await app.close();
      await database.close();
    }
  },
);
