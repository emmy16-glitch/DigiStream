import type { Broadcast, Channel, Organisation } from '@digistream/contracts';

type ApiRecord = Record<string, unknown>;

type BackstageContext = {
  organisationId: string;
  channelId: string;
  broadcastId: string;
};

const backstageStates = new Set<Broadcast['status']>([
  'scheduled',
  'starting',
  'live',
  'reconnecting',
]);

const statusPriority: Partial<Record<Broadcast['status'], number>> = {
  live: 4,
  reconnecting: 3,
  starting: 2,
  scheduled: 1,
};

let organisations: Organisation[] = [];
const channelsByOrganisation = new Map<string, Channel[]>();
const broadcastsByChannel = new Map<string, Broadcast[]>();

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function strongestBroadcast(resources: Broadcast[]): Broadcast | null {
  return [...resources].sort((left, right) => {
    const statusDifference =
      (statusPriority[right.status] ?? 0) - (statusPriority[left.status] ?? 0);
    if (statusDifference !== 0) return statusDifference;
    const updatedDifference = timestamp(right.updatedAt) - timestamp(left.updatedAt);
    if (updatedDifference !== 0) return updatedDifference;
    const createdDifference = timestamp(right.createdAt) - timestamp(left.createdAt);
    if (createdDifference !== 0) return createdDifference;
    return left.id.localeCompare(right.id);
  })[0] ?? null;
}

function currentContext(): BackstageContext | null {
  const candidates: Broadcast[] = [];
  for (const organisation of organisations) {
    const activeChannelIds = new Set(
      (channelsByOrganisation.get(organisation.id) ?? [])
        .filter((channel) => channel.status === 'active')
        .map((channel) => channel.id),
    );
    for (const channelId of activeChannelIds) {
      for (const broadcast of broadcastsByChannel.get(channelId) ?? []) {
        if (
          broadcast.organisationId === organisation.id &&
          broadcast.channelId === channelId &&
          backstageStates.has(broadcast.status)
        ) {
          candidates.push(broadcast);
        }
      }
    }
  }

  const broadcast = strongestBroadcast(candidates);
  if (!broadcast) return null;
  return {
    organisationId: broadcast.organisationId,
    channelId: broadcast.channelId,
    broadcastId: broadcast.id,
  };
}

function moveFirst<T extends { id: string }>(resources: T[], id: string): T[] {
  const index = resources.findIndex((resource) => resource.id === id);
  if (index <= 0) return resources;
  const selected = resources[index];
  if (!selected) return resources;
  return [selected, ...resources.slice(0, index), ...resources.slice(index + 1)];
}

function backstageIsOpen(): boolean {
  return typeof document !== 'undefined' && Boolean(document.querySelector('.backstage-backdrop'));
}

export function reconcileCreatorContext(path: string, payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const record = payload as ApiRecord;

  if (path === '/api/v1/organisations' && Array.isArray(record.organisations)) {
    organisations = record.organisations as Organisation[];
    const context = currentContext();
    if (!context || !backstageIsOpen()) return payload;
    return {
      ...record,
      organisations: moveFirst(organisations, context.organisationId),
    };
  }

  const channelsMatch = /^\/api\/v1\/organisations\/([^/]+)\/channels$/.exec(path);
  if (channelsMatch?.[1] && Array.isArray(record.channels)) {
    const organisationId = channelsMatch[1];
    const channels = record.channels as Channel[];
    channelsByOrganisation.set(organisationId, channels);
    const context = currentContext();
    if (
      !context ||
      !backstageIsOpen() ||
      context.organisationId !== organisationId
    ) {
      return payload;
    }
    return {
      ...record,
      channels: moveFirst(
        channels.filter((channel) => channel.status === 'active'),
        context.channelId,
      ),
    };
  }

  const broadcastsMatch =
    /^\/api\/v1\/organisations\/([^/]+)\/channels\/([^/]+)\/broadcasts$/.exec(path);
  if (
    broadcastsMatch?.[1] &&
    broadcastsMatch[2] &&
    Array.isArray(record.broadcasts)
  ) {
    const organisationId = broadcastsMatch[1];
    const channelId = broadcastsMatch[2];
    const broadcasts = record.broadcasts as Broadcast[];
    broadcastsByChannel.set(channelId, broadcasts);
    const context = currentContext();
    if (
      !context ||
      !backstageIsOpen() ||
      context.organisationId !== organisationId ||
      context.channelId !== channelId
    ) {
      return payload;
    }
    return {
      ...record,
      broadcasts: moveFirst(
        broadcasts.filter((broadcast) => backstageStates.has(broadcast.status)),
        context.broadcastId,
      ),
    };
  }

  return payload;
}

export function resetCreatorContextForTests(): void {
  organisations = [];
  channelsByOrganisation.clear();
  broadcastsByChannel.clear();
}
