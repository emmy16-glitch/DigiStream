import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { createPlaybackTelemetrySession } from '../src/modules/broadcasts/playback-telemetry.repository.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'playback telemetry records only token-authorized measured player events and feeds tenant analytics',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database, deliveryProvider: null });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    let ownerId = '';
    let organisationId = '';

    try {
      const register = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `telemetry-owner-${suffix}@example.test`,
          displayName: 'Telemetry Owner',
          password,
        },
      });
      assert.equal(register.statusCode, 201);
      ownerId = register.json().user.id as string;
      const cookie = responseCookie(register);

      const organisation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie },
        payload: { name: 'Telemetry Network', slug: `telemetry-${suffix}` },
      });
      assert.equal(organisation.statusCode, 201);
      organisationId = organisation.json().organisation.id as string;

      const channel = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie },
        payload: {
          name: 'Telemetry Channel',
          slug: `telemetry-channel-${suffix}`,
          visibility: 'public',
        },
      });
      assert.equal(channel.statusCode, 201);
      const channelId = channel.json().channel.id as string;

      const broadcast = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
        headers: { cookie },
        payload: { title: 'Telemetry Broadcast', slug: `telemetry-show-${suffix}` },
      });
      assert.equal(broadcast.statusCode, 201);
      const broadcastId = broadcast.json().broadcast.id as string;

      const descriptor = await createPlaybackTelemetrySession(database, broadcastId, null);
      assert.equal(descriptor.heartbeatIntervalMs, 15_000);
      assert.match(descriptor.endpoint, new RegExp(descriptor.sessionId));

      const malformedSession = await app.inject({
        method: 'POST',
        url: '/api/v1/playback-telemetry/not-a-valid-session-id',
        payload: { token: descriptor.token, event: 'started', protocol: 'webrtc' },
      });
      assert.equal(malformedSession.statusCode, 404);

      const wrongToken = await app.inject({
        method: 'POST',
        url: descriptor.endpoint,
        payload: { token: `${descriptor.token}x`, event: 'started', protocol: 'webrtc' },
      });
      assert.equal(wrongToken.statusCode, 404);

      const invalidEvent = await app.inject({
        method: 'POST',
        url: descriptor.endpoint,
        payload: { token: descriptor.token, event: 'invented_metric' },
      });
      assert.equal(invalidEvent.statusCode, 400);

      const started = await app.inject({
        method: 'POST',
        url: descriptor.endpoint,
        payload: { token: descriptor.token, event: 'started', protocol: 'webrtc' },
      });
      assert.equal(started.statusCode, 200);

      await database.pool.query(
        `update listener_playback_sessions
            set last_heartbeat_at = now() - interval '12 seconds'
          where id = $1`,
        [descriptor.sessionId],
      );

      const heartbeat = await app.inject({
        method: 'POST',
        url: descriptor.endpoint,
        payload: { token: descriptor.token, event: 'heartbeat', protocol: 'webrtc' },
      });
      assert.equal(heartbeat.statusCode, 200);

      const fallback = await app.inject({
        method: 'POST',
        url: descriptor.endpoint,
        payload: { token: descriptor.token, event: 'source_changed', protocol: 'llhls' },
      });
      assert.equal(fallback.statusCode, 200);

      const buffering = await app.inject({
        method: 'POST',
        url: descriptor.endpoint,
        payload: { token: descriptor.token, event: 'buffering', protocol: 'llhls' },
      });
      assert.equal(buffering.statusCode, 200);

      const mediaError = await app.inject({
        method: 'POST',
        url: descriptor.endpoint,
        payload: { token: descriptor.token, event: 'error', protocol: 'llhls' },
      });
      assert.equal(mediaError.statusCode, 200);

      const ended = await app.inject({
        method: 'POST',
        url: descriptor.endpoint,
        payload: { token: descriptor.token, event: 'ended', protocol: 'llhls' },
      });
      assert.equal(ended.statusCode, 200);

      const duplicateEnd = await app.inject({
        method: 'POST',
        url: descriptor.endpoint,
        payload: { token: descriptor.token, event: 'ended', protocol: 'llhls' },
      });
      assert.equal(duplicateEnd.statusCode, 200);

      const staleHeartbeat = await app.inject({
        method: 'POST',
        url: descriptor.endpoint,
        payload: { token: descriptor.token, event: 'heartbeat', protocol: 'llhls' },
      });
      assert.equal(staleHeartbeat.statusCode, 404);

      const row = await database.pool.query<{
        started_at: Date | null;
        ended_at: Date | null;
        active_seconds: number;
        buffering_events: number;
        fallback_events: number;
        media_errors: number;
        token_hash: string;
      }>(
        `select started_at, ended_at, active_seconds, buffering_events,
                fallback_events, media_errors, token_hash
           from listener_playback_sessions
          where id = $1`,
        [descriptor.sessionId],
      );
      assert.ok(row.rows[0]?.started_at);
      assert.ok(row.rows[0]?.ended_at);
      assert.ok((row.rows[0]?.active_seconds ?? 0) >= 10);
      assert.equal(row.rows[0]?.buffering_events, 1);
      assert.equal(row.rows[0]?.fallback_events, 1);
      assert.equal(row.rows[0]?.media_errors, 1);
      assert.notEqual(row.rows[0]?.token_hash, descriptor.token);

      const analyticsResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/analytics`,
        headers: { cookie },
      });
      assert.equal(analyticsResponse.statusCode, 200);
      const analytics = analyticsResponse.json().analytics;
      assert.equal(analytics.playback.measuredSessions, 1);
      assert.equal(analytics.playback.anonymousSessions, 1);
      assert.equal(analytics.playback.signedInSessions, 0);
      assert.equal(analytics.playback.activeSessions, 0);
      assert.ok(analytics.playback.measuredListeningSeconds >= 10);
      assert.equal(analytics.playback.bufferingEvents, 1);
      assert.equal(analytics.playback.fallbackEvents, 1);
      assert.equal(analytics.playback.mediaErrors, 1);
      assert.equal(analytics.playback.sessionsWithBuffering, 1);
      assert.equal(analytics.coverage.anonymousListenerReach, 'not_collected');
    } finally {
      if (organisationId) {
        await database.pool.query('delete from organisations where id = $1', [organisationId]);
      }
      if (ownerId) {
        await database.pool.query('delete from users where id = $1', [ownerId]);
      }
      await app.close();
      await database.close();
    }
  },
);
