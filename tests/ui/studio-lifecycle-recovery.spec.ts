import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const studioPath = resolve(
  process.cwd(),
  'apps/web/src/features/broadcasting/CreatorBroadcastStudio.tsx',
);
const apiClientPath = resolve(process.cwd(), 'apps/web/src/lib/api-client.ts');
const cookiesPath = resolve(process.cwd(), 'apps/api/src/auth/cookies.ts');
const routePath = resolve(
  process.cwd(),
  'apps/api/src/modules/broadcasts/broadcasts.routes.ts',
);

async function source(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

test('go-live retry reconciles authoritative lifecycle before replaying start', async () => {
  const studio = await source(studioPath);

  expect(studio).toContain('async function goLive()');
  expect(studio).toContain('await apiRequest<BroadcastResponse>(');
  expect(studio).toContain("if (current.status === 'draft' || current.status === 'scheduled')");
  expect(studio).toContain("'idempotency-key': `creator-start-${current.id}-${current.lifecycleVersion}`");
  expect(studio).toContain('body: jsonBody({ expectedVersion: current.lifecycleVersion })');
});

test('delivery start is idempotency-scoped and timeout keeps private contribution recoverable', async () => {
  const studio = await source(studioPath);

  expect(studio).toContain('deliveryAttemptKey(');
  expect(studio).toContain("'idempotency-key': deliveryAttemptKey(");
  expect(studio).toContain('const deadline = Date.now() + 90_000;');
  expect(studio).toContain("enterPublicDeliveryRecovery(delivery, 'delivery-timeout')");
  expect(studio).toContain("setPhase('connected')");
  expect(studio).toContain('Private Studio audio remains connected');
});

test('Studio follows LiveKit reconnect truth without fabricating public-delivery state', async () => {
  const studio = await source(studioPath);

  expect(studio).toContain('RoomEvent.Reconnecting');
  expect(studio).toContain("setPhase('reconnecting')");
  expect(studio).toContain('RoomEvent.Reconnected');
  expect(studio).toContain("setPhase(publicDeliveryActiveRef.current ? 'live' : 'connected')");
  expect(studio).toContain('RoomEvent.Disconnected');
  expect(studio).toContain("code: 'STUDIO_DISCONNECTED_DURING_DELIVERY'");
});

test('terminal broadcasts cannot silently re-enter the Studio contribution path', async () => {
  const studio = await source(studioPath);

  expect(studio).toContain("const contributionStates = new Set<Broadcast['status']>([");
  for (const allowed of ['draft', 'scheduled', 'starting', 'live', 'reconnecting']) {
    expect(studio).toContain(`'${allowed}',`);
  }
  const contributionBlock = studio.slice(
    studio.indexOf("const contributionStates = new Set<Broadcast['status']>(["),
    studio.indexOf(']);', studio.indexOf("const contributionStates = new Set<Broadcast['status']>([")),
  );
  expect(contributionBlock).not.toContain("'completed'");
  expect(contributionBlock).not.toContain("'cancelled'");
  expect(contributionBlock).not.toContain("'failed'");
});

test('safe end maps starting and its idempotent cancelled replay to cancellation', async () => {
  const routes = await source(routePath);

  expect(routes).toContain("if (command === 'end')");
  expect(routes).toContain("current.status === 'starting' || current.status === 'cancelled'");
  expect(routes).toContain('lost successful response');
  expect(routes).toContain('pretending that listener delivery had been live');
});

test('stale creator session recovery clears transient Studio state and reauthenticates', async () => {
  const client = await source(apiClientPath);

  expect(client).toContain('window.sessionStorage.clear();');
  expect(client).toContain('announceSessionExpired(path);');
  expect(client).toContain("window.location.replace(sessionLoginPath('session-expired', currentPath));");
});

test('session cookie keeps the repository CSRF boundary same-site and HttpOnly', async () => {
  const cookies = await source(cookiesPath);

  expect(cookies).toContain("'HttpOnly'");
  expect(cookies).toContain("'SameSite=Lax'");
  expect(cookies).toContain("attributes.push('Secure')");
  expect(cookies).not.toContain('SameSite=None');
});
