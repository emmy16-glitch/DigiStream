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
import { recordingRecords } from '../src/modules/recordings/recordings.schema.js';
import {
  InMemoryObjectStorage,
  ObjectStorageError,
} from '../src/modules/storage/object-storage.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'recording retention holds block deletion and cleanup is authorised, idempotent and honest about missing objects',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const mediaSecret = `retention-secret-${suffix}`;
    const objectStorage = new InMemoryObjectStorage();
    const app = buildApp({
      database,
      mediaControlSecret: mediaSecret,
      objectStorage,
      realtime: false,
      contributionProvider: null,
      backstageProvider: null,
      deliveryProvider: null,
      mediaRelayProvider: null,
      recordingAccessManager: null,
    });

    const userIds: string[] = [];
    let organisationId: string | undefined;

    async function register(label: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `${label.toLowerCase()}-${suffix}@example.test`,
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
      const moderator = await register('Moderator');
      const stranger = await register('Stranger');

      const organisationCreation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Retention Test Network',
          slug: `retention-${suffix}`,
        },
      });
      assert.equal(organisationCreation.statusCode, 201);
      organisationId = organisationCreation.json().organisation.id as string;

      await database.db.insert(organisationMemberships).values({
        organisationId,
        userId: moderator.userId,
        role: 'moderator',
        invitedByUserId: owner.userId,
      });

      const [channel] = await database.db
        .insert(channelRecords)
        .values({
          organisationId,
          name: 'Retention Channel',
          slug: `retention-channel-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: owner.userId,
        })
        .returning({ id: channelRecords.id });
      assert.ok(channel);

      async function createRecording(options: {
        label: string;
        status: 'published' | 'failed';
        withObject: boolean;
      }) {
        const [broadcast] = await database.db
          .insert(broadcastRecords)
          .values({
            organisationId,
            channelId: channel.id,
            createdByUserId: owner.userId,
            title: options.label,
            slug: `${options.label.toLowerCase().replaceAll(' ', '-')}-${suffix}`,
            status: 'completed',
            endedAt: new Date(),
          })
          .returning({ id: broadcastRecords.id });
        assert.ok(broadcast);

        const storageKey = `recordings/${organisationId}/${broadcast.id}/${randomUUID()}`;
        const body = Buffer.from(`retention-audio-${options.label}-${suffix}`);
        const stored = options.withObject
          ? await objectStorage.putObject({
              key: storageKey,
              body,
              contentType: 'audio/mpeg',
            })
          : null;
        const now = new Date();
        const [recording] = await database.db
          .insert(recordingRecords)
          .values({
            organisationId,
            channelId: channel.id,
            broadcastId: broadcast.id,
            requestedByUserId: owner.userId,
            status: options.status,
            storageKey,
            provider: 'retention-test',
            providerArtifactId: `artifact-${options.label}-${suffix}`,
            ...(stored
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
                  processingError: 'Artifact was not produced.',
                  retryCount: 1,
                }),
          })
          .returning({ id: recordingRecords.id });
        assert.ok(recording);
        return { id: recording.id, storageKey };
      }

      const storedRecording = await createRecording({
        label: 'Stored recording',
        status: 'published',
        withObject: true,
      });
      const retentionUrl = `/api/v1/organisations/${organisationId}/recordings/${storedRecording.id}/retention`;

      const strangerRead = await app.inject({
        method: 'GET',
        url: retentionUrl,
        headers: { cookie: stranger.cookie },
      });
      assert.equal(strangerRead.statusCode, 404);

      const initial = await app.inject({
        method: 'GET',
        url: retentionUrl,
        headers: { cookie: owner.cookie },
      });
      assert.equal(initial.statusCode, 200);
      assert.equal(initial.json().retention.deletionBlocked, false);

      const moderatorHold = await app.inject({
        method: 'PATCH',
        url: retentionUrl,
        headers: { cookie: moderator.cookie },
        payload: {
          action: 'set_moderation_hold',
          reason: 'Preserve for an active moderation review.',
        },
      });
      assert.equal(moderatorHold.statusCode, 200);
      assert.equal(moderatorHold.json().retention.moderationHold.active, true);

      const blockedDeletion = await app.inject({
        method: 'PATCH',
        url: retentionUrl,
        headers: { cookie: owner.cookie },
        payload: { action: 'request_deletion' },
      });
      assert.equal(blockedDeletion.statusCode, 409);
      assert.equal(
        blockedDeletion.json().error.code,
        'RECORDING_DELETION_BLOCKED_BY_HOLD',
      );

      const moderatorLegalClear = await app.inject({
        method: 'PATCH',
        url: retentionUrl,
        headers: { cookie: moderator.cookie },
        payload: { action: 'clear_legal_hold' },
      });
      assert.equal(moderatorLegalClear.statusCode, 403);

      const clearModeration = await app.inject({
        method: 'PATCH',
        url: retentionUrl,
        headers: { cookie: moderator.cookie },
        payload: { action: 'clear_moderation_hold' },
      });
      assert.equal(clearModeration.statusCode, 200);

      const legalHold = await app.inject({
        method: 'PATCH',
        url: retentionUrl,
        headers: { cookie: owner.cookie },
        payload: {
          action: 'set_legal_hold',
          reason: 'Preserve for a legal request.',
        },
      });
      assert.equal(legalHold.statusCode, 200);
      assert.equal(legalHold.json().retention.legalHold.active, true);

      const clearLegal = await app.inject({
        method: 'PATCH',
        url: retentionUrl,
        headers: { cookie: owner.cookie },
        payload: { action: 'clear_legal_hold' },
      });
      assert.equal(clearLegal.statusCode, 200);

      const scheduled = await app.inject({
        method: 'PATCH',
        url: retentionUrl,
        headers: { cookie: owner.cookie },
        payload: {
          action: 'request_deletion',
          purgeAfter: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        },
      });
      assert.equal(scheduled.statusCode, 200);
      assert.equal(scheduled.json().retention.recordingStatus, 'archived');
      assert.ok(scheduled.json().retention.deletionRequestedAt);

      await database.pool.query(
        `update recording_retention_controls
         set purge_after = now() - interval '1 minute'
         where recording_id = $1`,
        [storedRecording.id],
      );

      const unauthorizedCleanup = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-retention/reconcile',
        headers: { 'x-digistream-media-secret': 'wrong-secret' },
        payload: { limit: 10 },
      });
      assert.equal(unauthorizedCleanup.statusCode, 401);

      const cleanup = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-retention/reconcile',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { limit: 10 },
      });
      assert.equal(cleanup.statusCode, 200);
      assert.equal(cleanup.json().deleted, 1);
      assert.equal(cleanup.json().failed, 0);

      await assert.rejects(
        objectStorage.getObject({
          key: storedRecording.storageKey,
          contentType: 'audio/mpeg',
        }),
        (error: unknown) =>
          error instanceof ObjectStorageError && error.code === 'not_found',
      );

      const repeatedCleanup = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-retention/reconcile',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { limit: 10 },
      });
      assert.equal(repeatedCleanup.statusCode, 200);
      assert.equal(repeatedCleanup.json().claimed, 0);

      const missingRecording = await createRecording({
        label: 'Missing recording',
        status: 'failed',
        withObject: false,
      });
      const missingRetentionUrl = `/api/v1/organisations/${organisationId}/recordings/${missingRecording.id}/retention`;
      const scheduleMissing = await app.inject({
        method: 'PATCH',
        url: missingRetentionUrl,
        headers: { cookie: owner.cookie },
        payload: {
          action: 'request_deletion',
          purgeAfter: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        },
      });
      assert.equal(scheduleMissing.statusCode, 200);

      const holdMissing = await app.inject({
        method: 'PATCH',
        url: missingRetentionUrl,
        headers: { cookie: moderator.cookie },
        payload: {
          action: 'set_moderation_hold',
          reason: 'Keep while the failure is reviewed.',
        },
      });
      assert.equal(holdMissing.statusCode, 200);
      await database.pool.query(
        `update recording_retention_controls
         set purge_after = now() - interval '1 minute'
         where recording_id = $1`,
        [missingRecording.id],
      );

      const heldCleanup = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-retention/reconcile',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { limit: 10 },
      });
      assert.equal(heldCleanup.statusCode, 200);
      assert.equal(heldCleanup.json().claimed, 0);

      await app.inject({
        method: 'PATCH',
        url: missingRetentionUrl,
        headers: { cookie: moderator.cookie },
        payload: { action: 'clear_moderation_hold' },
      });
      const missingCleanup = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-retention/reconcile',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { limit: 10 },
      });
      assert.equal(missingCleanup.statusCode, 200);
      assert.equal(missingCleanup.json().missing, 1);

      const [deleted] = await database.db
        .select({ status: recordingRecords.status })
        .from(recordingRecords)
        .where(eq(recordingRecords.id, missingRecording.id));
      assert.equal(deleted?.status, 'deleted');
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
