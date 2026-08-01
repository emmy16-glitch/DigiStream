import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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
import { recordingRecords } from '../src/modules/recordings/recordings.schema.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'recording routes keep storage keys private and enforce lifecycle authorization',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const mediaSecret = `recording-secret-${suffix}`;
    const app = buildApp({
      database,
      mediaControlSecret: mediaSecret,
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
      assert.equal(creation.json().replayed, false);
      assert.equal('storageKey' in creation.json().recording, false);
      const recordingId = creation.json().recording.id as string;

      const [stored] = await database.db
        .select({ storageKey: recordingRecords.storageKey })
        .from(recordingRecords)
        .where(eq(recordingRecords.id, recordingId));
      assert.ok(stored?.storageKey.startsWith(`recordings/${organisationId}/${broadcastId}/`));

      const replay = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/recording`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(replay.statusCode, 200);
      assert.equal(replay.json().replayed, true);
      assert.equal(replay.json().recording.id, recordingId);

      const publishTooEarly = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/recordings/${recordingId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'published' },
      });
      assert.equal(publishTooEarly.statusCode, 409);

      const unauthorizedWorker = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/organisations/${organisationId}/recordings/${recordingId}/state`,
        headers: { 'x-digistream-media-secret': 'wrong-secret' },
        payload: {
          status: 'uploading',
          provider: 'test-worker',
          providerArtifactId: `artifact-${suffix}`,
          mediaFormat: null,
          contentType: null,
          sizeBytes: null,
          durationMs: null,
          checksumSha256: null,
          processingError: null,
        },
      });
      assert.equal(unauthorizedWorker.statusCode, 401);

      for (const status of ['uploading', 'processing'] as const) {
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/internal/organisations/${organisationId}/recordings/${recordingId}/state`,
          headers: { 'x-digistream-media-secret': mediaSecret },
          payload: {
            status,
            provider: 'test-worker',
            providerArtifactId: `artifact-${suffix}`,
            mediaFormat: null,
            contentType: null,
            sizeBytes: null,
            durationMs: null,
            checksumSha256: null,
            processingError: null,
          },
        });
        assert.equal(response.statusCode, 200);
        assert.equal(response.json().recording.status, status);
      }

      const checksum = 'a'.repeat(64);
      const ready = await app.inject({
        method: 'POST',
        url: `/api/v1/internal/organisations/${organisationId}/recordings/${recordingId}/state`,
        headers: { 'x-digistream-media-secret': mediaSecret },
        payload: {
          status: 'ready',
          provider: 'test-worker',
          providerArtifactId: `artifact-${suffix}`,
          mediaFormat: 'webm',
          contentType: 'audio/webm',
          sizeBytes: 2_048_000,
          durationMs: 185_000,
          checksumSha256: checksum,
          processingError: null,
        },
      });
      assert.equal(ready.statusCode, 200);
      assert.equal(ready.json().recording.artifactReady, true);
      assert.equal(ready.json().recording.replayAvailable, false);

      const published = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/recordings/${recordingId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'published' },
      });
      assert.equal(published.statusCode, 200);
      assert.equal(published.json().recording.status, 'published');
      assert.equal(published.json().recording.replayAvailable, true);

      const analystList = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/recordings`,
        headers: { cookie: analyst.cookie },
      });
      assert.equal(analystList.statusCode, 200);
      assert.equal(analystList.json().recordings.length, 1);
      assert.equal('storageKey' in analystList.json().recordings[0], false);

      const strangerList = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/recordings`,
        headers: { cookie: stranger.cookie },
      });
      assert.equal(strangerList.statusCode, 404);
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
