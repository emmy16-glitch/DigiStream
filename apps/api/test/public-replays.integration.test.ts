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
import { RecordingAccessManager } from '../src/modules/recordings/recording-access.js';
import { recordingRecords } from '../src/modules/recordings/recordings.schema.js';
import { InMemoryObjectStorage } from '../src/modules/storage/object-storage.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'public replay discovery, exact unlisted links and private member playback fail closed',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const objectStorage = new InMemoryObjectStorage();
    const accessManager = new RecordingAccessManager(
      `public-replay-secret-${suffix}-at-least-thirty-two-bytes`,
      120,
    );
    const app = buildApp({
      database,
      objectStorage,
      recordingAccessManager: accessManager,
      realtime: false,
      contributionProvider: null,
      backstageProvider: null,
      deliveryProvider: null,
      mediaRelayProvider: null,
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
      const stranger = await register('Stranger');

      const organisationCreation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Replay Listening Network',
          slug: `replay-listening-${suffix}`,
        },
      });
      assert.equal(organisationCreation.statusCode, 201);
      organisationId = organisationCreation.json().organisation.id as string;
      const organisationSlug = organisationCreation.json().organisation.slug as string;

      async function createReplay(options: {
        label: string;
        visibility: 'public' | 'unlisted' | 'private';
        recordingStatus: 'published' | 'private';
      }) {
        const channelSlug = `${options.visibility}-${suffix}`;
        const [channel] = await database.db
          .insert(channelRecords)
          .values({
            organisationId,
            name: `${options.label} Channel`,
            slug: channelSlug,
            status: 'active',
            visibility: options.visibility,
            createdByUserId: owner.userId,
          })
          .returning({ id: channelRecords.id });
        assert.ok(channel);

        const broadcastSlug = `${options.label.toLowerCase().replaceAll(' ', '-')}-${suffix}`;
        const endedAt = new Date(Date.now() - 60_000);
        const [broadcast] = await database.db
          .insert(broadcastRecords)
          .values({
            organisationId,
            channelId: channel.id,
            createdByUserId: owner.userId,
            title: options.label,
            slug: broadcastSlug,
            description: `${options.label} replay description.`,
            status: 'completed',
            endedAt,
          })
          .returning({ id: broadcastRecords.id });
        assert.ok(broadcast);

        const storageKey = `recordings/${organisationId}/${broadcast.id}/${randomUUID()}`;
        const body = Buffer.from(`replay-audio-${options.label}-${suffix}`);
        const stored = await objectStorage.putObject({
          key: storageKey,
          body,
          contentType: 'audio/mpeg',
        });
        const readyAt = new Date();
        const [recording] = await database.db
          .insert(recordingRecords)
          .values({
            organisationId,
            channelId: channel.id,
            broadcastId: broadcast.id,
            requestedByUserId: owner.userId,
            status: options.recordingStatus,
            storageKey,
            provider: 'public-replay-test',
            providerArtifactId: `artifact-${options.label}-${suffix}`,
            mediaFormat: 'mp3',
            contentType: stored.contentType,
            sizeBytes: stored.sizeBytes,
            durationMs: 3_000,
            checksumSha256: stored.checksumSha256,
            readyAt,
            publishedAt:
              options.recordingStatus === 'published' ? readyAt : null,
          })
          .returning({ id: recordingRecords.id });
        assert.ok(recording);

        return {
          recordingId: recording.id,
          channelSlug,
          broadcastSlug,
          body,
        };
      }

      const publicReplay = await createReplay({
        label: 'Public worship replay',
        visibility: 'public',
        recordingStatus: 'published',
      });
      const unlistedReplay = await createReplay({
        label: 'Unlisted meeting replay',
        visibility: 'unlisted',
        recordingStatus: 'published',
      });
      const privateReplay = await createReplay({
        label: 'Private team replay',
        visibility: 'private',
        recordingStatus: 'private',
      });

      const discovery = await app.inject({
        method: 'GET',
        url: '/api/v1/replays?limit=20',
      });
      assert.equal(discovery.statusCode, 200);
      assert.deepEqual(
        discovery.json().replays.map((replay: { recordingId: string }) => replay.recordingId),
        [publicReplay.recordingId],
      );
      assert.equal(discovery.json().replays[0].access, 'public');
      assert.equal('storageKey' in discovery.json().replays[0], false);

      const unlistedExactUrl = `/api/v1/replays/${organisationSlug}/${unlistedReplay.channelSlug}/${unlistedReplay.broadcastSlug}`;
      const unlistedExact = await app.inject({
        method: 'GET',
        url: unlistedExactUrl,
      });
      assert.equal(unlistedExact.statusCode, 200);
      assert.equal(unlistedExact.json().replay.access, 'unlisted');
      assert.equal(unlistedExact.headers['cache-control'], 'private, no-store');

      const privatePublicAttempt = await app.inject({
        method: 'GET',
        url: `/api/v1/replays/${organisationSlug}/${privateReplay.channelSlug}/${privateReplay.broadcastSlug}`,
      });
      assert.equal(privatePublicAttempt.statusCode, 404);

      const publicAccess = await app.inject({
        method: 'POST',
        url: `/api/v1/replays/${organisationSlug}/${publicReplay.channelSlug}/${publicReplay.broadcastSlug}/access`,
      });
      assert.equal(publicAccess.statusCode, 200);
      assert.equal(publicAccess.json().access.mode, 'playback');
      assert.equal(publicAccess.headers['cache-control'], 'private, no-store');

      const publicMedia = await app.inject({
        method: 'GET',
        url: publicAccess.json().access.url,
      });
      assert.equal(publicMedia.statusCode, 200);
      assert.deepEqual(publicMedia.rawPayload, publicReplay.body);

      await database.pool.query(
        `update recording_retention_controls
         set moderation_hold_at = now(),
             moderation_hold_reason = 'Revoke an already minted playback token.',
             updated_at = now()
         where recording_id = $1`,
        [publicReplay.recordingId],
      );
      const revokedPublicMedia = await app.inject({
        method: 'GET',
        url: publicAccess.json().access.url,
      });
      assert.equal(revokedPublicMedia.statusCode, 404);
      assert.equal(
        revokedPublicMedia.json().error.code,
        'RECORDING_MEDIA_NOT_FOUND',
      );
      await database.pool.query(
        `update recording_retention_controls
         set moderation_hold_at = null,
             moderation_hold_reason = null,
             updated_at = now()
         where recording_id = $1`,
        [publicReplay.recordingId],
      );

      const memberReplayUrl = `/api/v1/organisations/${organisationId}/replays/${privateReplay.recordingId}`;
      const anonymousMemberAttempt = await app.inject({
        method: 'GET',
        url: memberReplayUrl,
      });
      assert.equal(anonymousMemberAttempt.statusCode, 401);

      const strangerMemberAttempt = await app.inject({
        method: 'GET',
        url: memberReplayUrl,
        headers: { cookie: stranger.cookie },
      });
      assert.equal(strangerMemberAttempt.statusCode, 404);

      const memberReplay = await app.inject({
        method: 'GET',
        url: memberReplayUrl,
        headers: { cookie: owner.cookie },
      });
      assert.equal(memberReplay.statusCode, 200);
      assert.equal(memberReplay.json().replay.access, 'member');
      assert.equal(memberReplay.json().replay.channel.visibility, 'private');

      const memberAccess = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/recordings/${privateReplay.recordingId}/access`,
        headers: { cookie: owner.cookie },
        payload: { mode: 'playback' },
      });
      assert.equal(memberAccess.statusCode, 200);
      const memberMedia = await app.inject({
        method: 'GET',
        url: memberAccess.json().access.url,
      });
      assert.equal(memberMedia.statusCode, 200);
      assert.deepEqual(memberMedia.rawPayload, privateReplay.body);

      await database.pool.query(
        `update recording_retention_controls
         set deletion_requested_at = now(),
             purge_after = now() + interval '2 days',
             updated_at = now()
         where recording_id = $1`,
        [publicReplay.recordingId],
      );
      const deletionScheduled = await app.inject({
        method: 'GET',
        url: `/api/v1/replays/${organisationSlug}/${publicReplay.channelSlug}/${publicReplay.broadcastSlug}`,
      });
      assert.equal(deletionScheduled.statusCode, 404);

      await database.pool.query(
        `update recording_retention_controls
         set moderation_hold_at = now(),
             moderation_hold_reason = 'Preserve while moderation reviews the recording.',
             updated_at = now()
         where recording_id = $1`,
        [unlistedReplay.recordingId],
      );
      const heldUnlisted = await app.inject({
        method: 'GET',
        url: unlistedExactUrl,
      });
      assert.equal(heldUnlisted.statusCode, 404);
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
