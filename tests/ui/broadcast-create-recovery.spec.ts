import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiClientPath = resolve(process.cwd(), 'apps/web/src/lib/api-client.ts');

async function apiClientSource(): Promise<string> {
  return readFile(apiClientPath, 'utf8');
}

test('broadcast creation coalesces duplicate submissions before a second POST', async () => {
  const source = await apiClientSource();

  expect(source).toContain('const broadcastCreateRequests = new Map<string, Promise<unknown>>();');
  expect(source).toContain('const existing = broadcastCreateRequests.get(key);');
  expect(source).toContain('if (existing) return existing as Promise<T>;');
  expect(source).toContain('broadcastCreateRequests.set(key, request);');
});

test('broadcast creation persists bounded recovery metadata across refresh', async () => {
  const source = await apiClientSource();

  expect(source).toContain("const BROADCAST_CREATE_PENDING_KEY = 'digistream:pending-broadcast-create';");
  expect(source).toContain('const BROADCAST_CREATE_PENDING_TTL_MS = 30 * 60 * 1000;');
  expect(source).toContain('window.sessionStorage.setItem(');
  expect(source).toContain('const priorPending = pendingBroadcastCreate();');
  expect(source).toContain('priorPending?.key === key');
  expect(source).toContain('reconcilePendingBroadcastCreate(path, body)');
});

test('ambiguous timeout-after-success reconciles the server before surfacing failure', async () => {
  const source = await apiClientSource();

  expect(source).toContain("error instanceof ApiClientError && error.status === 0");
  expect(source).toContain("error instanceof DOMException && error.name === 'AbortError'");
  expect(source).toContain("error.code === 'BROADCAST_SLUG_TAKEN'");
  expect(source).toContain('performApiRequest<BroadcastListResponse>(path)');
  expect(source).toContain('response.broadcasts.find((item) => matchesPendingBroadcast(item, body))');
  expect(source).toContain('broadcast.slug !== requested.slug');
  expect(source).toContain('broadcast.title !== requested.title');
  expect(source).toContain('broadcast.scheduledStartAt === requested.scheduledStartAt');
});

test('stale authenticated sessions clear pending creation recovery before reauthentication', async () => {
  const source = await apiClientSource();

  expect(source).toContain('window.sessionStorage.clear();');
  expect(source).toContain("recoveryError instanceof ApiClientError && recoveryError.status === 401");
  expect(source).toContain("error instanceof ApiClientError && error.status === 401");
  expect(source).toContain('clearPendingBroadcastCreate(key);');
  expect(source).toContain("window.location.replace(sessionLoginPath('session-expired', currentPath));");
});

test('recovery metadata never becomes a second broadcast authority', async () => {
  const source = await apiClientSource();

  expect(source).toContain('// Recovery metadata is best-effort. The server remains authoritative.');
  expect(source).toContain('return broadcast ? { broadcast } : null;');
  expect(source).not.toContain('localStorage.setItem(BROADCAST_CREATE_PENDING_KEY');
});
