import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routesUrl = new URL('../src/modules/auth/core-auth.routes.ts', import.meta.url);
const serviceUrl = new URL('../src/modules/auth/core-auth.service.ts', import.meta.url);
const repositoryUrl = new URL('../src/modules/auth/core-auth.repository.ts', import.meta.url);
const compatibilityUrl = new URL('../src/auth/routes.ts', import.meta.url);

test('core authentication follows route service repository ownership', async () => {
  const [routes, service, repository, compatibility] = await Promise.all([
    readFile(routesUrl, 'utf8'),
    readFile(serviceUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(compatibilityUrl, 'utf8'),
  ]);

  assert.match(routes, /registerWithEmail/);
  assert.match(routes, /loginWithEmail/);
  assert.match(routes, /loginWithGoogle/);
  assert.match(routes, /getCurrentUser/);
  assert.doesNotMatch(routes, /SELECT /);
  assert.doesNotMatch(routes, /INSERT INTO/);
  assert.doesNotMatch(routes, /database\.pool\.query/);

  assert.match(service, /verifyPassword/);
  assert.match(service, /verifyGoogleIdentityToken/);
  assert.match(service, /createSessionMaterial/);
  assert.match(service, /CoreAuthError/);
  assert.doesNotMatch(service, /SELECT /);
  assert.doesNotMatch(service, /INSERT INTO/);
  assert.doesNotMatch(service, /UPDATE auth_/);

  assert.match(repository, /INSERT INTO users/);
  assert.match(repository, /auth_identities/);
  assert.match(repository, /auth_sessions/);
  assert.match(repository, /user_platform_capabilities/);
  assert.match(repository, /findCurrentSessionUser/);

  assert.equal(
    compatibility.trim(),
    "export { registerAuthRoutes } from '../modules/auth/core-auth.routes.js';",
  );
});
