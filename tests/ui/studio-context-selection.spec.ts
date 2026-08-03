import { expect, test } from '@playwright/test';
import type { Broadcast, Channel, Organisation } from '@digistream/contracts';
import { resolveStudioContextSelection } from '../../apps/web/src/features/broadcasting/studio-context-selection';

function organisation(id: string, updatedAt = '2026-01-01T00:00:00Z'): Organisation {
  return {
    id,
    name: `Organisation ${id}`,
    slug: `organisation-${id}`,
    role: 'owner',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt,
  };
}

function channel(
  id: string,
  organisationId: string,
  status: Channel['status'] = 'active',
  updatedAt = '2026-01-01T00:00:00Z',
): Channel {
  return {
    id,
    organisationId,
    name: `Channel ${id}`,
    slug: `channel-${id}`,
    description: null,
    category: null,
    status,
    visibility: 'public',
    createdByUserId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt,
  };
}

function broadcast(
  id: string,
  organisationId: string,
  channelId: string,
  status: Broadcast['status'] = 'draft',
  lifecycleVersion = 0,
  updatedAt = '2026-01-01T00:00:00Z',
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
    lifecycleVersion,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt,
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

test('rejects inactive requested channels and does not expose their broadcasts to Studio', () => {
  const result = resolveStudioContextSelection({
    requested: {
      organisationId: 'o1',
      channelId: 'inactive',
      broadcastId: 'blocked',
    },
    organisations: [organisation('o1')],
    channels: [
      channel('inactive', 'o1', 'pending_review', '2026-03-01T00:00:00Z'),
      channel('active', 'o1', 'active', '2026-02-01T00:00:00Z'),
    ],
    broadcasts: [
      broadcast('blocked', 'o1', 'inactive', 'live', 9),
      broadcast('safe', 'o1', 'active', 'scheduled', 2),
    ],
  });

  expect(result).toEqual({
    organisationId: 'o1',
    channelId: 'active',
    broadcastId: 'safe',
    requestedContextPreserved: false,
  });
});

test('chooses deterministic persisted fallbacks instead of API list order', () => {
  const result = resolveStudioContextSelection({
    requested: {},
    organisations: [
      organisation('older', '2026-01-01T00:00:00Z'),
      organisation('newer', '2026-02-01T00:00:00Z'),
    ],
    channels: [
      channel('channel-old', 'newer', 'active', '2026-02-02T00:00:00Z'),
      channel('channel-new', 'newer', 'active', '2026-02-03T00:00:00Z'),
    ],
    broadcasts: [
      broadcast('broadcast-old', 'newer', 'channel-new', 'scheduled', 2, '2026-02-05T00:00:00Z'),
      broadcast('broadcast-strong', 'newer', 'channel-new', 'draft', 4, '2026-02-04T00:00:00Z'),
    ],
  });

  expect(result).toEqual({
    organisationId: 'newer',
    channelId: 'channel-new',
    broadcastId: 'broadcast-old',
    requestedContextPreserved: false,
  });
});

test('prefers an operational live broadcast over a newer high-version draft', () => {
  const result = resolveStudioContextSelection({
    requested: {},
    organisations: [organisation('o1')],
    channels: [channel('c1', 'o1')],
    broadcasts: [
      broadcast('draft', 'o1', 'c1', 'draft', 99, '2026-03-03T00:00:00Z'),
      broadcast('live', 'o1', 'c1', 'live', 1, '2026-03-01T00:00:00Z'),
    ],
  });

  expect(result).toEqual({
    organisationId: 'o1',
    channelId: 'c1',
    broadcastId: 'live',
    requestedContextPreserved: false,
  });
});

test('uses persisted recency instead of unrelated lifecycle versions for same-status broadcasts', () => {
  const result = resolveStudioContextSelection({
    requested: {},
    organisations: [organisation('o1')],
    channels: [channel('c1', 'o1')],
    broadcasts: [
      broadcast('older-high-version', 'o1', 'c1', 'scheduled', 99, '2026-03-01T00:00:00Z'),
      broadcast('newer-low-version', 'o1', 'c1', 'scheduled', 1, '2026-03-02T00:00:00Z'),
    ],
  });

  expect(result).toEqual({
    organisationId: 'o1',
    channelId: 'c1',
    broadcastId: 'newer-low-version',
    requestedContextPreserved: false,
  });
});
