import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  organisationMemberships,
  organisations,
  users,
} from '../src/db/schema.js';
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
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

function silentWave(durationMs = 1_000, sampleRate = 8_000): Buffer {
  const sampleCount = Math.floor((sampleRate * durationMs) / 1_000);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

test(
  'recording artifacts are stored, verified and delivered through short-lived authorised range access',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const mediaSecret = `recording-secret-${suffix}`;
    const objectStorage = new InMemoryObjectStorage();
    const app = buildApp({
      database,
      mediaControlSecret: mediaSecret,
      objectStorage,
      recordingAccessManager: new RecordingAccessManager(
        `recording-access-secret-${suffix}-at-least-thirty-two-bytes`,
        120,
      ),
      realtime: false,
      contributionProvider: null,
      backstageProvider: null,
      deliveryProvider: null,
      mediaRelayProvider: null,
    });
    const userIds: string[] = [];
    let organisationId: string | undefined;

    async function register(
      label: string,
    ): Promise<{ userId: string; cookie: string }> {
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
      const analyst = await register('Analyst');
      const stranger = await register('Stranger');

      const organisationCreation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Recording Test Network',
          slug: `recording-test-${suffix}`,
        },
      });
      assert.equal(organisationCreation.statusCode, 201);
      organisationId = organisationCreation.json().organisation.id as string;

      await database.db.insert(organisationMemberships).values({
        organisationId,
        userId: analyst.userId,
        role: 'analyst',
        invitedByUserId: owner.userId,
      });

      const channelCreation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Replay Channel',
          slug: `replay-${suffix}`,
          visibility: 'public',
        },
      });
      assert.equal(channelCreation.statusCode, 201);
      const channelId = channelCreation.json().channel.id as string;

      for (const status of ['pending_review', 'active']) {
        const response = await app.inject({
          method: 'PATCH',
          url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
          headers: { cookie: owner.cookie },
          payload: { status },
        });
        assert.equal(response.statusCode, 200);
      }

      const broadcastCreation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
        headers: { cookie: owner.cookie },
        payload: {
          title: 'Completed replay source',
          slug: `completed-${suffix}`,
        },
      });
      assert.equal(broadcastCreation.statusCode, 201);
      const broadcastId = broadcastCreation.json().broadcast.id as string;

      const premature = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/recording`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(premature.statusCode, 409);
      assert.equal(premature.json().error.code, 'BROADCAST_NOT_COMPLETED');

      await database.db
        .update(broadcastRecords)
        .set({
          status: 'completed',
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(broadcastRecords.id, broadcastId),
            eq(broadcastRecords.organisationId, organisationId),
          ),
        );

      const analystRequest = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/recording`,
        headers: { cookie: analyst.cookie },
      });
      assert.equal(analystRequest.statusCode, 403);

      const creation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/recording`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(creation.statusCode, 201);
      assert.equal(creation.json().recording.status, 'recording');
      assert.equal('storageKey' in creation.json().recording, false);
      const recordingId = creation.json().recording.id as string;

      const [stored] = await database.db
        .select({ storageKey: recordingRecords.storageKey })
        .from(recordingRecords)
        .where(eq(recordingRecords.id, recordingId));
      assert.ok(stored?.storageKey.startsWith(`recordings/${organisationId}/${broadcastId}/`));

      const publishTooEarly = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/recordings/${recordingId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'published' },
      });
      assert.equal(publishTooEarly.statusCode, 409);

      const fabricatedReady = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/organisations/${organisationId}/recordings/${recordingId}/state`,
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          status: 'ready',
          provider: 'unverified-worker',
          providerArtifactId: `artifact-${suffix}`,
          mediaFormat: 'wav',
          contentType: 'audio/wav',
          sizeBytes: 100,
          durationMs: 1_000,
          checksumSha256: 'a'.repeat(64),
          processingError: null,
        },
      });
      assert.equal(fabricatedReady.statusCode, 409);
      assert.equal(
        fabricatedReady.json().error.code,
        'RECORDING_ARTIFACT_UPLOAD_REQUIRED',
      );

      const wave = silentWave();
      const checksum = createHash('sha256').update(wave).digest('hex');
      const uploadUrl = `/api/v1/internal/organisations/${organisationId}/recordings/${recordingId}/artifact`;
      const unauthorizedUpload = await app.inject({
        method: 'PUT',
        url: uploadUrl,
        headers: {
          'content-type': 'audio/wav',
          'x-digistream-media-secret': 'wrong-secret',
          'x-digistream-media-format': 'wav',
          'x-digistream-duration-ms': '1000',
        },
        payload: wave,
      });
      assert.equal(unauthorizedUpload.statusCode, 401);

      const upload = await app.inject({
        method: 'PUT',
        url: uploadUrl,
        headers: {
          'content-type': 'audio/wav',
          'x-digistream-media-secret': mediaSecret,
          'x-digistream-media-format': 'wav',
          'x-digistream-duration-ms': '1000',
          'x-digistream-recording-provider': 'integration-worker',
          'x-digistream-provider-artifact-id': `artifact-${suffix}`,
        },
        payload: wave,
      });
      assert.equal(upload.statusCode, 200);
      assert.equal(upload.json().recording.status, 'ready');
      assert.equal(upload.json().recording.checksumSha256, checksum);
      assert.equal(upload.json().recording.sizeBytes, wave.byteLength);
      assert.equal(upload.json().recording.durationMs, 1_000);
      assert.equal(upload.json().recording.artifactReady, true);

      const published = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/recordings/${recordingId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'published' },
      });
      assert.equal(published.statusCode, 200);
      assert.equal(published.json().recording.replayAvailable, true);

      const playbackAccess = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/recordings/${recordingId}/access`,
        headers: { cookie: analyst.cookie },
        payload: { mode: 'playback' },
      });
      assert.equal(playbackAccess.statusCode, 200);
      const playbackUrl = playbackAccess.json().access.url as string;
      assert.ok(playbackUrl.startsWith('/api/v1/recording-media/'));
      assert.equal(playbackUrl.includes(stored?.storageKey ?? 'impossible'), false);

      const playback = await app.inject({ method: 'GET', url: playbackUrl });
      assert.equal(playback.statusCode, 200);
      assert.deepEqual(playback.rawPayload, wave);
      assert.match(String(playback.headers['content-type']), /^audio\/wav/);
      assert.match(String(playback.headers['content-disposition']), /^inline;/);
      assert.equal(playback.headers['accept-ranges'], 'bytes');

      const range = await app.inject({
        method: 'GET',
        url: playbackUrl,
        headers: { range: 'bytes=0-15' },
      });
      assert.equal(range.statusCode, 206);
      assert.deepEqual(range.rawPayload, wave.subarray(0, 16));
      assert.equal(range.headers['content-range'], `bytes 0-15/${wave.byteLength}`);

      const invalidRange = await app.inject({
        method: 'GET',
        url: playbackUrl,
        headers: { range: `bytes=${wave.byteLength}-` },
      });
      assert.equal(invalidRange.statusCode, 416);
      assert.equal(invalidRange.headers['content-range'], `bytes */${wave.byteLength}`);

      const downloadAccess = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/recordings/${recordingId}/access`,
        headers: { cookie: owner.cookie },
        payload: { mode: 'download' },
      });
      assert.equal(downloadAccess.statusCode, 200);
      const download = await app.inject({
        method: 'GET',
        url: downloadAccess.json().access.url,
      });
      assert.equal(download.statusCode, 200);
      assert.match(String(download.headers['content-disposition']), /^attachment;/);

      const strangerAccess = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/recordings/${recordingId}/access`,
        headers: { cookie: stranger.cookie },
        payload: { mode: 'playback' },
      });
      assert.equal(strangerAccess.statusCode, 404);

      const archived = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/recordings/${recordingId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'archived' },
      });
      assert.equal(archived.statusCode, 200);
      const revokedPlayback = await app.inject({ method: 'GET', url: playbackUrl });
      assert.equal(revokedPlayback.statusCode, 404);

      const analystList = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/recordings`,
        headers: { cookie: analyst.cookie },
      });
      assert.equal(analystList.statusCode, 200);
      assert.equal(analystList.json().recordings.length, 1);
      assert.equal('storageKey' in analystList.json().recordings[0], false);
    } finally {
      try {
        if (organisationId) {
          await database.db
            .delete(organisations)
            .where(eq(organisations.id, organisationId));
        }
        for (const userId of userIds) {
          await database.db.delete(users).where(eq(users.id, userId));
        }
      } finally {
        await app.close();
        await database.close();
      }
    }
  },
);
