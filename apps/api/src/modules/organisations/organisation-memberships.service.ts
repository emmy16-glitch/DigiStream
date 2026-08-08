import { createHash, randomBytes } from 'node:crypto';
import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  acceptOrganisationInvitationRecord,
  changeOrganisationMemberRoleRecord,
  createOrganisationInvitationRecord,
  findOrganisationRole,
  listOrganisationMembers,
  listPendingOrganisationInvitations,
  removeOrganisationMemberRecord,
  revokeOrganisationInvitationRecord,
  userIsOrganisationMember,
  type MembershipManagementResult,
} from './organisation-memberships.repository.js';
import type {
  AcceptedOrganisationInvitationDto,
  CreatedOrganisationInvitationDto,
  OrganisationInvitationDto,
  OrganisationMemberDto,
} from './organisation-memberships.types.js';
import type { OrganisationRole } from './organisations.types.js';

const INVITABLE_ROLES = new Set<OrganisationRole>([
  'admin',
  'broadcaster',
  'moderator',
  'analyst',
]);
const ALL_ROLES = new Set<OrganisationRole>([
  'owner',
  'admin',
  'broadcaster',
  'moderator',
  'analyst',
]);
const LOWER_ROLES = new Set<OrganisationRole>([
  'broadcaster',
  'moderator',
  'analyst',
]);
const DEFAULT_INVITATION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type CreateInvitationBody = {
  email?: unknown;
  role?: unknown;
};

export type UpdateMemberRoleBody = {
  role?: unknown;
};

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const email = value.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return email;
}

function parseRole(value: unknown, allowed: Set<OrganisationRole>): OrganisationRole | null {
  return typeof value === 'string' && ALL_ROLES.has(value as OrganisationRole) && allowed.has(value as OrganisationRole)
    ? (value as OrganisationRole)
    : null;
}

function invitationTtlSeconds(): number {
  const configured = Number(process.env.ORGANISATION_INVITATION_TTL_SECONDS);
  if (
    Number.isSafeInteger(configured) &&
    configured >= 15 * 60 &&
    configured <= 30 * 24 * 60 * 60
  ) {
    return configured;
  }

  return DEFAULT_INVITATION_TTL_SECONDS;
}

function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) {
      return false;
    }

    if ('code' in current && (current as { code?: unknown }).code === '23505') {
      return true;
    }

    if (!('cause' in current)) {
      return false;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return false;
}

async function requireOrganisationRole(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
): Promise<OrganisationRole> {
  if (!validUuid(organisationId)) {
    throw new ApiError(
      404,
      'ORGANISATION_NOT_FOUND',
      'The requested organisation was not found.',
    );
  }

  const role = await findOrganisationRole(db, organisationId, userId);
  if (!role) {
    throw new ApiError(
      404,
      'ORGANISATION_NOT_FOUND',
      'The requested organisation was not found.',
    );
  }

  return role;
}

function requireMembershipManager(role: OrganisationRole): void {
  if (role !== 'owner' && role !== 'admin') {
    throw new ApiError(
      403,
      'MEMBERSHIP_MANAGEMENT_REQUIRED',
      'Owner or administrator permission is required.',
    );
  }
}

function throwManagementResult(result: MembershipManagementResult): never {
  switch (result.status) {
    case 'organisation_not_found':
      throw new ApiError(
        404,
        'ORGANISATION_NOT_FOUND',
        'The requested organisation was not found.',
      );
    case 'member_not_found':
      throw new ApiError(
        404,
        'MEMBER_NOT_FOUND',
        'The requested organisation member was not found.',
      );
    case 'forbidden':
      throw new ApiError(
        403,
        'MEMBERSHIP_MANAGEMENT_FORBIDDEN',
        'You cannot manage this organisation member or role.',
      );
    case 'last_owner':
      throw new ApiError(
        409,
        'FINAL_OWNER_REQUIRED',
        'An organisation must always retain at least one owner.',
      );
    default:
      throw new ApiError(
        500,
        'MEMBERSHIP_CHANGE_FAILED',
        'The membership change could not be completed.',
      );
  }
}

export async function getOrganisationMembers(
  db: DigiStreamDatabase,
  actorUserId: string,
  organisationId: string,
): Promise<OrganisationMemberDto[]> {
  await requireOrganisationRole(db, organisationId, actorUserId);
  return listOrganisationMembers(db, organisationId);
}

export async function createOrganisationInvitation(
  db: DigiStreamDatabase,
  actorUserId: string,
  organisationId: string,
  body: CreateInvitationBody,
): Promise<CreatedOrganisationInvitationDto> {
  const actorRole = await requireOrganisationRole(
    db,
    organisationId,
    actorUserId,
  );
  requireMembershipManager(actorRole);

  const email = normaliseEmail(body.email);
  const role = parseRole(body.role, INVITABLE_ROLES);
  if (!email || !role || role === 'owner') {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid email and one of these roles: admin, broadcaster, moderator or analyst.',
    );
  }

  if (actorRole === 'admin' && role === 'admin') {
    throw new ApiError(
      403,
      'MEMBERSHIP_MANAGEMENT_FORBIDDEN',
      'Only an owner can invite another administrator.',
    );
  }

  if (await userIsOrganisationMember(db, organisationId, email)) {
    throw new ApiError(
      409,
      'ALREADY_ORGANISATION_MEMBER',
      'That user is already an organisation member.',
    );
  }

  const acceptanceToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(
    Date.now() + invitationTtlSeconds() * 1000,
  );

  try {
    const invitation = await createOrganisationInvitationRecord(
      db,
      organisationId,
      actorUserId,
      {
        email,
        role: role as Exclude<OrganisationRole, 'owner'>,
        tokenHash: hashInvitationToken(acceptanceToken),
        expiresAt,
      },
    );

    return { ...invitation, acceptanceToken };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(
        409,
        'INVITATION_ALREADY_PENDING',
        'A pending invitation already exists for this email address.',
      );
    }

    throw error;
  }
}

export async function getPendingOrganisationInvitations(
  db: DigiStreamDatabase,
  actorUserId: string,
  organisationId: string,
): Promise<OrganisationInvitationDto[]> {
  const role = await requireOrganisationRole(db, organisationId, actorUserId);
  requireMembershipManager(role);
  return listPendingOrganisationInvitations(db, organisationId);
}

export async function revokeOrganisationInvitation(
  db: DigiStreamDatabase,
  actorUserId: string,
  organisationId: string,
  invitationId: string,
): Promise<void> {
  const role = await requireOrganisationRole(db, organisationId, actorUserId);
  requireMembershipManager(role);

  if (!validUuid(invitationId)) {
    throw new ApiError(
      404,
      'INVITATION_NOT_FOUND',
      'The requested invitation was not found.',
    );
  }

  if (
    !(await revokeOrganisationInvitationRecord(
      db,
      organisationId,
      actorUserId,
      invitationId,
    ))
  ) {
    throw new ApiError(
      404,
      'INVITATION_NOT_FOUND',
      'The requested invitation was not found.',
    );
  }
}

export async function acceptOrganisationInvitation(
  db: DigiStreamDatabase,
  userId: string,
  userEmail: string,
  token: string,
): Promise<AcceptedOrganisationInvitationDto> {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    throw new ApiError(
      404,
      'INVITATION_NOT_FOUND',
      'The requested invitation was not found.',
    );
  }

  const result = await acceptOrganisationInvitationRecord(
    db,
    hashInvitationToken(token),
    userId,
    userEmail,
  );

  switch (result.status) {
    case 'accepted':
      return result.membership;
    case 'expired':
      throw new ApiError(
        410,
        'INVITATION_EXPIRED',
        'This organisation invitation has expired.',
      );
    case 'email_mismatch':
      throw new ApiError(
        403,
        'INVITATION_EMAIL_MISMATCH',
        'This invitation belongs to a different account.',
      );
    case 'already_member':
      throw new ApiError(
        409,
        'ALREADY_ORGANISATION_MEMBER',
        'This account is already an organisation member.',
      );
    default:
      throw new ApiError(
        404,
        'INVITATION_NOT_FOUND',
        'The requested invitation was not found.',
      );
  }
}

export async function updateOrganisationMemberRole(
  db: DigiStreamDatabase,
  actorUserId: string,
  organisationId: string,
  targetUserId: string,
  body: UpdateMemberRoleBody,
): Promise<OrganisationMemberDto> {
  if (!validUuid(organisationId) || !validUuid(targetUserId)) {
    throw new ApiError(
      404,
      'MEMBER_NOT_FOUND',
      'The requested organisation member was not found.',
    );
  }

  const nextRole = parseRole(body.role, ALL_ROLES);
  if (!nextRole) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Use one of these roles: owner, admin, broadcaster, moderator or analyst.',
    );
  }

  const result = await changeOrganisationMemberRoleRecord(
    db,
    organisationId,
    actorUserId,
    targetUserId,
    nextRole,
    (actorRole, targetRole, requestedRole) => {
      if (actorRole === 'owner') {
        return true;
      }

      return (
        actorRole === 'admin' &&
        LOWER_ROLES.has(targetRole) &&
        LOWER_ROLES.has(requestedRole)
      );
    },
  );

  if (result.status !== 'updated') {
    throwManagementResult(result);
  }

  return result.member;
}

export async function removeOrganisationMember(
  db: DigiStreamDatabase,
  actorUserId: string,
  organisationId: string,
  targetUserId: string,
): Promise<void> {
  if (!validUuid(organisationId) || !validUuid(targetUserId)) {
    throw new ApiError(
      404,
      'MEMBER_NOT_FOUND',
      'The requested organisation member was not found.',
    );
  }

  const result = await removeOrganisationMemberRecord(
    db,
    organisationId,
    actorUserId,
    targetUserId,
    (actorRole, targetRole, isSelf) => {
      if (isSelf) {
        return true;
      }
      if (actorRole === 'owner') {
        return true;
      }
      return actorRole === 'admin' && LOWER_ROLES.has(targetRole);
    },
  );

  if (result.status !== 'removed') {
    throwManagementResult(result);
  }
}
