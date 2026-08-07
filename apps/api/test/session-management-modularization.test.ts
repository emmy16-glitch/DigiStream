import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routesUrl = new URL(
  '../src/modules/auth/session-management.routes.ts',
  import.meta.url,
);
const serviceUrl = new URL(
  '../src/modules/auth/session-management.service.ts',
  import.meta.url,
);
const repositoryUrl = new URL(
  '../src/modules/auth/session-management.repository.ts',
  import.meta.url,
);
const compatibilityUrl = new URL(
  '../src/auth/session-management.routes.ts',
  import.meta.url,
);

test('session management follows route service repository ownership', async () => {
  const [routes, service, repository, compatibility] = await Promise.all([
    readFile(routesUrl, 'utf8'),
    readFile(serviceUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(compatibilityUrl, 'utf8'),
  ]);

  assert.match(routes, /listUserSessions/);
  assert.match(routes, /revokeUserSession/);
  assert.doesNotMatch(routes, /authSessions/);
  assert.doesNotMatch(routes, /drizzle-orm/);

  assert.match(service, /authenticateSessionCookie/);
  assert.match(service, /CURRENT_SESSION_REQUIRES_LOGOUT/);
  assert.match(service, /SESSION_NOT_FOUND/);
  assert.doesNotMatch(service, /\.select\(/);
  assert.doesNotMatch(service, /\.update\(/);

  assert.match(repository, /authSessions/);
  assert.match(repository, /listActiveSessions/);
  assert.match(repository, /findOwnedSession/);
  assert.match(repository, /revokeOwnedSession/);

  assert.equal(
    compatibility.trim(),
    "export { registerSessionManagementRoutes } from '../modules/auth/session-management.routes.js';",
  );
});
