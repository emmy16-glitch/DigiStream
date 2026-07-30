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

test('GET /api/v1/status declares creator broadcasting capabilities', async () => {
  process.env.NODE_ENV = 'test';
  const app = buildApp({ database: null });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/status',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().stage, 'creator-broadcast-client');
  assert.deepEqual(response.json().responsiveTargets, [
    'mobile',
    'tablet',
    'desktop',
  ]);
  assert.ok(response.json().capabilities.includes('local-media-compose'));
  assert.ok(response.json().capabilities.includes('live-media-smoke-test'));
  assert.ok(
    response.json().capabilities.includes('creator-livekit-browser-client'),
  );
  assert.ok(
    response.json().capabilities.includes('verified-browser-contribution-readiness'),
  );

  await app.close();
});
