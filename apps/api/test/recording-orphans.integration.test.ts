import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { organisations, users } from '../src/db/schema.js';
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
import { channelRecords } from '../src/modules/channels/channels.schema.js';
import { recordingRecords } from '../src/modules/recordings/recordings.schema.js';
import {
  InMemoryObjectStorage,
  ObjectStorageError,
} from '../src/modules/storage/object-storage.js';

const databaseUrl = process.env.DATABASE_URL;

async function objectExists(
  storage: InMemoryObjectStorage,
  key: string,
): Promise<boolean> {
  try {
    const object = await storage.getObject({
      key,
      contentType: 'application/octet-stream',
    });
    object.body.destroy();
    return true;
  } catch (error) {
    if (error instanceof ObjectStorageError && error.code === 'not_found') {
      return false;
    }
    throw error;
  }
}

test(
  'recording orphan reconciliation quarantines unknown objects, cleans them and restores race-matched objects',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    process.env.NODE_ENV = 'test';
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const mediaSecret = `orphan-secret-${suffix}`;
    const storage = new InMemoryObjectStorage();
    const app = buildApp({
      database,
      mediaControlSecret: mediaSecret,
      objectStorage: storage,
      recordingAccessManager: null,
      realtime: false,
      contributionProvider: null,
      backstageProvider: null,
      deliveryProvider: null,
      mediaRelayProvider: null,
    });

    const [user] = await database.db
      .insert(users)
      .values({
        email: `orphan-${suffix}@example.test`,
        displayName: 'Orphan Test User',
        passwordHash: 'not-used-by-this-test',
      })
      .returning({ id: users.id });
    assert.ok(user);
    const [organisation] = await database.db
      .insert(organisations)
      .values({
        name: 'Orphan Reconciliation Network',
        slug: `orphan-${suffix}`,
        createdByUserId: user.id,
      })
      .returning({ id: organisations.id });
    assert.ok(organisation);
    const [channel] = await database.db
      .insert(channelRecords)
      .values({
        organisationId: organisation.id,
        name: 'Orphan Test Channel',
        slug: `orphan-channel-${suffix}`,
        status: 'active',
        visibility: 'private',
        createdByUserId: user.id,
      })
      .returning({ id: channelRecords.id });
    assert.ok(channel);

    async function createKnownRecording(storageKey: string, label: string) {
      const [broadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId: organisation.id,
          channelId: channel.id,
          createdByUserId: user.id,
          title: label,
          slug: `${label.toLowerCase().replaceAll(' ', '-')}-${suffix}`,
          status: 'completed',
          endedAt: new Date(),
          contributionRoomName: `orphan-room-${randomUUID()}`,
          deliveryStreamName: `orphan-stream-${randomUUID()}`,
        })
        .returning({ id: broadcastRecords.id });
      assert.ok(broadcast);
      const [recording] = await database.db
        .insert(recordingRecords)
        .values({
          organisationId: organisation.id,
          channelId: channel.id,
          broadcastId: broadcast.id,
          requestedByUserId: user.id,
          status: 'ready',
          storageKey,
          provider: 'orphan-test',
        })
        .returning({ id: recordingRecords.id });
      assert.ok(recording);
      return recording;
    }

    const knownKey = `recordings/${organisation.id}/known-${suffix}.wav`;
    const orphanKey = `recordings/${organisation.id}/orphan-${suffix}.wav`;
    const racedKey = `recordings/${organisation.id}/race-${suffix}.wav`;

    try {
      await createKnownRecording(knownKey, 'Known recording');
      await storage.putObject({
        key: knownKey,
        body: Buffer.from('known-audio'),
        contentType: 'audio/wav',
      });
      await storage.putObject({
        key: orphanKey,
        body: Buffer.from('orphan-audio'),
        contentType: 'audio/wav',
      });
      await storage.putObject({
        key: racedKey,
        body: Buffer.from('race-audio'),
        contentType: 'audio/wav',
      });

      const unauthorized = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-orphans/reconcile',
        payload: { action: 'quarantine', minimumAgeSeconds: 0 },
      });
      assert.equal(unauthorized.statusCode, 401);

      const quarantine = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-orphans/reconcile',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          action: 'quarantine',
          limit: 100,
          minimumAgeSeconds: 0,
          quarantineSeconds: 0,
        },
      });
      assert.equal(quarantine.statusCode, 200);
      assert.equal(quarantine.json().known, 1);
      assert.equal(quarantine.json().quarantined, 2);
      assert.equal(await objectExists(storage, knownKey), true);
      assert.equal(await objectExists(storage, orphanKey), false);
      assert.equal(await objectExists(storage, racedKey), false);

      const ledger = await app.inject({
        method: 'GET',
        url: '/api/v1/internal/recording-orphans?limit=10',
        headers: { 'x-digistream-media-secret': mediaSecret },
      });
      assert.equal(ledger.statusCode, 200);
      assert.equal(ledger.json().orphans.length, 2);
      const orphanRecord = ledger
        .json()
        .orphans.find((item: { originalKey: string }) => item.originalKey === orphanKey);
      const racedRecord = ledger
        .json()
        .orphans.find((item: { originalKey: string }) => item.originalKey === racedKey);
      assert.equal(orphanRecord.status, 'quarantined');
      assert.equal(racedRecord.status, 'quarantined');
      assert.equal(await objectExists(storage, orphanRecord.quarantineKey), true);
      assert.equal(await objectExists(storage, racedRecord.quarantineKey), true);

      await createKnownRecording(racedKey, 'Race matched recording');

      const cleanup = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-orphans/reconcile',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { action: 'cleanup', limit: 100 },
      });
      assert.equal(cleanup.statusCode, 200);
      assert.equal(cleanup.json().deleted, 1);
      assert.equal(cleanup.json().restored, 1);
      assert.equal(cleanup.json().failed, 0);
      assert.equal(await objectExists(storage, orphanRecord.quarantineKey), false);
      assert.equal(await objectExists(storage, racedRecord.quarantineKey), false);
      assert.equal(await objectExists(storage, orphanKey), false);
      assert.equal(await objectExists(storage, racedKey), true);

      const resolvedLedger = await app.inject({
        method: 'GET',
        url: '/api/v1/internal/recording-orphans?limit=10',
        headers: { 'x-digistream-media-secret': mediaSecret },
      });
      assert.equal(resolvedLedger.statusCode, 200);
      const resolutions = new Map(
        resolvedLedger.json().orphans.map(
          (item: { originalKey: string; resolution: string }) => [
            item.originalKey,
            item.resolution,
          ],
        ),
      );
      assert.equal(resolutions.get(orphanKey), 'deleted');
      assert.equal(resolutions.get(racedKey), 'restored');
    } finally {
      await database.db
        .delete(organisations)
        .where(eq(organisations.id, organisation.id));
      await database.db.delete(users).where(eq(users.id, user.id));
      await app.close();
      await database.close();
    }
  },
);
