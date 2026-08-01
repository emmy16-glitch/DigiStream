import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  ContributionProviderError,
  type ContributionCredential,
  type ContributionParticipantRole,
  type ContributionProvider,
} from '../media/contribution-provider.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import { findOrganisationBroadcastRecord } from './broadcasts.repository.js';
import { applyBroadcastMediaEvent } from './broadcasts.service.js';
import type { BroadcastStatus } from './broadcasts.types.js';

export type ContributionCredentialBody = {
  participantRole?: unknown;
};

export type ContributionReadyBody = {
  participantIdentity?: unknown;
};

const CONTRIBUTION_STATUSES = new Set<BroadcastStatus>([
  'draft',
  'scheduled',
  'starting',
  'live',
  'reconnecting',
]);

const CONTRIBUTION_READY_STATUSES = new Set<BroadcastStatus>([
  'starting',
  'live',
  'reconnecting',
]);

const HOST_ROLES = new Set<OrganisationRole>([
  'owner',
  'admin',
  'broadcaster',
]);

const GUEST_ROLES = new Set<OrganisationRole>([
  'owner',
  'admin',
  'broadcaster',
  'moderator',
]);

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function notFound(): never {
  throw new ApiError(
    404,
    'BROADCAST_NOT_FOUND',
    'The requested broadcast was not found.',
  );
}

function parseParticipantRole(
  value: unknown,
  organisationRole: OrganisationRole,
): ContributionParticipantRole | null {
  if (value === undefined) {
    return HOST_ROLES.has(organisationRole) ? 'host' : 'monitor';
  }
  return value === 'host' || value === 'guest' || value === 'monitor'
    ? value
    : null;
}

function roleCanJoin(
  organisationRole: OrganisationRole,
  participantRole: ContributionParticipantRole,
): boolean {
  if (participantRole === 'host') return HOST_ROLES.has(organisationRole);
  if (participantRole === 'guest') return GUEST_ROLES.has(organisationRole);
  return GUEST_ROLES.has(organisationRole);
}

function parseHostIdentity(value: unknown, userId: string): string {
  if (
    typeof value !== 'string' ||
    value.length > 180 ||
    !new RegExp(`^host-${userId}-[a-z0-9]{12}$`, 'i').test(value)
  ) {
    throw new ApiError(
      400,
      'INVALID_CONTRIBUTION_IDENTITY',
      'The LiveKit host identity is invalid.',
    );
  }
  return value;
}

async function requireOrganisationRole(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
): Promise<OrganisationRole> {
  if (!validUuid(organisationId)) return notFound();
  const role = await findOrganisationRole(db, organisationId, userId);
  return role ?? notFound();
}

export async function issueBroadcastContributionCredential(
  db: DigiStreamDatabase,
  provider: ContributionProvider,
  organisationId: string,
  broadcastId: string,
  user: { id: string; displayName: string },
  body: ContributionCredentialBody,
): Promise<ContributionCredential> {
  if (!validUuid(organisationId) || !validUuid(broadcastId)) return notFound();

  const organisationRole = await requireOrganisationRole(db, organisationId, user.id);
  const broadcast = await findOrganisationBroadcastRecord(
    db,
    organisationId,
    broadcastId,
  );
  if (!broadcast) return notFound();

  if (!CONTRIBUTION_STATUSES.has(broadcast.status)) {
    throw new ApiError(
      409,
      'BROADCAST_NOT_READY_FOR_CONTRIBUTION',
      'Contribution access is available only for draft, scheduled or active broadcasts.',
      { status: broadcast.status },
    );
  }

  const participantRole = parseParticipantRole(
    body.participantRole,
    organisationRole,
  );
  if (!participantRole) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'participantRole must be host, guest or monitor.',
    );
  }
  if (!roleCanJoin(organisationRole, participantRole)) {
    throw new ApiError(
      403,
      'BROADCAST_CONTRIBUTION_FORBIDDEN',
      'Your organisation role cannot use that contribution permission.',
    );
  }

  const request = {
    roomName: broadcast.contributionRoomName,
    broadcastId: broadcast.id,
    organisationId: broadcast.organisationId,
    channelId: broadcast.channelId,
    userId: user.id,
    displayName: user.displayName,
    participantRole,
  } as const;

  try {
    await provider.ensureRoom(request);
    return await provider.issueCredential(request);
  } catch (error) {
    if (error instanceof ContributionProviderError) {
      throw new ApiError(
        503,
        'LIVEKIT_UNAVAILABLE',
        'Live contribution access is temporarily unavailable.',
      );
    }
    throw error;
  }
}

export async function confirmBroadcastContributionReady(
  db: DigiStreamDatabase,
  provider: ContributionProvider,
  organisationId: string,
  broadcastId: string,
  user: { id: string },
  body: ContributionReadyBody,
) {
  if (!validUuid(organisationId) || !validUuid(broadcastId)) return notFound();

  const organisationRole = await requireOrganisationRole(db, organisationId, user.id);
  if (!HOST_ROLES.has(organisationRole)) {
    throw new ApiError(
      403,
      'BROADCAST_CONTRIBUTION_FORBIDDEN',
      'Owner, administrator or broadcaster permission is required.',
    );
  }

  const broadcast = await findOrganisationBroadcastRecord(
    db,
    organisationId,
    broadcastId,
  );
  if (!broadcast) return notFound();
  if (!CONTRIBUTION_READY_STATUSES.has(broadcast.status)) {
    throw new ApiError(
      409,
      'BROADCAST_NOT_READY_FOR_CONTRIBUTION',
      'Start the broadcast lifecycle before confirming microphone readiness.',
      { status: broadcast.status },
    );
  }

  const participantIdentity = parseHostIdentity(body.participantIdentity, user.id);
  if (!provider.verifyPublishedMicrophone) {
    throw new ApiError(
      503,
      'LIVEKIT_VERIFICATION_UNAVAILABLE',
      'LiveKit publisher verification is not configured.',
    );
  }

  let published = false;
  try {
    published = await provider.verifyPublishedMicrophone({
      roomName: broadcast.contributionRoomName,
      participantIdentity,
    });
  } catch (error) {
    if (error instanceof ContributionProviderError) {
      throw new ApiError(
        503,
        'LIVEKIT_UNAVAILABLE',
        'Live contribution verification is temporarily unavailable.',
      );
    }
    throw error;
  }

  if (!published) {
    throw new ApiError(
      409,
      'MICROPHONE_NOT_PUBLISHED',
      'Join the LiveKit room and publish an unmuted microphone before continuing.',
    );
  }

  const updated = broadcast.contributionReadyAt
    ? broadcast
    : await applyBroadcastMediaEvent(db, broadcast.id, {
        event: 'contribution_ready',
        idempotencyKey: `creator-ready-${broadcast.id}-${participantIdentity}`,
      });

  return {
    ready: true as const,
    broadcast: {
      id: updated.id,
      status: updated.status,
      lifecycleVersion: updated.lifecycleVersion,
      contributionReadyAt: updated.contributionReadyAt,
    },
  };
}
