import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const studioPath = path.join(
  process.cwd(),
  'apps/web/src/features/broadcasting/CreatorBroadcastStudio.tsx',
);
const recoveryPath = path.join(
  process.cwd(),
  'apps/web/src/features/broadcasting/public-delivery-recovery.ts',
);
const apiClientPath = path.join(
  process.cwd(),
  'apps/web/src/lib/api-client.ts',
);

async function source(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

test('Studio lifecycle commands use persisted versions and stable idempotency keys', async () => {
  const studio = await source(studioPath);

  expect(studio).toContain(
    "'idempotency-key': `creator-start-${current.id}-${current.lifecycleVersion}`",
  );
  expect(studio).toContain('body: jsonBody({ expectedVersion: current.lifecycleVersion })');
  expect(studio).toContain(
    "'idempotency-key': `creator-end-${current.id}-${current.lifecycleVersion}`",
  );
  expect(studio).toContain('deliveryAttemptKey(');
  expect(studio).toContain('current.id,');
  expect(studio).toContain('contribution.contribution.broadcast.lifecycleVersion,');
});

test('ambiguous delivery completion has a status-reconciliation path before another creator decision', async () => {
  const studio = await source(studioPath);
  const recovery = await source(recoveryPath);

  expect(studio).toContain('handlePublicDeliveryFailure');
  expect(studio).toContain('Private Studio audio remains connected, but public listener delivery needs recovery.');
  expect(studio).toContain('Check delivery status');
  expect(studio).toContain('checkPublicDeliveryStatus');
  expect(studio).toContain('/delivery/status');
  expect(recovery).toContain('privateStudioPreserved: true');
  expect(recovery).toContain("code = 'DELIVERY_REQUEST_FAILED'");
});

test('expired protected Studio requests use the shared reauthentication owner', async () => {
  const apiClient = await source(apiClientPath);

  expect(apiClient).toContain('status === 401');
  expect(apiClient).toContain("pathname.startsWith(CREATOR_ROUTE_PREFIX)");
  expect(apiClient).toContain('announceSessionExpired(path)');
  expect(apiClient).toContain("window.sessionStorage.clear()");
  expect(apiClient).toContain("window.location.replace(sessionLoginPath('session-expired', currentPath))");
});

test('LiveKit reconnect truth preserves live versus private-only state', async () => {
  const studio = await source(studioPath);

  expect(studio).toContain('sdk.RoomEvent.Reconnecting');
  expect(studio).toContain("setPhase('reconnecting')");
  expect(studio).toContain('sdk.RoomEvent.Reconnected');
  expect(studio).toContain("setPhase(publicDeliveryActiveRef.current ? 'live' : 'connected')");
  expect(studio).toContain('sdk.RoomEvent.Disconnected');
  expect(studio).toContain('STUDIO_DISCONNECTED_DURING_DELIVERY');
  expect(studio).toContain('Public delivery state requires recovery or a safe end.');
});

test('terminal broadcasts cannot be re-entered or offered retryable public delivery', async () => {
  const studio = await source(studioPath);
  const recovery = await source(recoveryPath);

  expect(studio).toContain("const contributionStates = new Set<Broadcast['status']>([");
  expect(studio).not.toContain("  'completed',\n  'cancelled',\n  'failed',\n]);\n\nconst studioPhasePresentation");
  expect(studio).toContain('Completed, cancelled and failed broadcasts cannot re-enter contribution.');
  expect(recovery).toContain("'completed',");
  expect(recovery).toContain("'cancelled',");
  expect(recovery).toContain("'failed',");
  expect(recovery).toContain('retryable: false');
  expect(recovery).toContain('Public delivery cannot be restarted from this Studio session.');
});

test('ending and completed recovery does not claim completion before authoritative stop', async () => {
  const studio = await source(studioPath);

  const endStart = studio.indexOf('async function endBroadcast()');
  const endEnd = studio.indexOf('async function leaveStudio()', endStart);
  const endBlock = studio.slice(endStart, endEnd);

  expect(endStart).toBeGreaterThan(-1);
  expect(endEnd).toBeGreaterThan(endStart);
  expect(endBlock).toContain("current.status === 'ending'");
  expect(endBlock).toContain('/delivery/stop');
  expect(endBlock).toContain('stopped.delivery.broadcast.status');
  expect(endBlock).toContain('await stopLocalMedia()');
  expect(endBlock.indexOf('/delivery/stop')).toBeLessThan(endBlock.indexOf('await stopLocalMedia()'));
  expect(endBlock.indexOf('await stopLocalMedia()')).toBeLessThan(endBlock.indexOf("setPhase('ended')"));
});
