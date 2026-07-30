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
import type { BroadcastStatus } from './broadcasts.types.js';

export type ContributionCredentialBody = {
  participantRole?: unknown;
};

const CONTRIBUTION_STATUSES = new Set<BroadcastStatus>([
  'scheduled',
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

export async function issueBroadcastContributionCredential(
  db: DigiStreamDatabase,
  provider: ContributionProvider,
  organisationId: string,
  broadcastId: string,
  user: { id: string; displayName: string },
  body: ContributionCredentialBody,
): Promise<ContributionCredential> {
  if (!validUuid(organisationId) || !validUuid(broadcastId)) {
    throw new ApiError(
      404,
      'BROADCAST_NOT_FOUND',
      'The requested broadcast was not found.',
    );
  }

  const organisationRole = await findOrganisationRole(
    db,
    organisationId,
    user.id,
  );
  if (!organisationRole) {
    throw new ApiError(
      404,
      'BROADCAST_NOT_FOUND',
      'The requested broadcast was not found.',
    );
  }

  const broadcast = await findOrganisationBroadcastRecord(
    db,
    organisationId,
    broadcastId,
  );
  if (!broadcast) {
    throw new ApiError(
      404,
      'BROADCAST_NOT_FOUND',
      'The requested broadcast was not found.',
    );
  }

  if (!CONTRIBUTION_STATUSES.has(broadcast.status)) {
    throw new ApiError(
      409,
      'BROADCAST_NOT_READY_FOR_CONTRIBUTION',
      'Contribution access is available only for scheduled or active broadcasts.',
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
