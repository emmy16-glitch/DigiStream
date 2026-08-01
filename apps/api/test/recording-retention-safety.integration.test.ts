import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  organisationMemberships,
  organisations,
  users,
} from '../src/db/schema.js';
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
import { channelRecords } from '../src/modules/channels/channels.schema.js';
import {
  manageRecordingRetention,
  reconcileRecordingRetention,
} from '../src/modules/recordings/recording-retention.service.js';
import { recordingRecords } from '../src/modules/recordings/recordings.schema.js';
import { InMemoryObjectStorage } from '../src/modules/storage/object-storage.js';

const databaseUrl = process.env.DATABASE_URL;

test(
  'retention deadlines extend purge schedules and active cleanup blocks cancellation or new holds',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const objectStorage = new InMemoryObjectStorage();
    const [owner] = await database.db
      .insert(users)
      .values({
        email: `retention-safety-${suffix}@example.test`,
        displayName: 'Retention Safety Owner',
        passwordHash: 'test-only-password-hash',
      })
      .returning({ id: users.id });
    assert.ok(owner);

    const [organisation] = await database.db
      .insert(organisations)
      .values({
        name: 'Retention Safety Network',
        slug: `retention-safety-${suffix}`,
        createdByUserId: owner.id,
      })
      .returning({ id: organisations.id });
    assert.ok(organisation);

    await database.db.insert(organisationMemberships).values({
      organisationId: organisation.id,
      userId: owner.id,
      role: 'owner',
      invitedByUserId: owner.id,
    });

    const [channel] = await database.db
      .insert(channelRecords)
      .values({
        organisationId: organisation.id,
        name: 'Retention Safety Channel',
        slug: `retention-safety-channel-${suffix}`,
        status: 'active',
        visibility: 'private',
        createdByUserId: owner.id,
      })
      .returning({ id: channelRecords.id });
    assert.ok(channel);

    async function createRecording(label: string, withMetadata: boolean) {
      const [broadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId: organisation.id,
          channelId: channel.id,
          createdByUserId: owner.id,
          title: label,
          slug: `${label.toLowerCase().replaceAll(' ', '-')}-${suffix}`,
          status: 'completed',
          endedAt: new Date(),
        })
        .returning({ id: broadcastRecords.id });
      assert.ok(broadcast);

      const storageKey = `recordings/${organisation.id}/${broadcast.id}/${randomUUID()}`;
      const body = Buffer.from(`retention-safety-${label}-${suffix}`);
      const stored = await objectStorage.putObject({
        key: storageKey,
        body,
        contentType: 'audio/mpeg',
      });
      const now = new Date();
      const [recording] = await database.db
        .insert(recordingRecords)
        .values({
          organisationId: organisation.id,
          channelId: channel.id,
          broadcastId: broadcast.id,
          requestedByUserId: owner.id,
          status: withMetadata ? 'published' : 'failed',
          storageKey,
          provider: 'retention-safety-test',
          providerArtifactId: `retention-safety-${label}-${suffix}`,
          ...(withMetadata
            ? {
                mediaFormat: 'mp3',
                contentType: stored.contentType,
                sizeBytes: stored.sizeBytes,
                durationMs: 1_000,
                checksumSha256: stored.checksumSha256,
                readyAt: now,
                publishedAt: now,
              }
            : {
                processingError: 'Metadata was not completed.',
                retryCount: 1,
              }),
        })
        .returning({ id: recordingRecords.id });
      assert.ok(recording);
      return { id: recording.id, storageKey, body };
    }

    try {
      const protectedRecording = await createRecording('Protected artifact', true);
      const retentionUntil = new Date(
        Date.now() + 2 * 365 * 24 * 60 * 60 * 1000,
      );
      await manageRecordingRetention(
        database,
        organisation.id,
        protectedRecording.id,
        owner.id,
        {
          action: 'set_retention',
          retentionUntil: retentionUntil.toISOString(),
        },
      );

      const scheduled = await manageRecordingRetention(
        database,
        organisation.id,
        protectedRecording.id,
        owner.id,
        {
          action: 'request_deletion',
          purgeAfter: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      );
      assert.ok(scheduled.purgeAfter);
      assert.equal(
        scheduled.purgeAfter.getTime(),
        retentionUntil.getTime(),
        'retention must move a requested purge later instead of being bypassed',
      );

      await database.pool.query(
        `update recording_retention_controls
         set purge_started_at = now()
         where recording_id = $1`,
        [protectedRecording.id],
      );

      await assert.rejects(
        manageRecordingRetention(
          database,
          organisation.id,
          protectedRecording.id,
          owner.id,
          { action: 'cancel_deletion' },
        ),
        (error: unknown) =>
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'RECORDING_PURGE_IN_PROGRESS',
      );

      await assert.rejects(
        manageRecordingRetention(
          database,
          organisation.id,
          protectedRecording.id,
          owner.id,
          {
            action: 'set_legal_hold',
            reason: 'A hold cannot race with an active destructive operation.',
          },
        ),
        (error: unknown) =>
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'RECORDING_PURGE_IN_PROGRESS',
      );

      const incompleteRecording = await createRecording(
        'Incomplete metadata artifact',
        false,
      );
      await manageRecordingRetention(
        database,
        organisation.id,
        incompleteRecording.id,
        owner.id,
        {
          action: 'request_deletion',
          purgeAfter: new Date(
            Date.now() + 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      );
      await database.pool.query(
        `update recording_retention_controls
         set purge_after = now() - interval '1 minute'
         where recording_id = $1`,
        [incompleteRecording.id],
      );

      const cleanup = await reconcileRecordingRetention(
        database,
        objectStorage,
        { limit: 10 },
      );
      assert.equal(cleanup.claimed, 1);
      assert.equal(cleanup.failed, 1);
      assert.equal(cleanup.deleted, 0);
      assert.equal(cleanup.missing, 0);
      assert.match(
        cleanup.results[0]?.error ?? '',
        /checksum and size metadata are incomplete/i,
      );

      const stillStored = await objectStorage.getObject({
        key: incompleteRecording.storageKey,
        contentType: 'audio/mpeg',
      });
      const chunks: Buffer[] = [];
      for await (const chunk of stillStored.body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      assert.deepEqual(Buffer.concat(chunks), incompleteRecording.body);

      const [notDeleted] = await database.db
        .select({ status: recordingRecords.status })
        .from(recordingRecords)
        .where(eq(recordingRecords.id, incompleteRecording.id));
      assert.equal(notDeleted?.status, 'archived');
    } finally {
      await database.db
        .delete(organisations)
        .where(eq(organisations.id, organisation.id));
      await database.db.delete(users).where(eq(users.id, owner.id));
      objectStorage.close();
      await database.close();
    }
  },
);
