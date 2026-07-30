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
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
import { channelRecords } from '../src/modules/channels/channels.schema.js';
import type { DeliveryProvider } from '../src/modules/media/delivery-provider.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'OvenMediaEngine delivery enforces lifecycle, tenant and visibility rules',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const ensureRequests: string[] = [];
    const stoppedStreams: string[] = [];
    let inspectReady = true;
    const provider: DeliveryProvider = {
      provider: 'ovenmediaengine',
      async ensureDelivery(request) {
        ensureRequests.push(request.streamName);
        return { ready: true, connections: { webrtc: 0, llhls: 0 } };
      },
      async inspectDelivery() {
        return {
          ready: inspectReady,
          connections: inspectReady ? { webrtc: 3, llhls: 7 } : null,
        };
      },
      async stopDelivery(streamName) {
        stoppedStreams.push(streamName);
      },
      issuePlayback(streamName, expiresAt) {
        return {
          provider: 'ovenmediaengine',
          streamName,
          expiresAt,
          sources: [
            {
              protocol: 'webrtc',
              url: `wss://media.example.test:3334/live/${streamName}?policy=test&signature=test`,
            },
            {
              protocol: 'llhls',
              url: `https://media.example.test:3334/live/${streamName}/llhls.m3u8?policy=test&signature=test`,
            },
          ],
        };
      },
    };

    const app = buildApp({ database, deliveryProvider: provider });
    const userIds: string[] = [];
    let organisationId: string | undefined;

    async function register(label: string) {
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
      const analyst = await register('Analyst');
      const outsider = await register('Outsider');

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Delivery Network',
          slug: `delivery-network-${suffix}`,
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(organisation);
      organisationId = organisation.id;

      await database.db.insert(organisationMemberships).values([
        { organisationId, userId: owner.userId, role: 'owner' },
        {
          organisationId,
          userId: analyst.userId,
          role: 'analyst',
          invitedByUserId: owner.userId,
        },
      ]);

      const [publicChannel, privateChannel] = await database.db
        .insert(channelRecords)
        .values([
          {
            organisationId,
            name: 'Public Delivery',
            slug: `public-${suffix}`,
            status: 'active',
            visibility: 'public',
            createdByUserId: owner.userId,
          },
          {
            organisationId,
            name: 'Private Delivery',
            slug: `private-${suffix}`,
            status: 'active',
            visibility: 'private',
            createdByUserId: owner.userId,
          },
        ])
        .returning();
      assert.ok(publicChannel);
      assert.ok(privateChannel);

      const [publicBroadcast, privateBroadcast] = await database.db
        .insert(broadcastRecords)
        .values([
          {
            organisationId,
            channelId: publicChannel.id,
            createdByUserId: owner.userId,
            title: 'Public Live Delivery',
            slug: `public-live-${suffix}`,
            status: 'starting',
            contributionRoomName: `room-public-${suffix}`,
            deliveryStreamName: `stream-public-${suffix}`,
            contributionReadyAt: new Date(),
          },
          {
            organisationId,
            channelId: privateChannel.id,
            createdByUserId: owner.userId,
            title: 'Private Live Delivery',
            slug: `private-live-${suffix}`,
            status: 'live',
            contributionRoomName: `room-private-${suffix}`,
            deliveryStreamName: `stream-private-${suffix}`,
            contributionReadyAt: new Date(),
            deliveryReadyAt: new Date(),
            liveStartedAt: new Date(),
          },
        ])
        .returning();
      assert.ok(publicBroadcast);
      assert.ok(privateBroadcast);

      const analystDenied = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${publicBroadcast.id}/delivery/start`,
        headers: { cookie: analyst.cookie },
      });
      assert.equal(analystDenied.statusCode, 403);

      const started = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${publicBroadcast.id}/delivery/start`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(started.statusCode, 200);
      assert.equal(started.json().delivery.ready, true);
      assert.equal(started.json().delivery.broadcast.status, 'live');
      assert.deepEqual(ensureRequests, [publicBroadcast.deliveryStreamName]);

      const publicPlayback = await app.inject({
        method: 'GET',
        url: `/api/v1/broadcasts/${organisation.slug}/${publicChannel.slug}/${publicBroadcast.slug}/playback`,
      });
      assert.equal(publicPlayback.statusCode, 200);
      assert.equal(publicPlayback.headers['cache-control'], 'no-store');
      assert.equal(publicPlayback.json().playback.sources.length, 2);
      assert.equal(publicPlayback.json().playback.streamName, undefined);

      const privatePublicDenied = await app.inject({
        method: 'GET',
        url: `/api/v1/broadcasts/${organisation.slug}/${privateChannel.slug}/${privateBroadcast.slug}/playback`,
      });
      assert.equal(privatePublicDenied.statusCode, 404);

      const outsiderPrivateDenied = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${privateBroadcast.id}/playback`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(outsiderPrivateDenied.statusCode, 404);

      const memberPrivatePlayback = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${privateBroadcast.id}/playback`,
        headers: { cookie: analyst.cookie },
      });
      assert.equal(memberPrivatePlayback.statusCode, 200);

      inspectReady = false;
      const refreshed = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${publicBroadcast.id}/delivery/refresh`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(refreshed.statusCode, 200);
      assert.equal(refreshed.json().delivery.ready, false);
      assert.equal(refreshed.json().delivery.broadcast.status, 'reconnecting');

      await database.db
        .update(broadcastRecords)
        .set({ status: 'ending', lifecycleVersion: 3 })
        .where(eq(broadcastRecords.id, publicBroadcast.id));

      const stopped = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${publicBroadcast.id}/delivery/stop`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(stopped.statusCode, 200);
      assert.equal(stopped.json().delivery.broadcast.status, 'completed');
      assert.deepEqual(stoppedStreams, [publicBroadcast.deliveryStreamName]);
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
