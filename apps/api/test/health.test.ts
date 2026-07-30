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

test('GET /api/v1/status declares all responsive targets', async () => {
  process.env.NODE_ENV = 'test';
  const app = buildApp({ database: null });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/status',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().stage, 'livekit-ome-egress-bridge');
  assert.deepEqual(response.json().responsiveTargets, [
    'mobile',
    'tablet',
    'desktop',
  ]);

  await app.close();
});
