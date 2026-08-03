import { expect, test } from '@playwright/test';
import type { Broadcast, Channel, Organisation } from '@digistream/contracts';
import {
  reconcileCreatorContext,
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

function channel(
  id: string,
  organisationId: string,
  status: Channel['status'] = 'active',
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
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function broadcast(
  id: string,
  organisationId: string,
  channelId: string,
  status: Broadcast['status'],
  updatedAt: string,
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
    updatedAt,
  };
}

function setBackstageOpen(open: boolean): void {
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
  setBackstageOpen(false);
});

test.afterEach(() => {
  Reflect.deleteProperty(globalThis, 'document');
});

test('reorders authorised Backstage lists to the strongest Overview broadcast only while Backstage is open', () => {
  reconcileCreatorContext('/api/v1/organisations', {
    organisations: [organisation('o1'), organisation('o2')],
  });
  reconcileCreatorContext('/api/v1/organisations/o1/channels', {
    channels: [channel('c1', 'o1')],
  });
  reconcileCreatorContext('/api/v1/organisations/o2/channels', {
    channels: [channel('c2', 'o2')],
  });
  reconcileCreatorContext('/api/v1/organisations/o1/channels/c1/broadcasts', {
    broadcasts: [broadcast('scheduled', 'o1', 'c1', 'scheduled', '2026-02-01T00:00:00Z')],
  });
  reconcileCreatorContext('/api/v1/organisations/o2/channels/c2/broadcasts', {
    broadcasts: [broadcast('live', 'o2', 'c2', 'live', '2026-01-01T00:00:00Z')],
  });

  const closed = reconcileCreatorContext('/api/v1/organisations', {
    organisations: [organisation('o1'), organisation('o2')],
  }) as { organisations: Organisation[] };
  expect(closed.organisations.map((item) => item.id)).toEqual(['o1', 'o2']);

  setBackstageOpen(true);
  const opened = reconcileCreatorContext('/api/v1/organisations', {
    organisations: [organisation('o1'), organisation('o2')],
  }) as { organisations: Organisation[] };
  expect(opened.organisations.map((item) => item.id)).toEqual(['o2', 'o1']);

  const channels = reconcileCreatorContext('/api/v1/organisations/o2/channels', {
    channels: [channel('other', 'o2'), channel('c2', 'o2')],
  }) as { channels: Channel[] };
  expect(channels.channels.map((item) => item.id)).toEqual(['c2', 'other']);

  const broadcasts = reconcileCreatorContext(
    '/api/v1/organisations/o2/channels/c2/broadcasts',
    {
      broadcasts: [
        broadcast('scheduled-newer', 'o2', 'c2', 'scheduled', '2026-03-01T00:00:00Z'),
        broadcast('live', 'o2', 'c2', 'live', '2026-01-01T00:00:00Z'),
      ],
    },
  ) as { broadcasts: Broadcast[] };
  expect(broadcasts.broadcasts.map((item) => item.id)).toEqual([
    'live',
    'scheduled-newer',
  ]);
});

test('rejects inactive channels, terminal broadcasts and cross-tenant relationships', () => {
  reconcileCreatorContext('/api/v1/organisations', {
    organisations: [organisation('o1'), organisation('o2')],
  });
  reconcileCreatorContext('/api/v1/organisations/o1/channels', {
    channels: [channel('inactive', 'o1', 'pending_review'), channel('active', 'o1')],
  });
  reconcileCreatorContext('/api/v1/organisations/o1/channels/inactive/broadcasts', {
    broadcasts: [broadcast('blocked', 'o1', 'inactive', 'live', '2026-04-01T00:00:00Z')],
  });
  reconcileCreatorContext('/api/v1/organisations/o1/channels/active/broadcasts', {
    broadcasts: [
      broadcast('completed', 'o1', 'active', 'completed', '2026-05-01T00:00:00Z'),
      broadcast('safe', 'o1', 'active', 'scheduled', '2026-03-01T00:00:00Z'),
      broadcast('foreign', 'o2', 'active', 'live', '2026-06-01T00:00:00Z'),
    ],
  });

  setBackstageOpen(true);
  const result = reconcileCreatorContext(
    '/api/v1/organisations/o1/channels/active/broadcasts',
    {
      broadcasts: [
        broadcast('completed', 'o1', 'active', 'completed', '2026-05-01T00:00:00Z'),
        broadcast('safe', 'o1', 'active', 'scheduled', '2026-03-01T00:00:00Z'),
        broadcast('foreign', 'o2', 'active', 'live', '2026-06-01T00:00:00Z'),
      ],
    },
  ) as { broadcasts: Broadcast[] };

  expect(result.broadcasts.map((item) => item.id)).toEqual(['safe']);
});
