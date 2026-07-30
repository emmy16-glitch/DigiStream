import { createHash, randomBytes } from 'node:crypto';
import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  ContributionProviderError,
  type ContributionCredential,
  type ContributionProvider,
} from '../media/contribution-provider.js';
import type {
  BackstageParticipant,
  BackstageProvider,
} from '../media/backstage-provider.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import {
  findOrganisationBroadcastRecord,
  findPublicBroadcastRecord,
} from '../broadcasts/broadcasts.repository.js';
import type { BroadcastStatus } from '../broadcasts/broadcasts.types.js';
import {
  acceptGuestInvitationRecord,
  admitGuestInvitationRecord,
  createCallInRequestRecord,
  createGuestInvitationRecord,
  decideCallInRequestRecord,
  findCallInRequestRecord,
  findGuestInvitationByTokenHash,
  findGuestInvitationRecord,
  findGuestSessionRecord,
  listCallInRequestRecords,
  listGuestInvitationRecords,
  revokeGuestInvitationRecord,
} from './broadcast-guests.repository.js';
import type {
  CallInRequestDto,
  CreatedGuestInvitationDto,
  GuestInvitationDto,
  GuestSessionDto,
} from './broadcast-guests.types.js';
import type {
  BroadcastCallInRequestRecord,
  BroadcastGuestInvitationRecord,
} from './broadcast-guests.schema.js';

const MANAGER_ROLES = new Set<OrganisationRole>(['owner', 'admin', 'broadcaster']);
const BACKSTAGE_ROLES = new Set<OrganisationRole>([
  'owner',
  'admin',
  'broadcaster',
  'moderator',
]);
const GUEST_ACTIVE_STATES = new Set<BroadcastStatus>([
  'scheduled',
  'starting',
  'live',
  'reconnecting',
]);

export type CreateGuestInvitationBody = {
  email?: unknown;
  displayName?: unknown;
  ttlSeconds?: unknown;
};
export type AcceptGuestInvitationBody = { displayName?: unknown };
export type CreateCallInBody = {
  displayName?: unknown;
  email?: unknown;
  message?: unknown;
};

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function secretToken(): string {
  return randomBytes(32).toString('base64url');
}

function cleanName(value: unknown, required: boolean): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Display name is required.');
    }
    return null;
  }
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Display name must be text.');
  }
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Display name must be between 2 and 80 characters.',
    );
  }
  return name;
}

function cleanEmail(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Email must be text.');
  }
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Provide a valid email address.');
  }
  return email;
}

function cleanMessage(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Message must be text.');
  }
  const message = value.trim();
  if (message.length > 500) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Message cannot exceed 500 characters.');
  }
  return message || null;
}

function invitationTtl(value: unknown): number {
  if (value === undefined) return 3_600;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 300 || parsed > 86_400) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'ttlSeconds must be between 300 and 86400.',
    );
  }
  return parsed;
}

function toInvitation(record: BroadcastGuestInvitationRecord): GuestInvitationDto {
  return {
    id: record.id,
    organisationId: record.organisationId,
    broadcastId: record.broadcastId,
    invitedEmail: record.invitedEmail,
    displayName: record.displayName,
    status: record.status as GuestInvitationDto['status'],
    expiresAt: record.expiresAt,
    acceptedAt: record.acceptedAt,
    admittedAt: record.admittedAt,
    revokedAt: record.revokedAt,
    sessionExpiresAt: record.sessionExpiresAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toCallIn(record: BroadcastCallInRequestRecord): CallInRequestDto {
  return {
    id: record.id,
    organisationId: record.organisationId,
    broadcastId: record.broadcastId,
    displayName: record.displayName,
    contactEmail: record.contactEmail,
    message: record.message,
    status: record.status as CallInRequestDto['status'],
    invitationId: record.invitationId,
    decidedByUserId: record.decidedByUserId,
    decidedAt: record.decidedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function notFound(): never {
  throw new ApiError(404, 'BROADCAST_NOT_FOUND', 'The requested broadcast was not found.');
}

async function requireRole(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
  roles: Set<OrganisationRole>,
): Promise<OrganisationRole> {
  if (!validUuid(organisationId)) return notFound();
  const role = await findOrganisationRole(db, organisationId, userId);
  if (!role) return notFound();
  if (!roles.has(role)) {
    throw new ApiError(
      403,
      'BACKSTAGE_FORBIDDEN',
      'Your organisation role cannot manage this backstage area.',
    );
  }
  return role;
}

async function requireBroadcast(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
) {
  if (!validUuid(broadcastId)) return notFound();
  const broadcast = await findOrganisationBroadcastRecord(
    db,
    organisationId,
    broadcastId,
  );
  return broadcast ?? notFound();
}

function ensureGuestState(status: BroadcastStatus): void {
  if (!GUEST_ACTIVE_STATES.has(status)) {
    throw new ApiError(
      409,
      'BROADCAST_NOT_READY_FOR_GUESTS',
      'Guests are available only for scheduled or active broadcasts.',
      { status },
    );
  }
}

async function insertInvitation(
  db: DigiStreamDatabase,
  input: {
    organisationId: string;
    broadcastId: string;
    createdByUserId: string;
    invitedEmail: string | null;
    displayName: string | null;
    ttlSeconds: number;
  },
): Promise<CreatedGuestInvitationDto> {
  const acceptanceToken = secretToken();
  const record = await createGuestInvitationRecord(db, {
    organisationId: input.organisationId,
    broadcastId: input.broadcastId,
    createdByUserId: input.createdByUserId,
    invitedEmail: input.invitedEmail,
    displayName: input.displayName,
    tokenHash: hashToken(acceptanceToken),
    expiresAt: new Date(Date.now() + input.ttlSeconds * 1_000),
  });
  return { ...toInvitation(record), acceptanceToken };
}

export async function createGuestInvitation(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  userId: string,
  body: CreateGuestInvitationBody,
): Promise<CreatedGuestInvitationDto> {
  await requireRole(db, organisationId, userId, MANAGER_ROLES);
  const broadcast = await requireBroadcast(db, organisationId, broadcastId);
  ensureGuestState(broadcast.status);
  return insertInvitation(db, {
    organisationId,
    broadcastId,
    createdByUserId: userId,
    invitedEmail: cleanEmail(body.email),
    displayName: cleanName(body.displayName, false),
    ttlSeconds: invitationTtl(body.ttlSeconds),
  });
}

export async function listGuestInvitations(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  userId: string,
): Promise<GuestInvitationDto[]> {
  await requireRole(db, organisationId, userId, BACKSTAGE_ROLES);
  await requireBroadcast(db, organisationId, broadcastId);
  return (await listGuestInvitationRecords(db, organisationId, broadcastId)).map(
    toInvitation,
  );
}

export async function acceptGuestInvitation(
  db: DigiStreamDatabase,
  rawToken: string,
  body: AcceptGuestInvitationBody,
): Promise<GuestSessionDto> {
  if (rawToken.length < 30 || rawToken.length > 200) {
    throw new ApiError(404, 'GUEST_INVITATION_NOT_FOUND', 'The guest invitation is invalid.');
  }
  const invitation = await findGuestInvitationByTokenHash(db, hashToken(rawToken));
  if (
    !invitation ||
    invitation.status !== 'pending' ||
    invitation.revokedAt ||
    invitation.expiresAt.getTime() <= Date.now()
  ) {
    throw new ApiError(
      410,
      'GUEST_INVITATION_UNAVAILABLE',
      'The guest invitation has expired, was revoked or was already used.',
    );
  }

  const displayName = cleanName(body.displayName ?? invitation.displayName, true)!;
  const sessionToken = secretToken();
  const sessionExpiresAt = new Date(
    Math.min(invitation.expiresAt.getTime(), Date.now() + 4 * 60 * 60 * 1_000),
  );
  const accepted = await acceptGuestInvitationRecord(
    db,
    invitation.id,
    displayName,
    hashToken(sessionToken),
    sessionExpiresAt,
  );
  if (!accepted) {
    throw new ApiError(
      409,
      'GUEST_INVITATION_ALREADY_USED',
      'The guest invitation was already accepted.',
    );
  }

  return {
    invitationId: accepted.id,
    organisationId: accepted.organisationId,
    broadcastId: accepted.broadcastId,
    displayName,
    admitted: false,
    expiresAt: sessionExpiresAt,
    sessionToken,
  };
}

export async function admitGuestInvitation(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  invitationId: string,
  userId: string,
): Promise<GuestInvitationDto> {
  await requireRole(db, organisationId, userId, BACKSTAGE_ROLES);
  await requireBroadcast(db, organisationId, broadcastId);
  if (!validUuid(invitationId)) return notFound();
  const current = await findGuestInvitationRecord(
    db,
    organisationId,
    broadcastId,
    invitationId,
  );
  if (!current) return notFound();
  if (
    current.status !== 'accepted' ||
    !current.sessionExpiresAt ||
    current.sessionExpiresAt.getTime() <= Date.now()
  ) {
    throw new ApiError(
      409,
      'GUEST_NOT_READY_FOR_ADMISSION',
      'The guest must accept a valid invitation before admission.',
    );
  }
  const admitted = await admitGuestInvitationRecord(db, invitationId);
  if (!admitted) {
    throw new ApiError(409, 'GUEST_ADMISSION_CONFLICT', 'The guest admission changed.');
  }
  return toInvitation(admitted);
}

export async function revokeGuestInvitation(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  invitationId: string,
  userId: string,
): Promise<GuestInvitationDto> {
  await requireRole(db, organisationId, userId, BACKSTAGE_ROLES);
  await requireBroadcast(db, organisationId, broadcastId);
  if (!validUuid(invitationId)) return notFound();
  const current = await findGuestInvitationRecord(
    db,
    organisationId,
    broadcastId,
    invitationId,
  );
  if (!current) return notFound();
  if (current.status === 'revoked') return toInvitation(current);
  const revoked = await revokeGuestInvitationRecord(db, invitationId);
  return toInvitation(revoked ?? current);
}

export async function issueGuestContributionCredential(
  db: DigiStreamDatabase,
  contributionProvider: ContributionProvider,
  rawSessionToken: string,
): Promise<ContributionCredential> {
  if (rawSessionToken.length < 30 || rawSessionToken.length > 200) {
    throw new ApiError(401, 'GUEST_SESSION_INVALID', 'The guest session is invalid.');
  }
  const invitation = await findGuestSessionRecord(db, hashToken(rawSessionToken));
  if (
    !invitation ||
    invitation.status !== 'admitted' ||
    invitation.revokedAt ||
    !invitation.sessionExpiresAt ||
    invitation.sessionExpiresAt.getTime() <= Date.now()
  ) {
    throw new ApiError(
      401,
      'GUEST_SESSION_UNAVAILABLE',
      'The guest session is expired, revoked or still waiting for admission.',
    );
  }
  const broadcast = await requireBroadcast(
    db,
    invitation.organisationId,
    invitation.broadcastId,
  );
  ensureGuestState(broadcast.status);

  const request = {
    roomName: broadcast.contributionRoomName,
    broadcastId: broadcast.id,
    organisationId: broadcast.organisationId,
    channelId: broadcast.channelId,
    userId: `external-${invitation.id}`,
    displayName: invitation.displayName ?? 'Guest',
    participantRole: 'guest' as const,
  };
  try {
    await contributionProvider.ensureRoom(request);
    return await contributionProvider.issueCredential(request);
  } catch (error) {
    if (error instanceof ContributionProviderError) {
      throw new ApiError(
        503,
        'LIVEKIT_UNAVAILABLE',
        'Guest contribution access is temporarily unavailable.',
      );
    }
    throw error;
  }
}

async function backstageContext(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  userId: string,
) {
  await requireRole(db, organisationId, userId, BACKSTAGE_ROLES);
  return requireBroadcast(db, organisationId, broadcastId);
}

export async function listBackstageParticipants(
  db: DigiStreamDatabase,
  provider: BackstageProvider,
  organisationId: string,
  broadcastId: string,
  userId: string,
): Promise<BackstageParticipant[]> {
  const broadcast = await backstageContext(
    db,
    organisationId,
    broadcastId,
    userId,
  );
  try {
    return await provider.listParticipants(broadcast.contributionRoomName);
  } catch (error) {
    if (error instanceof ContributionProviderError) {
      throw new ApiError(503, 'LIVEKIT_UNAVAILABLE', 'Backstage control is unavailable.');
    }
    throw error;
  }
}

function validGuestIdentity(value: string): boolean {
  return value.length <= 220 && /^guest-[a-z0-9-]+$/i.test(value);
}

export async function muteBackstageGuest(
  db: DigiStreamDatabase,
  provider: BackstageProvider,
  organisationId: string,
  broadcastId: string,
  participantIdentity: string,
  userId: string,
  muted: boolean,
): Promise<BackstageParticipant> {
  const broadcast = await backstageContext(
    db,
    organisationId,
    broadcastId,
    userId,
  );
  if (!validGuestIdentity(participantIdentity)) {
    throw new ApiError(
      400,
      'INVALID_GUEST_IDENTITY',
      'Only external guest participants can be controlled here.',
    );
  }
  try {
    return await provider.muteMicrophone(
      broadcast.contributionRoomName,
      participantIdentity,
      muted,
    );
  } catch (error) {
    if (error instanceof ContributionProviderError) {
      throw new ApiError(409, 'GUEST_MEDIA_CONTROL_FAILED', error.message);
    }
    throw error;
  }
}

export async function removeBackstageGuest(
  db: DigiStreamDatabase,
  provider: BackstageProvider,
  organisationId: string,
  broadcastId: string,
  participantIdentity: string,
  userId: string,
): Promise<void> {
  const broadcast = await backstageContext(
    db,
    organisationId,
    broadcastId,
    userId,
  );
  if (!validGuestIdentity(participantIdentity)) {
    throw new ApiError(
      400,
      'INVALID_GUEST_IDENTITY',
      'Only external guest participants can be removed here.',
    );
  }
  try {
    await provider.removeParticipant(
      broadcast.contributionRoomName,
      participantIdentity,
    );
  } catch (error) {
    if (error instanceof ContributionProviderError) {
      throw new ApiError(409, 'GUEST_REMOVAL_FAILED', 'The guest could not be removed.');
    }
    throw error;
  }
}

export async function createPublicCallInRequest(
  db: DigiStreamDatabase,
  organisationSlug: string,
  channelSlug: string,
  broadcastSlug: string,
  body: CreateCallInBody,
): Promise<CallInRequestDto> {
  const broadcast = await findPublicBroadcastRecord(
    db,
    organisationSlug,
    channelSlug,
    broadcastSlug,
  );
  if (!broadcast) return notFound();
  if (!GUEST_ACTIVE_STATES.has(broadcast.status)) {
    throw new ApiError(
      409,
      'CALL_IN_CLOSED',
      'Call-in requests are not open for this broadcast.',
    );
  }
  const record = await createCallInRequestRecord(db, {
    organisationId: broadcast.organisation.id,
    broadcastId: broadcast.id,
    displayName: cleanName(body.displayName, true)!,
    contactEmail: cleanEmail(body.email),
    message: cleanMessage(body.message),
  });
  return toCallIn(record);
}

export async function listCallInRequests(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  userId: string,
): Promise<CallInRequestDto[]> {
  await requireRole(db, organisationId, userId, BACKSTAGE_ROLES);
  await requireBroadcast(db, organisationId, broadcastId);
  return (await listCallInRequestRecords(db, organisationId, broadcastId)).map(
    toCallIn,
  );
}

export async function decideCallInRequest(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  callInId: string,
  userId: string,
  decision: 'approved' | 'rejected',
): Promise<{
  callIn: CallInRequestDto;
  invitation: CreatedGuestInvitationDto | null;
}> {
  await requireRole(db, organisationId, userId, BACKSTAGE_ROLES);
  const broadcast = await requireBroadcast(db, organisationId, broadcastId);
  ensureGuestState(broadcast.status);
  if (!validUuid(callInId)) return notFound();
  const current = await findCallInRequestRecord(
    db,
    organisationId,
    broadcastId,
    callInId,
  );
  if (!current) return notFound();
  if (current.status !== 'pending') {
    throw new ApiError(409, 'CALL_IN_ALREADY_DECIDED', 'The call-in was already decided.');
  }

  const invitation =
    decision === 'approved'
      ? await insertInvitation(db, {
          organisationId,
          broadcastId,
          createdByUserId: userId,
          invitedEmail: current.contactEmail,
          displayName: current.displayName,
          ttlSeconds: 3_600,
        })
      : null;
  const decided = await decideCallInRequestRecord(
    db,
    callInId,
    decision,
    userId,
    invitation?.id ?? null,
  );
  if (!decided) {
    throw new ApiError(409, 'CALL_IN_DECISION_CONFLICT', 'The call-in decision changed.');
  }
  return { callIn: toCallIn(decided), invitation };
}
