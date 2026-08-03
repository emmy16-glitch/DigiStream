import { expect, test } from '@playwright/test';
import type { Broadcast, Channel } from '@digistream/contracts';
import { creatorOverviewDerivation } from '../../apps/web/src/features/onboarding/overview-state';

function activeChannel(): Channel {
  return {
    id: 'channel-shared-id',
    organisationId: 'organisation-a',
    name: 'Organisation A channel',
    slug: 'organisation-a-channel',
    description: null,
    category: null,
    status: 'active',
    visibility: 'public',
    createdByUserId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function crossOrganisationBroadcast(): Broadcast {
  return {
    id: 'broadcast-from-organisation-b',
    organisationId: 'organisation-b',
    channelId: 'channel-shared-id',
    createdByUserId: 'user-b',
    title: 'Wrong tenant live broadcast',
    slug: 'wrong-tenant-live-broadcast',
    description: null,
    status: 'live',
    scheduledStartAt: null,
    startRequestedAt: null,
    liveStartedAt: '2026-01-01T00:00:00Z',
    endRequestedAt: null,
    endedAt: null,
    cancelledAt: null,
    contributionRoomName: 'other-tenant-room',
    deliveryStreamName: 'other-tenant-stream',
    contributionReadyAt: '2026-01-01T00:00:00Z',
    deliveryReadyAt: '2026-01-01T00:00:00Z',
    failureReason: null,
    lifecycleVersion: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

test('overview rejects a broadcast whose organisation does not match its channel', () => {
  const result = creatorOverviewDerivation({
    channels: [activeChannel()],
    broadcasts: [crossOrganisationBroadcast()],
  });

  expect(result.setupState).toBe('create_broadcast');
  expect(result.selectedChannel?.id).toBe('channel-shared-id');
  expect(result.selectedBroadcast).toBeNull();
  expect(result.canOpenStudio).toBe(false);
  expect(result.canOpenBackstage).toBe(false);
});
