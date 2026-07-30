import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { ApiError } from '../src/http/errors.js';

process.env.NODE_ENV = 'test';

test('unknown routes return a stable error envelope and request ID', async () => {
  const app = buildApp({ database: null });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/does-not-exist',
  });

  const payload = response.json();

  assert.equal(response.statusCode, 404);
  assert.equal(payload.error.code, 'ROUTE_NOT_FOUND');
  assert.equal(
    payload.error.message,
    'The requested API route was not found.',
  );
  assert.equal(typeof payload.error.requestId, 'string');
  assert.ok(payload.error.requestId.length > 0);
  assert.equal(response.headers['x-request-id'], payload.error.requestId);

  await app.close();
});

test('expected API errors keep their status and safe public details', async () => {
  const app = buildApp({ database: null });

  app.get('/api/v1/test/conflict', async () => {
    throw new ApiError(409, 'TEST_CONFLICT', 'The test resource conflicts.', {
      field: 'slug',
    });
  });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/test/conflict',
  });

  const payload = response.json();

  assert.equal(response.statusCode, 409);
  assert.equal(payload.error.code, 'TEST_CONFLICT');
  assert.equal(payload.error.message, 'The test resource conflicts.');
  assert.deepEqual(payload.error.details, { field: 'slug' });
  assert.equal(response.headers['x-request-id'], payload.error.requestId);

  await app.close();
});

test('unexpected failures do not expose internal error messages', async () => {
  const app = buildApp({ database: null });

  app.get('/api/v1/test/internal-error', async () => {
    throw new Error('database password secret-example leaked in stack');
  });

  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/test/internal-error',
  });

  const body = response.body;
  const payload = response.json();

  assert.equal(response.statusCode, 500);
  assert.equal(payload.error.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(
    payload.error.message,
    'The server could not complete the request.',
  );
  assert.equal(response.headers['x-request-id'], payload.error.requestId);
  assert.equal(body.includes('secret-example'), false);
  assert.equal(body.includes('stack'), false);

  await app.close();
});
