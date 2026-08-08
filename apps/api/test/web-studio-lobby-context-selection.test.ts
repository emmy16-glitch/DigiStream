import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const overviewUrl = new URL(
  '../../web/src/features/onboarding/CreatorOverviewPage.tsx',
  import.meta.url,
);
const runtimeUrl = new URL('../../web/src/lib/backstage-context-runtime.ts', import.meta.url);

test('Overview passes its real selected Studio Lobby context before opening the existing workspace', async () => {
  const overview = await readFile(overviewUrl, 'utf8');

  assert.match(overview, /requestCreatorStudioLobbyContext/);
  assert.match(overview, /overview\.canOpenBackstage/);
  assert.match(overview, /organisationId:\s*organisation\.id/);
  assert.match(overview, /channelId:\s*overview\.selectedChannel\.id/);
  assert.match(overview, /broadcastId:\s*overview\.selectedBroadcast\.id/);
  assert.match(overview, /onOpenBackstage\(\)/);
});

test('Studio Lobby context remains a one-shot preselection hint, not authorization', async () => {
  const runtime = await readFile(runtimeUrl, 'utf8');

  assert.match(runtime, /one-shot contextual preference/);
  assert.match(runtime, /deliberately not authorization/);
  assert.match(runtime, /channel\.status === 'active'/);
  assert.match(runtime, /backstageStates\.has\(broadcast\.status\)/);
  assert.match(runtime, /broadcast\.organisationId === organisationId/);
  assert.match(runtime, /broadcast\.channelId === channelId/);
  assert.match(runtime, /requestedStudioLobbyContext = null/);
  assert.doesNotMatch(runtime, /fetch\(/);
});
