import { expect, test } from '@playwright/test';
import type { Broadcast, Channel, Organisation } from '@digistream/contracts';
import {
  reconcileCreatorContext,
  requestCreatorStudioLobbyContext,
  resetCreatorContextForTests,
} from '../../apps/web/src/lib/backstage-context-runtime';

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
  status: Broadcast['status'],
): Broadcast {
  return {
    id,
    organisationId,
    channelId,
    createdByUserId: 'user',
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
    lifecycleVersion: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: id === 'live' ? '2026-03-01T00:00:00Z' : '2026-02-01T00:00:00Z',
  };
}

function setStudioLobbyOpen(open: boolean): void {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      querySelector: (selector: string) =>
        open && selector === '.backstage-backdrop' ? {} : null,
    },
  });
}

test.beforeEach(() => {
  resetCreatorContextForTests();
  setStudioLobbyOpen(false);
});

test.afterEach(() => {
  Reflect.deleteProperty(globalThis, 'document');
});

test('a valid Overview request wins over the generic strongest-broadcast fallback once', () => {
  const organisations = [organisation('o1')];
  const channels = [channel('c1', 'o1')];
  const broadcasts = [
    broadcast('live', 'o1', 'c1', 'live'),
    broadcast('scheduled', 'o1', 'c1', 'scheduled'),
  ];

  reconcileCreatorContext('/api/v1/organisations', { organisations });
  reconcileCreatorContext('/api/v1/organisations/o1/channels', { channels });
  reconcileCreatorContext('/api/v1/organisations/o1/channels/c1/broadcasts', { broadcasts });

  requestCreatorStudioLobbyContext({
    organisationId: 'o1',
    channelId: 'c1',
    broadcastId: 'scheduled',
  });
  setStudioLobbyOpen(true);

  const requested = reconcileCreatorContext(
    '/api/v1/organisations/o1/channels/c1/broadcasts',
    { broadcasts },
  ) as { broadcasts: Broadcast[] };
  expect(requested.broadcasts.map((item) => item.id)).toEqual(['scheduled', 'live']);

  const afterConsumption = reconcileCreatorContext(
    '/api/v1/organisations/o1/channels/c1/broadcasts',
    { broadcasts },
  ) as { broadcasts: Broadcast[] };
  expect(afterConsumption.broadcasts.map((item) => item.id)).toEqual(['live', 'scheduled']);
});

test('a requested context can only reorder authorised active Studio Lobby resources', () => {
  const organisations = [organisation('o1')];
  const channels = [channel('c1', 'o1')];
  const broadcasts = [
    broadcast('safe', 'o1', 'c1', 'scheduled'),
    broadcast('terminal', 'o1', 'c1', 'completed'),
    broadcast('foreign', 'o2', 'c1', 'live'),
  ];

  reconcileCreatorContext('/api/v1/organisations', { organisations });
  reconcileCreatorContext('/api/v1/organisations/o1/channels', { channels });
  reconcileCreatorContext('/api/v1/organisations/o1/channels/c1/broadcasts', { broadcasts });

  requestCreatorStudioLobbyContext({
    organisationId: 'o1',
    channelId: 'c1',
    broadcastId: 'terminal',
  });
  setStudioLobbyOpen(true);

  const result = reconcileCreatorContext(
    '/api/v1/organisations/o1/channels/c1/broadcasts',
    { broadcasts },
  ) as { broadcasts: Broadcast[] };

  expect(result.broadcasts.map((item) => item.id)).toEqual(['safe']);
});
