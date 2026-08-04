import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiClientPath = resolve(process.cwd(), 'apps/web/src/lib/api-client.ts');
const coordinationPath = resolve(
  process.cwd(),
  'apps/web/src/lib/session-coordination.ts',
);

test('a protected-route 401 clears tab state, coordinates expiry and replaces history', async () => {
  const source = await readFile(apiClientPath, 'utf8');

  expect(source).toContain('window.sessionStorage.clear();');
  expect(source).toContain('announceSessionExpired(path);');
  expect(source).toContain("sessionLoginPath('session-expired', currentPath)");
  expect(source).toContain('window.location.replace(');
  expect(source).not.toContain('window.location.assign(loginUrl.toString())');
});

test('session expiry and sign out use one validated cross-tab message channel', async () => {
  const source = await readFile(coordinationPath, 'utf8');

  expect(source).toContain("type SessionCoordinationReason = 'signed-out' | 'session-expired'");
  expect(source).toContain("const SESSION_COORDINATION_STORAGE_KEY = 'digistream:session-coordination'");
  expect(source).toContain("candidate.reason !== 'signed-out'");
  expect(source).toContain("candidate.reason !== 'session-expired'");
  expect(source).toContain('if (!message) return;');
});

test('other protected tabs preserve their own safe return target and cannot restore protected history', async () => {
  const source = await readFile(coordinationPath, 'utf8');

  expect(source).toContain('isProtectedCreatorPath(window.location.pathname)');
  expect(source).toContain('window.sessionStorage.clear();');
  expect(source).toContain('window.location.replace(sessionLoginPath(message.reason, returnTo));');
  expect(source).toContain("message.sourcePath ?? 'cross-tab-session-expired'");
});

test('network and invalid-response copy is concise and operation-neutral', async () => {
  const source = await readFile(apiClientPath, 'utf8');

  expect(source).toContain("We couldn't reach the server. Check your connection and try again.");
  expect(source).toContain('The server returned a response this page could not read.');
  expect(source).not.toContain('DigiStream could not connect to the application server.');
  expect(source).not.toContain('DigiStream received an invalid response from the application server.');
});
