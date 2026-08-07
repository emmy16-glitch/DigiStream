import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routesUrl = new URL(
  '../src/modules/auth/account-recovery.routes.ts',
  import.meta.url,
);
const serviceUrl = new URL(
  '../src/modules/auth/account-recovery.service.ts',
  import.meta.url,
);
const repositoryUrl = new URL(
  '../src/modules/auth/account-recovery.repository.ts',
  import.meta.url,
);
const compatibilityUrl = new URL(
  '../src/auth/account-recovery.routes.ts',
  import.meta.url,
);

test('account recovery follows route service repository ownership', async () => {
  const [routes, service, repository, compatibility] = await Promise.all([
    readFile(routesUrl, 'utf8'),
    readFile(serviceUrl, 'utf8'),
    readFile(repositoryUrl, 'utf8'),
    readFile(compatibilityUrl, 'utf8'),
  ]);

  assert.match(routes, /requestEmailVerification/);
  assert.match(routes, /confirmPasswordResetToken/);
  assert.doesNotMatch(routes, /auth_account_tokens/);
  assert.doesNotMatch(routes, /database\.pool\.query/);

  assert.match(service, /authenticateSessionCookie/);
  assert.match(service, /hashPassword/);
  assert.match(service, /EMAIL_DELIVERY_UNAVAILABLE/);
  assert.match(service, /requestPasswordReset/);
  assert.doesNotMatch(service, /SELECT /);
  assert.doesNotMatch(service, /UPDATE /);

  assert.match(repository, /auth_account_tokens/);
  assert.match(repository, /persistAccountToken/);
  assert.match(repository, /confirmEmailVerification/);
  assert.match(repository, /confirmPasswordReset/);

  assert.equal(
    compatibility.trim(),
    "export { registerAccountRecoveryRoutes } from '../modules/auth/account-recovery.routes.js';",
  );
});
