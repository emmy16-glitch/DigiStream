import { and, asc, eq, isNull } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import {
  userPlatformCapabilities,
  userProfiles,
  users,
} from '../../db/schema.js';
import type {
  OwnProfileDto,
  PlatformCapability,
  PublicProfileDto,
  SaveProfileInput,
} from './profiles.types.js';

export async function findOwnProfile(
  db: DigiStreamDatabase,
  userId: string,
): Promise<OwnProfileDto | null> {
  const [record] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      joinedAt: users.createdAt,
      username: userProfiles.username,
      biography: userProfiles.biography,
      isDiscoverable: userProfiles.isDiscoverable,
      profileCreatedAt: userProfiles.createdAt,
      profileUpdatedAt: userProfiles.updatedAt,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!record) {
    return null;
  }

  const capabilities = await db
    .select({ capability: userPlatformCapabilities.capability })
    .from(userPlatformCapabilities)
    .where(
      and(
        eq(userPlatformCapabilities.userId, userId),
        isNull(userPlatformCapabilities.revokedAt),
      ),
    )
    .orderBy(asc(userPlatformCapabilities.capability));

  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    status: record.status,
    emailVerifiedAt: record.emailVerifiedAt,
    joinedAt: record.joinedAt,
    profile:
      record.username && record.profileCreatedAt && record.profileUpdatedAt
        ? {
            username: record.username,
            biography: record.biography,
            isDiscoverable: record.isDiscoverable ?? true,
            createdAt: record.profileCreatedAt,
            updatedAt: record.profileUpdatedAt,
          }
        : null,
    capabilities: capabilities.map((item) => item.capability),
  };
}

export async function findPublicProfile(
  db: DigiStreamDatabase,
  username: string,
): Promise<PublicProfileDto | null> {
  const [record] = await db
    .select({
      id: users.id,
      username: userProfiles.username,
      displayName: users.displayName,
      biography: userProfiles.biography,
      joinedAt: users.createdAt,
      broadcasterCapabilityId: userPlatformCapabilities.id,
    })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .leftJoin(
      userPlatformCapabilities,
      and(
        eq(userPlatformCapabilities.userId, users.id),
        eq(userPlatformCapabilities.capability, 'broadcaster'),
        isNull(userPlatformCapabilities.revokedAt),
      ),
    )
    .where(
      and(
        eq(userProfiles.username, username),
        eq(userProfiles.isDiscoverable, true),
        eq(users.status, 'active'),
      ),
    )
    .limit(1);

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    username: record.username,
    displayName: record.displayName,
    biography: record.biography,
    isBroadcaster: record.broadcasterCapabilityId !== null,
    joinedAt: record.joinedAt,
  };
}

export async function saveProfile(
  db: DigiStreamDatabase,
  userId: string,
  input: SaveProfileInput,
): Promise<OwnProfileDto | null> {
  await db.transaction(async (transaction) => {
    if (input.displayName !== undefined) {
      await transaction
        .update(users)
        .set({
          displayName: input.displayName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    await transaction
      .insert(userProfiles)
      .values({
        userId,
        username: input.username,
        biography: input.biography,
        isDiscoverable: input.isDiscoverable,
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          username: input.username,
          biography: input.biography,
          isDiscoverable: input.isDiscoverable,
          updatedAt: new Date(),
        },
      });
  });

  return findOwnProfile(db, userId);
}

export async function hasPlatformCapability(
  db: DigiStreamDatabase,
  userId: string,
  capability: PlatformCapability,
): Promise<boolean> {
  const [record] = await db
    .select({ id: userPlatformCapabilities.id })
    .from(userPlatformCapabilities)
    .where(
      and(
        eq(userPlatformCapabilities.userId, userId),
        eq(userPlatformCapabilities.capability, capability),
        isNull(userPlatformCapabilities.revokedAt),
      ),
    )
    .limit(1);

  return record !== undefined;
}

export async function activeUserExists(
  db: DigiStreamDatabase,
  userId: string,
): Promise<boolean> {
  const [record] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.status, 'active')))
    .limit(1);

  return record !== undefined;
}

export async function grantPlatformCapability(
  db: DigiStreamDatabase,
  actorUserId: string,
  targetUserId: string,
  capability: PlatformCapability,
): Promise<void> {
  await db
    .insert(userPlatformCapabilities)
    .values({
      userId: targetUserId,
      capability,
      grantedByUserId: actorUserId,
    })
    .onConflictDoUpdate({
      target: [
        userPlatformCapabilities.userId,
        userPlatformCapabilities.capability,
      ],
      set: {
        grantedByUserId: actorUserId,
        grantedAt: new Date(),
        revokedAt: null,
      },
    });
}

export async function revokePlatformCapability(
  db: DigiStreamDatabase,
  targetUserId: string,
  capability: PlatformCapability,
): Promise<boolean> {
  const revoked = await db
    .update(userPlatformCapabilities)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(userPlatformCapabilities.userId, targetUserId),
        eq(userPlatformCapabilities.capability, capability),
        isNull(userPlatformCapabilities.revokedAt),
      ),
    )
    .returning({ id: userPlatformCapabilities.id });

  return revoked.length > 0;
}
