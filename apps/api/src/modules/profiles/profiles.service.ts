import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  activeUserExists,
  findOwnProfile,
  findPublicProfile,
  grantPlatformCapability,
  hasPlatformCapability,
  revokePlatformCapability,
  saveProfile,
} from './profiles.repository.js';
import type {
  OwnProfileDto,
  PlatformCapability,
  PublicProfileDto,
} from './profiles.types.js';

const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'auth',
  'broadcasts',
  'channels',
  'health',
  'help',
  'login',
  'logout',
  'organisations',
  'profile',
  'profiles',
  'register',
  'settings',
  'status',
  'support',
]);

export type SaveProfileBody = {
  username?: unknown;
  displayName?: unknown;
  biography?: unknown;
  isDiscoverable?: unknown;
};

function normaliseUsername(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const username = value.trim().toLowerCase();
  if (
    !/^[a-z0-9_]{3,30}$/.test(username) ||
    RESERVED_USERNAMES.has(username)
  ) {
    return null;
  }

  return username;
}

function normaliseDisplayName(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const displayName = value.trim().replace(/\s+/g, ' ');
  return displayName.length >= 2 && displayName.length <= 100
    ? displayName
    : null;
}

function normaliseBiography(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const biography = value.trim();
  if (biography.length > 500) {
    return undefined;
  }

  return biography.length === 0 ? null : biography;
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

function validUserId(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    userId,
  );
}

export function parsePlatformCapability(
  value: string,
): PlatformCapability | null {
  return value === 'broadcaster' || value === 'platform_admin'
    ? value
    : null;
}

export async function getOwnProfile(
  db: DigiStreamDatabase,
  userId: string,
): Promise<OwnProfileDto> {
  const profile = await findOwnProfile(db, userId);
  if (!profile) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'The user account was not found.');
  }

  return profile;
}

export async function updateOwnProfile(
  db: DigiStreamDatabase,
  userId: string,
  body: SaveProfileBody,
): Promise<OwnProfileDto> {
  const username = normaliseUsername(body.username);
  const displayName = normaliseDisplayName(body.displayName);
  const biography = normaliseBiography(body.biography);
  const current = await getOwnProfile(db, userId);

  if (
    !username ||
    displayName === null ||
    (body.biography !== undefined && biography === undefined) ||
    (body.isDiscoverable !== undefined &&
      typeof body.isDiscoverable !== 'boolean')
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Use a 3–30 character lowercase username containing letters, numbers or underscores; a 2–100 character display name; and a biography no longer than 500 characters.',
    );
  }

  try {
    const saved = await saveProfile(db, userId, {
      username,
      displayName,
      biography:
        body.biography === undefined
          ? current.profile?.biography ?? null
          : biography ?? null,
      isDiscoverable:
        typeof body.isDiscoverable === 'boolean'
          ? body.isDiscoverable
          : current.profile?.isDiscoverable ?? true,
    });

    if (!saved) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'The user account was not found.');
    }

    return saved;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(
        409,
        'USERNAME_TAKEN',
        'That username is already in use.',
      );
    }

    throw error;
  }
}

export async function getPublicProfile(
  db: DigiStreamDatabase,
  rawUsername: string,
): Promise<PublicProfileDto> {
  const username = normaliseUsername(rawUsername);
  const profile = username ? await findPublicProfile(db, username) : null;

  if (!profile) {
    throw new ApiError(
      404,
      'PROFILE_NOT_FOUND',
      'The requested public profile was not found.',
    );
  }

  return profile;
}

async function requirePlatformAdministrator(
  db: DigiStreamDatabase,
  actorUserId: string,
): Promise<void> {
  const allowed = await hasPlatformCapability(
    db,
    actorUserId,
    'platform_admin',
  );

  if (!allowed) {
    throw new ApiError(
      403,
      'PLATFORM_ADMIN_REQUIRED',
      'Platform administrator authority is required.',
    );
  }
}

export async function grantCapability(
  db: DigiStreamDatabase,
  actorUserId: string,
  targetUserId: string,
  capability: PlatformCapability,
): Promise<{ userId: string; capability: PlatformCapability; active: true }> {
  await requirePlatformAdministrator(db, actorUserId);

  if (!validUserId(targetUserId) || !(await activeUserExists(db, targetUserId))) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'The target user was not found.');
  }

  await grantPlatformCapability(db, actorUserId, targetUserId, capability);
  return { userId: targetUserId, capability, active: true };
}

export async function revokeCapability(
  db: DigiStreamDatabase,
  actorUserId: string,
  targetUserId: string,
  capability: PlatformCapability,
): Promise<{ userId: string; capability: PlatformCapability; active: false }> {
  await requirePlatformAdministrator(db, actorUserId);

  if (actorUserId === targetUserId && capability === 'platform_admin') {
    throw new ApiError(
      409,
      'CANNOT_REVOKE_OWN_ADMIN',
      'A platform administrator cannot revoke their own administrator authority.',
    );
  }

  if (!validUserId(targetUserId) || !(await activeUserExists(db, targetUserId))) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'The target user was not found.');
  }

  await revokePlatformCapability(db, targetUserId, capability);
  return { userId: targetUserId, capability, active: false };
}
