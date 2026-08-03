import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const apiClientSource = readFileSync(
  resolve(process.cwd(), 'apps/web/src/lib/api-client.ts'),
  'utf8',
);

test('protected API 401 responses start one truthful sign-in recovery', () => {
  expect(apiClientSource).toContain(
    "return status === 401 && !path.startsWith(AUTH_API_PREFIX)",
  );
  expect(apiClientSource).toContain('sessionRecoveryStarted');
  expect(apiClientSource).toContain("new CustomEvent(SESSION_EXPIRED_EVENT");
  expect(apiClientSource).toContain("loginUrl.searchParams.set('reason', 'session-expired')");
  expect(apiClientSource).toContain("loginUrl.searchParams.set('returnTo', currentPath)");
  expect(apiClientSource).toContain('window.location.assign(loginUrl.toString())');
  expect(apiClientSource).toContain('recoverExpiredSession(path, response.status)');
});

test('normal authentication checks never trigger redirect recovery', () => {
  expect(apiClientSource).toContain("const AUTH_API_PREFIX = '/api/v1/auth/'");
  expect(apiClientSource).toContain(
    "window.location.pathname === '/login' || window.location.pathname === '/signup'",
  );
});
