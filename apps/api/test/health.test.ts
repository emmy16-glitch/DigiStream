import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';

test('GET /health reports when a database is not configured', async () => {
  process.env.NODE_ENV = 'test';
  const app = buildApp({ database: null });

  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, 'ok');
  assert.equal(response.json().service, 'digistream-api');
  assert.equal(response.json().database.status, 'not-configured');

  await app.close();
});

test('GET /api/v1/status declares chat, creator, listener, backstage and realtime capabilities', async () => {
  process.env.NODE_ENV = 'test';
  const app = buildApp({ database: null });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/status',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().stage, 'public-replay-listening');
  assert.ok(response.json().capabilities.includes('recording-object-storage'));
  assert.ok(
    response.json().capabilities.includes('database-backed-recording-job-queue'),
  );
  assert.ok(
    response.json().capabilities.includes('exclusive-recording-worker-leases'),
  );
  assert.ok(
    response.json().capabilities.includes('recording-job-reconciliation'),
  );
  assert.ok(
    response.json().capabilities.includes('recording-retention-controls'),
  );
  assert.ok(
    response.json().capabilities.includes('recording-legal-and-moderation-holds'),
  );
  assert.ok(
    response.json().capabilities.includes('recording-cleanup-reconciliation'),
  );
  assert.ok(response.json().capabilities.includes('public-replay-discovery'));
  assert.ok(
    response.json().capabilities.includes('public-and-unlisted-replay-listening'),
  );
  assert.ok(
    response.json().capabilities.includes('verified-recording-artifact-upload'),
  );
  assert.ok(
    response.json().capabilities.includes('short-lived-recording-access'),
  );
  assert.ok(
    response.json().capabilities.includes('recording-http-range-delivery'),
  );
  assert.deepEqual(response.json().responsiveTargets, [
    'mobile',
    'tablet',
    'desktop',
  ]);
  assert.ok(response.json().capabilities.includes('durable-live-chat'));
  assert.ok(
    response.json().capabilities.includes('chat-client-idempotency'),
  );
  assert.ok(
    response.json().capabilities.includes('cursor-paginated-chat-history'),
  );
  assert.ok(
    response.json().capabilities.includes('chat-reconnect-history-recovery'),
  );
  assert.ok(
    response.json().capabilities.includes('session-authenticated-websocket'),
  );
  assert.ok(
    response.json().capabilities.includes('server-authorized-realtime-rooms'),
  );
  assert.ok(response.json().capabilities.includes('local-media-compose'));
  assert.ok(response.json().capabilities.includes('live-media-smoke-test'));
  assert.ok(
    response.json().capabilities.includes('creator-livekit-browser-client'),
  );
  assert.ok(
    response.json().capabilities.includes('webrtc-first-listener-playback'),
  );
  assert.ok(
    response.json().capabilities.includes('single-use-guest-invitations'),
  );
  assert.ok(
    response.json().capabilities.includes('external-guest-browser-waiting-room'),
  );
  assert.ok(
    response.json().capabilities.includes('creator-backstage-web-workspace'),
  );
  assert.ok(
    response.json().capabilities.includes('livekit-guest-mute-and-remove'),
  );
  assert.ok(
    response.json().capabilities.includes('public-call-in-requests'),
  );
  assert.ok(
    response.json().capabilities.includes('listener-request-to-speak-controls'),
  );
  assert.ok(
    response.json().capabilities.includes('private-call-in-status-tokens'),
  );
  assert.ok(
    response.json().capabilities.includes('call-in-rate-limiting'),
  );

  await app.close();
});
