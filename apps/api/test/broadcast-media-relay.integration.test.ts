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
import { broadcastMediaRelays } from '../src/modules/broadcasts/broadcast-media-relays.schema.js';
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
import { channelRecords } from '../src/modules/channels/channels.schema.js';
import type { DeliveryProvider } from '../src/modules/media/delivery-provider.js';
import type { MediaRelayProvider } from '../src/modules/media/media-relay-provider.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'LiveKit Egress bridge persists, reuses, reconciles and stops relay jobs',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    let omeReady = false;
    let startCount = 0;
    let inspectCount = 0;
    let stopCount = 0;

    const deliveryProvider: DeliveryProvider = {
      provider: 'ovenmediaengine',
      getIngestTarget(streamName) {
        return {
          protocol: 'rtmp',
          url: `rtmp://ome.example.test:1935/app/${streamName}?secret=not-stored`,
          host: 'ome.example.test:1935',
        };
      },
      async ensureDelivery() {
        throw new Error('Push delivery must not create an OME pull stream.');
      },
      async inspectDelivery() {
        return {
          ready: omeReady,
          connections: omeReady ? { webrtc: 0, llhls: 0 } : null,
        };
      },
      async stopDelivery() {},
      issuePlayback(streamName, expiresAt) {
        return {
          provider: 'ovenmediaengine',
          streamName,
          expiresAt,
          sources: [],
        };
      },
    };

    const relayProvider: MediaRelayProvider = {
      provider: 'livekit_egress',
      async startAudioRelay(request) {
        startCount += 1;
        assert.equal(request.protocol, 'rtmp');
        assert.ok(request.targetUrl.includes(request.broadcastId) === false);
        return {
          externalId: `EG_${suffix}`,
          status: 'active',
          failureReason: null,
        };
      },
      async inspectRelay(externalId) {
        inspectCount += 1;
        assert.equal(externalId, `EG_${suffix}`);
        return { externalId, status: 'active', failureReason: null };
      },
      async stopRelay(externalId) {
        stopCount += 1;
        return { externalId, status: 'stopped', failureReason: null };
      },
    };

    const app = buildApp({
      database,
      deliveryProvider,
      mediaRelayProvider: relayProvider,
    });
    let organisationId: string | undefined;
    let userId: string | undefined;

    try {
      const registration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `relay-owner-${suffix}@example.test`,
          displayName: 'Relay Owner',
          password,
        },
      });
      assert.equal(registration.statusCode, 201);
      userId = registration.json().user.id as string;
      const cookie = responseCookie(registration);

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Relay Network',
          slug: `relay-network-${suffix}`,
          createdByUserId: userId,
        })
        .returning();
      assert.ok(organisation);
      organisationId = organisation.id;
      await database.db.insert(organisationMemberships).values({
        organisationId,
        userId,
        role: 'owner',
      });

      const [channel] = await database.db
        .insert(channelRecords)
        .values({
          organisationId,
          name: 'Relay Channel',
          slug: `relay-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: userId,
        })
        .returning();
      assert.ok(channel);

      const [broadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: channel.id,
          createdByUserId: userId,
          title: 'Relay Test',
          slug: `relay-test-${suffix}`,
          status: 'starting',
          contributionRoomName: `room-${suffix}`,
          deliveryStreamName: `stream-${suffix}`,
          contributionReadyAt: new Date(),
        })
        .returning();
      assert.ok(broadcast);

      const endpoint = `/api/v1/organisations/${organisationId}/broadcasts/${broadcast.id}/delivery`;
      const started = await app.inject({
        method: 'POST',
        url: `${endpoint}/start`,
        headers: { cookie },
      });
      assert.equal(started.statusCode, 200);
      assert.equal(started.json().delivery.ready, false);
      assert.equal(started.json().delivery.relay.status, 'active');
      assert.equal(startCount, 1);

      const [stored] = await database.db
        .select()
        .from(broadcastMediaRelays)
        .where(eq(broadcastMediaRelays.broadcastId, broadcast.id));
      assert.ok(stored);
      assert.equal(stored.externalId, `EG_${suffix}`);
      assert.equal(stored.targetHost, 'ome.example.test:1935');
      assert.equal(JSON.stringify(stored).includes('not-stored'), false);

      const replayedStart = await app.inject({
        method: 'POST',
        url: `${endpoint}/start`,
        headers: { cookie },
      });
      assert.equal(replayedStart.statusCode, 200);
      assert.equal(startCount, 1);
      assert.equal(inspectCount, 1);

      omeReady = true;
      const refreshed = await app.inject({
        method: 'POST',
        url: `${endpoint}/refresh`,
        headers: { cookie },
      });
      assert.equal(refreshed.statusCode, 200);
      assert.equal(refreshed.json().delivery.ready, true);
      assert.equal(refreshed.json().delivery.broadcast.status, 'live');

      await database.db
        .update(broadcastRecords)
        .set({ status: 'ending' })
        .where(eq(broadcastRecords.id, broadcast.id));

      const stopped = await app.inject({
        method: 'POST',
        url: `${endpoint}/stop`,
        headers: { cookie },
      });
      assert.equal(stopped.statusCode, 200);
      assert.equal(stopped.json().delivery.broadcast.status, 'completed');
      assert.equal(stopped.json().delivery.relay.status, 'stopped');
      assert.equal(stopCount, 1);
    } finally {
      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }
      if (userId) await database.db.delete(users).where(eq(users.id, userId));
      await app.close();
      await database.close();
    }
  },
);
