import { expect, test } from '@playwright/test';
import type { Broadcast, Channel } from '@digistream/contracts';
import { creatorOverviewDerivation } from '../../apps/web/src/features/onboarding/overview-state';

function channel(status: Channel['status']): Channel {
  return {
    id: 'c1',
    organisationId: 'o1',
    name: 'Main channel',
    slug: 'main-channel',
    description: null,
    category: null,
    status,
    visibility: 'public',
    createdByUserId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function broadcast(status: Broadcast['status']): Broadcast {
  return {
    id: 'b1',
    organisationId: 'o1',
    channelId: 'c1',
    createdByUserId: 'u1',
    title: 'Sunday broadcast',
    slug: 'sunday-broadcast',
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
  expect(result.canOpenStudio).toBe(false);
  expect(result.canOpenBackstage).toBe(false);
});

test('organisation with no channel derives a create-channel next action', () => {
  const result = creatorOverviewDerivation({ channels: [], broadcasts: [] });
  expect(result.setupState).toBe('create_channel');
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

test('active channel with a scheduled broadcast derives a prepare-broadcast state with a valid studio and backstage action', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active')],
    broadcasts: [broadcast('scheduled')],
  });
  expect(result.setupState).toBe('prepare_broadcast');
  expect(result.canOpenStudio).toBe(true);
  expect(result.canOpenBackstage).toBe(true);
});

test('active channel with a live broadcast derives a manage-live state', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active')],
    broadcasts: [broadcast('live')],
  });
  expect(result.setupState).toBe('manage_live_broadcast');
  expect(result.canOpenStudio).toBe(true);
  expect(result.canOpenBackstage).toBe(true);
});

test('a broadcast in a final state is not a valid studio or backstage broadcast', () => {
  for (const status of ['completed', 'cancelled', 'failed'] as const) {
    const result = creatorOverviewDerivation({
      channels: [channel('active')],
      broadcasts: [broadcast(status)],
    });
    expect(result.setupState).toBe('view_completed_broadcast');
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
  expect(result.canOpenStudio).toBe(false);
  expect(result.canOpenBackstage).toBe(false);
});

test('live broadcast is prioritised over a lower-significance broadcast in the same channel', () => {
  const result = creatorOverviewDerivation({
    channels: [channel('active')],
    broadcasts: [broadcast('completed'), broadcast('live')],
  });
  expect(result.setupState).toBe('manage_live_broadcast');
  expect(result.canOpenStudio).toBe(true);
});
