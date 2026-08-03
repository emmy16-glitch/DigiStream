import { expect, test } from '@playwright/test';
import type { Broadcast, Channel } from '@digistream/contracts';
import { creatorOverviewDerivation } from '../../apps/web/src/features/onboarding/overview-state';

function channel(status: Channel['status'], id = 'c1'): Channel {
  return {
    id,
    organisationId: 'o1',
    name: `Channel ${id}`,
    slug: `channel-${id}`,
    description: null,
    category: null,
    status,
    visibility: 'public',
    createdByUserId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function broadcast(status: Broadcast['status'], channelId = 'c1', id = 'b1'): Broadcast {
  return {
    id,
    organisationId: 'o1',
    channelId,
    createdByUserId: 'u1',
    title: `Broadcast ${id}`,
    slug: `broadcast-${id}`,
    description: null,
    status,
    scheduledStartAt: null,
    startRequestedAt: null,
    liveStartedAt: null,
    endRequestedAt: null,
    endedAt: null,
    cancelledAt: null,
    contributionRoomName: 'room',
    deliveryStreamName: 'stream',
    contributionReadyAt: null,
    deliveryReadyAt: null,
    failureReason: null,
    lifecycleVersion: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

test('active channel with no broadcast derives a create-broadcast next action and no dead studio or backstage actions', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active')],
    broadcasts: [],
  });
  expect(result.setupState).toBe('create_broadcast');
  expect(result.selectedChannel?.id).toBe('c1');
  expect(result.selectedBroadcast).toBeNull();
  expect(result.canOpenStudio).toBe(false);
  expect(result.canOpenBackstage).toBe(false);
});

test('organisation with no channel derives a create-channel next action', () => {
  const result = creatorOverviewDerivation({ channels: [], broadcasts: [] });
  expect(result.setupState).toBe('create_channel');
  expect(result.selectedChannel).toBeNull();
  expect(result.selectedBroadcast).toBeNull();
  expect(result.canOpenStudio).toBe(false);
  expect(result.canOpenBackstage).toBe(false);
});

test('insufficient permission leaves the channel awaiting activation without exposing a dead studio or backstage action', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('pending_review')],
    broadcasts: [],
  });
  expect(result.setupState).toBe('finish_channel_activation');
  expect(result.canOpenStudio).toBe(false);
  expect(result.canOpenBackstage).toBe(false);
});

test('active channel with a scheduled broadcast derives a prepare-broadcast state with exact context', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active')],
    broadcasts: [broadcast('scheduled')],
  });
  expect(result.setupState).toBe('prepare_broadcast');
  expect(result.selectedChannel?.id).toBe('c1');
  expect(result.selectedBroadcast?.id).toBe('b1');
  expect(result.canOpenStudio).toBe(true);
  expect(result.canOpenBackstage).toBe(true);
});

test('active channel with a live broadcast derives a manage-live state', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active')],
    broadcasts: [broadcast('live')],
  });
  expect(result.setupState).toBe('manage_live_broadcast');
  expect(result.selectedBroadcast?.status).toBe('live');
  expect(result.canOpenStudio).toBe(true);
  expect(result.canOpenBackstage).toBe(true);
});

test('draft broadcast opens Studio but not Backstage before a backstage-capable lifecycle exists', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active')],
    broadcasts: [broadcast('draft')],
  });
  expect(result.setupState).toBe('prepare_broadcast');
  expect(result.canOpenStudio).toBe(true);
  expect(result.canOpenBackstage).toBe(false);
});

test('ending broadcast remains manageable in Studio without exposing an unsafe Backstage action', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active')],
    broadcasts: [broadcast('ending')],
  });
  expect(result.setupState).toBe('manage_live_broadcast');
  expect(result.canOpenStudio).toBe(true);
  expect(result.canOpenBackstage).toBe(false);
});

test('a broadcast in a final state is selected for truthful completion but not Studio or Backstage', () => {
  for (const status of ['completed', 'cancelled', 'failed'] as const) {
    const result = creatorOverviewDerivation({
      channels: [channel('active')],
      broadcasts: [broadcast(status)],
    });
    expect(result.setupState).toBe('view_completed_broadcast');
    expect(result.selectedBroadcast?.status).toBe(status);
    expect(result.canOpenStudio).toBe(false);
    expect(result.canOpenBackstage).toBe(false);
  }
});

test('inactive channel cannot derive a broadcast action even when a broadcast status exists', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('draft')],
    broadcasts: [broadcast('live')],
  });
  expect(result.setupState).toBe('finish_channel_activation');
  expect(result.selectedBroadcast).toBeNull();
  expect(result.canOpenStudio).toBe(false);
  expect(result.canOpenBackstage).toBe(false);
});

test('live broadcast is prioritised over a lower-significance broadcast in the same channel', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active')],
    broadcasts: [broadcast('completed', 'c1', 'completed'), broadcast('live', 'c1', 'live')],
  });
  expect(result.setupState).toBe('manage_live_broadcast');
  expect(result.selectedBroadcast?.id).toBe('live');
  expect(result.canOpenStudio).toBe(true);
});

test('exact channel is selected when the strongest broadcast belongs to a later active channel', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active', 'c1'), channel('active', 'c2')],
    broadcasts: [
      broadcast('scheduled', 'c1', 'scheduled'),
      broadcast('live', 'c2', 'live-second-channel'),
    ],
  });
  expect(result.setupState).toBe('manage_live_broadcast');
  expect(result.selectedChannel?.id).toBe('c2');
  expect(result.selectedBroadcast?.id).toBe('live-second-channel');
});

test('orphaned broadcasts are ignored instead of exposing an invalid contextual action', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active', 'c1')],
    broadcasts: [broadcast('live', 'missing-channel', 'orphaned')],
  });
  expect(result.setupState).toBe('create_broadcast');
  expect(result.selectedChannel?.id).toBe('c1');
  expect(result.selectedBroadcast).toBeNull();
  expect(result.canOpenStudio).toBe(false);
  expect(result.canOpenBackstage).toBe(false);
});

test('same-status selection prefers the highest persisted lifecycle version independent of API ordering', () => {
  const older = broadcast('live', 'c1', 'older-version');
  older.lifecycleVersion = 3;
  older.updatedAt = '2026-02-03T00:00:00Z';
  const authoritative = broadcast('live', 'c1', 'authoritative-version');
  authoritative.lifecycleVersion = 4;
  authoritative.updatedAt = '2026-02-01T00:00:00Z';

  for (const broadcasts of [
    [older, authoritative],
    [authoritative, older],
  ]) {
    const result = creatorOverviewDerivation({
      channels: [channel('active')],
      broadcasts,
    });
    expect(result.selectedBroadcast?.id).toBe('authoritative-version');
  }
});

test('same-status and version selection prefers the newest persisted resource independent of API ordering', () => {
  const older = broadcast('scheduled', 'c1', 'older');
  older.updatedAt = '2026-02-01T00:00:00Z';
  const newer = broadcast('scheduled', 'c1', 'newer');
  newer.updatedAt = '2026-02-02T00:00:00Z';

  for (const broadcasts of [
    [older, newer],
    [newer, older],
  ]) {
    const result = creatorOverviewDerivation({
      channels: [channel('active')],
      broadcasts,
    });
    expect(result.selectedBroadcast?.id).toBe('newer');
  }
});

test('active channel selection is deterministic when no broadcast exists and API ordering changes', () => {
  const older = channel('active', 'older-channel');
  older.updatedAt = '2026-02-01T00:00:00Z';
  const newer = channel('active', 'newer-channel');
  newer.updatedAt = '2026-02-02T00:00:00Z';

  for (const channels of [
    [older, newer],
    [newer, older],
  ]) {
    const result = creatorOverviewDerivation({ channels, broadcasts: [] });
    expect(result.setupState).toBe('create_broadcast');
    expect(result.selectedChannel?.id).toBe('newer-channel');
    expect(result.selectedBroadcast).toBeNull();
  }
});

test('inactive channel fallback is deterministic when API ordering changes', () => {
  const older = channel('draft', 'older-draft');
  older.updatedAt = '2026-02-01T00:00:00Z';
  const newer = channel('archived', 'newer-archived');
  newer.updatedAt = '2026-02-02T00:00:00Z';

  for (const channels of [
    [older, newer],
    [newer, older],
  ]) {
    const result = creatorOverviewDerivation({ channels, broadcasts: [] });
    expect(result.setupState).toBe('finish_channel_activation');
    expect(result.channelStatus).toBe('archived');
    expect(result.selectedChannel?.id).toBe('newer-archived');
  }
});
