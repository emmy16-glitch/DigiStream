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
import type { MediaRelayProvider } from '../src/modules/media/media-relay-provider.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

function deferred(): { promise: Promise<void>; resolve(): void } {
  let resolvePromise!: () => void;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

test(
  'delivery recovery preserves contribution, retries failed relays and rejects overlapping operations',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const userIds: string[] = [];
    let organisationId: string | undefined;
    const ensureGate = deferred();
    const enteredGate = deferred();
    const relayStarts: string[] = [];
    let relayAttempt = 0;
    let deliveryReady = false;

    const provider: DeliveryProvider = {
      provider: 'ovenmediaengine',
      getIngestTarget(streamName) {
        return streamName.includes('locked')
          ? null
          : {
              protocol: 'rtmp',
              url: `rtmp://media.example.test/app/${streamName}`,
              host: 'media.example.test',
            };
      },
      async ensureDelivery() {
        enteredGate.resolve();
        await ensureGate.promise;
        return { ready: true, connections: { webrtc: 0, llhls: 0 } };
      },
      async inspectDelivery() {
        return {
          ready: deliveryReady,
          connections: deliveryReady ? { webrtc: 0, llhls: 0 } : null,
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
        relayStarts.push(request.broadcastId);
        relayAttempt += 1;
        return relayAttempt === 1
          ? {
              externalId: `relay-failed-${suffix}`,
              status: 'failed',
              failureReason: 'Simulated Egress start failure.',
            }
          : {
              externalId: `relay-active-${suffix}`,
              status: 'active',
              failureReason: null,
            };
      },
      async inspectRelay(externalId) {
        return {
          externalId,
          status: externalId.includes('failed') ? 'failed' : 'active',
          failureReason: externalId.includes('failed')
            ? 'Simulated Egress start failure.'
            : null,
        };
      },
      async stopRelay(externalId) {
        return { externalId, status: 'stopped', failureReason: null };
      },
    };

    const app = buildApp({
      database,
      deliveryProvider: provider,
      mediaRelayProvider: relayProvider,
    });

    try {
      const registered = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `delivery-recovery-${suffix}@example.test`,
          displayName: 'Delivery Recovery Owner',
          password,
        },
      });
      assert.equal(registered.statusCode, 201);
      const ownerId = registered.json().user.id as string;
      const ownerCookie = responseCookie(registered);
      userIds.push(ownerId);

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Recovery Network',
          slug: `recovery-network-${suffix}`,
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
        .insert(channelRecords)
        .values({
          organisationId,
          name: 'Recovery Channel',
          slug: `recovery-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: ownerId,
        })
        .returning();
      assert.ok(channel);

      const [recoverable, locked] = await database.db
        .insert(broadcastRecords)
        .values([
          {
            organisationId,
            channelId: channel.id,
            createdByUserId: ownerId,
            title: 'Recoverable delivery',
            slug: `recoverable-${suffix}`,
            status: 'starting',
            contributionRoomName: `room-recoverable-${suffix}`,
            deliveryStreamName: `stream-recoverable-${suffix}`,
            contributionReadyAt: new Date(),
          },
          {
            organisationId,
            channelId: channel.id,
            createdByUserId: ownerId,
            title: 'Locked delivery',
            slug: `locked-${suffix}`,
            status: 'starting',
            contributionRoomName: `room-locked-${suffix}`,
            deliveryStreamName: `stream-locked-${suffix}`,
            contributionReadyAt: new Date(),
          },
        ])
        .returning();
      assert.ok(recoverable);
      assert.ok(locked);

      const failedStart = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${recoverable.id}/delivery/start`,
        headers: { cookie: ownerCookie },
      });
      assert.equal(failedStart.statusCode, 200);
      assert.equal(failedStart.json().delivery.ready, false);
      assert.equal(failedStart.json().delivery.broadcast.status, 'starting');
      assert.equal(
        failedStart.json().delivery.problem.code,
        'MEDIA_RELAY_FAILED',
      );
      assert.equal(
        failedStart.json().delivery.recovery.privateStudioPreserved,
        true,
      );
      assert.equal(failedStart.json().delivery.recovery.retryable, true);

      const [afterFailure] = await database.db
        .select({ status: broadcastRecords.status })
        .from(broadcastRecords)
        .where(eq(broadcastRecords.id, recoverable.id));
      assert.equal(afterFailure?.status, 'starting');

      deliveryReady = true;
      const recovered = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${recoverable.id}/delivery/start`,
        headers: { cookie: ownerCookie },
      });
      assert.equal(recovered.statusCode, 200);
      assert.equal(recovered.json().delivery.ready, true);
      assert.equal(recovered.json().delivery.broadcast.status, 'live');
      assert.equal(recovered.json().delivery.problem, null);
      assert.equal(relayStarts.length, 2);

      const firstOperation = app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${locked.id}/delivery/start`,
        headers: { cookie: ownerCookie },
      });
      await enteredGate.promise;

      const overlapping = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${locked.id}/delivery/status`,
        headers: { cookie: ownerCookie },
      });
      assert.equal(overlapping.statusCode, 409);
      assert.equal(
        overlapping.json().error.code,
        'DELIVERY_OPERATION_IN_PROGRESS',
      );

      ensureGate.resolve();
      const completedOperation = await firstOperation;
      assert.equal(completedOperation.statusCode, 200);
      assert.equal(completedOperation.json().delivery.ready, true);
    } finally {
      ensureGate.resolve();
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
