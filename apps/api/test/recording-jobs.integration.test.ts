import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { organisations, users } from '../src/db/schema.js';
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
import { recordingProcessingJobs } from '../src/modules/recordings/recording-jobs.schema.js';
import { RecordingAccessManager } from '../src/modules/recordings/recording-access.js';
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
  'recording jobs lease atomically, heartbeat, retry expired work and stop at the attempt limit',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const mediaSecret = `recording-job-secret-${suffix}`;
    const objectStorage = new InMemoryObjectStorage();
    const app = buildApp({
      database,
      mediaControlSecret: mediaSecret,
      objectStorage,
      recordingAccessManager: new RecordingAccessManager(
        `recording-job-access-${suffix}-at-least-thirty-two-bytes`,
        120,
      ),
      realtime: false,
      contributionProvider: null,
      backstageProvider: null,
      deliveryProvider: null,
      mediaRelayProvider: null,
    });

    let userId: string | undefined;
    let organisationId: string | undefined;

    async function createCompletedBroadcast(
      cookie: string,
      channelId: string,
      label: string,
    ): Promise<string> {
      assert.ok(organisationId);
      const creation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
        headers: { cookie },
        payload: {
          title: `${label} recording source`,
          slug: `${label.toLowerCase()}-${suffix}`,
        },
      });
      assert.equal(creation.statusCode, 201);
      const broadcastId = creation.json().broadcast.id as string;
      await database.db
        .update(broadcastRecords)
        .set({ status: 'completed', endedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(broadcastRecords.id, broadcastId),
            eq(broadcastRecords.organisationId, organisationId),
          ),
        );
      return broadcastId;
    }

    async function requestRecording(
      cookie: string,
      broadcastId: string,
    ): Promise<string> {
      assert.ok(organisationId);
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/recording`,
        headers: { cookie },
      });
      assert.equal(response.statusCode, 201);
      return response.json().recording.id as string;
    }

    try {
      const registration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `recording-jobs-${suffix}@example.test`,
          displayName: 'Recording Job Owner',
          password: 'A-strong-test-password-123!',
        },
      });
      assert.equal(registration.statusCode, 201);
      userId = registration.json().user.id as string;
      const cookie = responseCookie(registration);

      const organisationCreation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie },
        payload: {
          name: 'Recording Job Network',
          slug: `recording-jobs-${suffix}`,
        },
      });
      assert.equal(organisationCreation.statusCode, 201);
      organisationId = organisationCreation.json().organisation.id as string;

      const channelCreation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie },
        payload: {
          name: 'Recording Job Channel',
          slug: `recording-job-channel-${suffix}`,
          visibility: 'private',
        },
      });
      assert.equal(channelCreation.statusCode, 201);
      const channelId = channelCreation.json().channel.id as string;
      for (const status of ['pending_review', 'active']) {
        const response = await app.inject({
          method: 'PATCH',
          url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
          headers: { cookie },
          payload: { status },
        });
        assert.equal(response.statusCode, 200);
      }

      const firstBroadcastId = await createCompletedBroadcast(
        cookie,
        channelId,
        'First',
      );
      const firstRecordingId = await requestRecording(cookie, firstBroadcastId);

      const unauthorizedClaim = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-jobs/claim',
        headers: { 'x-digistream-media-secret': 'wrong-secret' },
        payload: { workerId: 'worker-a' },
      });
      assert.equal(unauthorizedClaim.statusCode, 401);

      const firstClaim = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-jobs/claim',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { workerId: 'worker-a', limit: 1, leaseSeconds: 60 },
      });
      assert.equal(firstClaim.statusCode, 200);
      assert.equal(firstClaim.json().jobs.length, 1);
      const firstJob = firstClaim.json().jobs[0] as {
        id: string;
        recordingId: string;
        leaseToken: string;
        attemptCount: number;
        artifactUploadUrl: string;
      };
      assert.equal(firstJob.recordingId, firstRecordingId);
      assert.equal(firstJob.attemptCount, 1);
      assert.ok(firstJob.leaseToken.length >= 32);

      const duplicateClaim = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-jobs/claim',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { workerId: 'worker-b', limit: 1, leaseSeconds: 60 },
      });
      assert.equal(duplicateClaim.statusCode, 200);
      assert.deepEqual(duplicateClaim.json().jobs, []);

      const wrongHeartbeat = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/recording-jobs/${firstJob.id}/heartbeat`,
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          workerId: 'worker-a',
          leaseToken: `${firstJob.leaseToken}wrong`,
          extendSeconds: 60,
        },
      });
      assert.equal(wrongHeartbeat.statusCode, 409);

      const heartbeat = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/recording-jobs/${firstJob.id}/heartbeat`,
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          workerId: 'worker-a',
          leaseToken: firstJob.leaseToken,
          extendSeconds: 60,
        },
      });
      assert.equal(heartbeat.statusCode, 200);
      assert.ok(Date.parse(heartbeat.json().leaseExpiresAt) > Date.now());

      const wave = silentWave();
      const wrongLeaseUpload = await app.inject({
        method: 'PUT',
        url: firstJob.artifactUploadUrl,
        headers: {
          'content-type': 'audio/wav',
          'x-digistream-media-secret': mediaSecret,
          'x-digistream-recording-worker': 'worker-a',
          'x-digistream-recording-lease': `${firstJob.leaseToken}wrong`,
          'x-digistream-media-format': 'wav',
          'x-digistream-duration-ms': '1000',
        },
        payload: wave,
      });
      assert.equal(wrongLeaseUpload.statusCode, 409);

      const upload = await app.inject({
        method: 'PUT',
        url: firstJob.artifactUploadUrl,
        headers: {
          'content-type': 'audio/wav',
          'x-digistream-media-secret': mediaSecret,
          'x-digistream-recording-worker': 'worker-a',
          'x-digistream-recording-lease': firstJob.leaseToken,
          'x-digistream-media-format': 'wav',
          'x-digistream-duration-ms': '1000',
          'x-digistream-recording-provider': 'leased-test-worker',
        },
        payload: wave,
      });
      assert.equal(upload.statusCode, 200);
      assert.equal(upload.json().recording.status, 'ready');

      const afterCompletion = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-jobs/claim',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { workerId: 'worker-b', limit: 10, leaseSeconds: 60 },
      });
      assert.equal(afterCompletion.statusCode, 200);
      assert.deepEqual(afterCompletion.json().jobs, []);

      const secondBroadcastId = await createCompletedBroadcast(
        cookie,
        channelId,
        'Second',
      );
      const secondRecordingId = await requestRecording(cookie, secondBroadcastId);
      const secondClaim = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-jobs/claim',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { workerId: 'worker-a', limit: 1, leaseSeconds: 60 },
      });
      assert.equal(secondClaim.statusCode, 200);
      const secondJob = secondClaim.json().jobs[0] as {
        id: string;
        recordingId: string;
        leaseToken: string;
      };
      assert.equal(secondJob.recordingId, secondRecordingId);

      await database.db
        .update(recordingProcessingJobs)
        .set({
          maxAttempts: 2,
          leaseExpiresAt: new Date(Date.now() - 1_000),
          updatedAt: new Date(Date.now() - 1_000),
        })
        .where(eq(recordingProcessingJobs.id, secondJob.id));

      const reconciliation = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-jobs/reconcile',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { limit: 10 },
      });
      assert.equal(reconciliation.statusCode, 200);
      assert.equal(reconciliation.json().reconciliation.rescheduled, 1);

      await database.db
        .update(recordingProcessingJobs)
        .set({ nextAttemptAt: new Date(Date.now() - 1_000) })
        .where(eq(recordingProcessingJobs.id, secondJob.id));

      const retryClaim = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-jobs/claim',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { workerId: 'worker-b', limit: 1, leaseSeconds: 60 },
      });
      assert.equal(retryClaim.statusCode, 200);
      const retryJob = retryClaim.json().jobs[0] as {
        id: string;
        leaseToken: string;
        attemptCount: number;
      };
      assert.equal(retryJob.id, secondJob.id);
      assert.equal(retryJob.attemptCount, 2);

      const failed = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/recording-jobs/${retryJob.id}/fail`,
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          workerId: 'worker-b',
          leaseToken: retryJob.leaseToken,
          failureCode: 'capture_source_missing',
          failureMessage: 'The source capture was unavailable.',
        },
      });
      assert.equal(failed.statusCode, 200);
      assert.equal(failed.json().job.state, 'dead');
      assert.equal(failed.json().job.nextAttemptAt, null);

      const [deadJob] = await database.db
        .select()
        .from(recordingProcessingJobs)
        .where(eq(recordingProcessingJobs.id, retryJob.id));
      assert.equal(deadJob?.state, 'dead');
      assert.equal(deadJob?.leaseOwner, null);
      assert.equal(deadJob?.lastFailureCode, 'capture_source_missing');

      const exhaustedClaim = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/recording-jobs/claim',
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: { workerId: 'worker-c', limit: 10, leaseSeconds: 60 },
      });
      assert.equal(exhaustedClaim.statusCode, 200);
      assert.deepEqual(exhaustedClaim.json().jobs, []);
    } finally {
      await app.close();
      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }
      if (userId) {
        await database.db.delete(users).where(eq(users.id, userId));
      }
      await database.close();
    }
  },
);
