import type { DigiStreamDatabase } from '../../db/client.js';
import { findBroadcastDeliveryById } from '../broadcasts/broadcast-delivery.repository.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';

export type RealtimeRoomRequest =
  | { kind: 'user'; id: string }
  | { kind: 'organisation'; id: string }
  | { kind: 'broadcast'; id: string; organisationId: string };

export type AuthorizedRealtimeRoom = {
  key: string;
  kind: RealtimeRoomRequest['kind'];
  id: string;
};

const REALTIME_BROADCAST_STATES = new Set([
  'scheduled',
  'starting',
  'live',
  'reconnecting',
  'ending',
]);

export function validRealtimeUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function parseRealtimeRoom(value: unknown): RealtimeRoomRequest | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;

  if (candidate.kind === 'user' && validRealtimeUuid(candidate.id)) {
    return { kind: 'user', id: candidate.id };
  }
  if (candidate.kind === 'organisation' && validRealtimeUuid(candidate.id)) {
    return { kind: 'organisation', id: candidate.id };
  }
  if (
    candidate.kind === 'broadcast' &&
    validRealtimeUuid(candidate.id) &&
    validRealtimeUuid(candidate.organisationId)
  ) {
    return {
      kind: 'broadcast',
      id: candidate.id,
      organisationId: candidate.organisationId,
    };
  }
  return null;
}

export function userRoom(userId: string): AuthorizedRealtimeRoom {
  return { key: `user:${userId}`, kind: 'user', id: userId };
}

export function broadcastRoom(
  broadcastId: string,
): AuthorizedRealtimeRoom {
  return {
    key: `broadcast:${broadcastId}`,
    kind: 'broadcast',
    id: broadcastId,
  };
}

export async function authorizeRealtimeRoom(
  db: DigiStreamDatabase,
  userId: string,
  room: RealtimeRoomRequest,
): Promise<AuthorizedRealtimeRoom | null> {
  if (room.kind === 'user') {
    return room.id === userId ? userRoom(userId) : null;
  }

  if (room.kind === 'organisation') {
    const role = await findOrganisationRole(db, room.id, userId);
    return role
      ? { key: `organisation:${room.id}`, kind: room.kind, id: room.id }
      : null;
  }

  const broadcast = await findBroadcastDeliveryById(
    db,
    room.organisationId,
    room.id,
  );
  if (
    !broadcast ||
    broadcast.channelStatus !== 'active' ||
    !REALTIME_BROADCAST_STATES.has(broadcast.status)
  ) {
    return null;
  }

  if (broadcast.channelVisibility === 'private') {
    const role = await findOrganisationRole(db, room.organisationId, userId);
    if (!role) return null;
  }

  return broadcastRoom(room.id);
}
