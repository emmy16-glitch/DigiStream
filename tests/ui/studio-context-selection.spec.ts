import { expect, test } from '@playwright/test';
import type { Broadcast, Channel, Organisation } from '@digistream/contracts';
import { resolveStudioContextSelection } from '../../apps/web/src/features/broadcasting/studio-context-selection';

function organisation(id: string): Organisation {
  return {
    id,
    name: `Organisation ${id}`,
    slug: `organisation-${id}`,
    role: 'owner',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function channel(id: string, organisationId: string): Channel {
  return {
    id,
    organisationId,
    name: `Channel ${id}`,
    slug: `channel-${id}`,
    description: null,
    category: null,
    status: 'active',
    visibility: 'public',
    createdByUserId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function broadcast(
  id: string,
  organisationId: string,
  channelId: string,
  status: Broadcast['status'] = 'draft',
): Broadcast {
  return {
    id,
    organisationId,
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

test('preserves exact requested Studio context only after every relationship is re-verified', () => {
  const result = resolveStudioContextSelection({
    requested: {
      organisationId: 'o2',
      channelId: 'c2',
      broadcastId: 'b2',
    },
    organisations: [organisation('o1'), organisation('o2')],
    channels: [channel('c1', 'o1'), channel('c2', 'o2')],
    broadcasts: [broadcast('b1', 'o1', 'c1'), broadcast('b2', 'o2', 'c2', 'live')],
  });

  expect(result).toEqual({
    organisationId: 'o2',
    channelId: 'c2',
    broadcastId: 'b2',
    requestedContextPreserved: true,
  });
});

test('rejects a cross-tenant broadcast even when its identifier was requested', () => {
  const result = resolveStudioContextSelection({
    requested: {
      organisationId: 'o1',
      channelId: 'c1',
      broadcastId: 'foreign',
    },
    organisations: [organisation('o1'), organisation('o2')],
    channels: [channel('c1', 'o1')],
    broadcasts: [
      broadcast('foreign', 'o2', 'c1', 'live'),
      broadcast('safe', 'o1', 'c1', 'scheduled'),
    ],
  });

  expect(result).toEqual({
    organisationId: 'o1',
    channelId: 'c1',
    broadcastId: 'safe',
    requestedContextPreserved: false,
  });
});

test('falls back safely when requested organisation or channel is private-not-found', () => {
  const result = resolveStudioContextSelection({
    requested: {
      organisationId: 'missing-organisation',
      channelId: 'missing-channel',
      broadcastId: 'missing-broadcast',
    },
    organisations: [organisation('o1')],
    channels: [channel('c1', 'o1')],
    broadcasts: [broadcast('b1', 'o1', 'c1')],
  });

  expect(result).toEqual({
    organisationId: 'o1',
    channelId: 'c1',
    broadcastId: 'b1',
    requestedContextPreserved: false,
  });
});

test('never selects a completed broadcast for Studio contribution', () => {
  const result = resolveStudioContextSelection({
    requested: {
      organisationId: 'o1',
      channelId: 'c1',
      broadcastId: 'completed',
    },
    organisations: [organisation('o1')],
    channels: [channel('c1', 'o1')],
    broadcasts: [broadcast('completed', 'o1', 'c1', 'completed')],
  });

  expect(result).toEqual({
    organisationId: 'o1',
    channelId: 'c1',
    broadcastId: '',
    requestedContextPreserved: false,
  });
});
