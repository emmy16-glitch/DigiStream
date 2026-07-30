import {
  and,
  asc,
  count,
  eq,
  gt,
  isNull,
  sql,
} from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import {
  organisationMemberships,
  organisations,
  users,
} from '../../db/schema.js';
import { organisationInvitations } from './organisation-invitations.schema.js';
import type {
  AcceptedOrganisationInvitationDto,
  CreateOrganisationInvitationInput,
  OrganisationInvitationDto,
  OrganisationMemberDto,
} from './organisation-memberships.types.js';
import type { OrganisationRole } from './organisations.types.js';

export type MembershipManagementResult =
  | { status: 'updated'; member: OrganisationMemberDto }
  | { status: 'removed' }
  | { status: 'organisation_not_found' }
  | { status: 'member_not_found' }
  | { status: 'forbidden' }
  | { status: 'last_owner' };

export type InvitationAcceptanceResult =
  | { status: 'accepted'; membership: AcceptedOrganisationInvitationDto }
  | { status: 'not_found' }
  | { status: 'expired' }
  | { status: 'email_mismatch' }
  | { status: 'already_member' };

export async function findOrganisationRole(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
): Promise<OrganisationRole | null> {
  const [row] = await db
    .select({ role: organisationMemberships.role })
    .from(organisationMemberships)
    .where(
      and(
        eq(organisationMemberships.organisationId, organisationId),
        eq(organisationMemberships.userId, userId),
      ),
    )
    .limit(1);

  return row?.role ?? null;
}

export async function listOrganisationMembers(
  db: DigiStreamDatabase,
  organisationId: string,
): Promise<OrganisationMemberDto[]> {
  return db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      role: organisationMemberships.role,
      joinedAt: organisationMemberships.joinedAt,
    })
    .from(organisationMemberships)
    .innerJoin(users, eq(organisationMemberships.userId, users.id))
    .where(eq(organisationMemberships.organisationId, organisationId))
    .orderBy(asc(users.displayName), asc(users.id));
}

export async function userIsOrganisationMember(
  db: DigiStreamDatabase,
  organisationId: string,
  email: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: organisationMemberships.id })
    .from(organisationMemberships)
    .innerJoin(users, eq(organisationMemberships.userId, users.id))
    .where(
      and(
        eq(organisationMemberships.organisationId, organisationId),
        eq(users.email, email),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function createOrganisationInvitationRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  invitedByUserId: string,
  input: CreateOrganisationInvitationInput,
): Promise<OrganisationInvitationDto> {
  const [row] = await db
    .insert(organisationInvitations)
    .values({
      organisationId,
      email: input.email,
      role: input.role,
      tokenHash: input.tokenHash,
      invitedByUserId,
      expiresAt: input.expiresAt,
    })
    .returning();

  if (!row) {
    throw new Error('Organisation invitation insertion returned no row.');
  }

  return {
    id: row.id,
    organisationId: row.organisationId,
    email: row.email,
    role: row.role as Exclude<OrganisationRole, 'owner'>,
    invitedByUserId: row.invitedByUserId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export async function listPendingOrganisationInvitations(
  db: DigiStreamDatabase,
  organisationId: string,
): Promise<OrganisationInvitationDto[]> {
  const rows = await db
    .select()
    .from(organisationInvitations)
    .where(
      and(
        eq(organisationInvitations.organisationId, organisationId),
        isNull(organisationInvitations.acceptedAt),
        isNull(organisationInvitations.revokedAt),
        gt(organisationInvitations.expiresAt, new Date()),
      ),
    )
    .orderBy(asc(organisationInvitations.createdAt));

  return rows.map((row) => ({
    id: row.id,
    organisationId: row.organisationId,
    email: row.email,
    role: row.role as Exclude<OrganisationRole, 'owner'>,
    invitedByUserId: row.invitedByUserId,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  }));
}

export async function revokeOrganisationInvitationRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  invitationId: string,
): Promise<boolean> {
  const [row] = await db
    .update(organisationInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(organisationInvitations.id, invitationId),
        eq(organisationInvitations.organisationId, organisationId),
        isNull(organisationInvitations.acceptedAt),
        isNull(organisationInvitations.revokedAt),
      ),
    )
    .returning({ id: organisationInvitations.id });

  return Boolean(row);
}

export async function acceptOrganisationInvitationRecord(
  db: DigiStreamDatabase,
  tokenHash: string,
  userId: string,
  userEmail: string,
): Promise<InvitationAcceptanceResult> {
  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select id from organisation_invitations where token_hash = ${tokenHash} for update`,
    );

    const [invitation] = await transaction
      .select({
        id: organisationInvitations.id,
        organisationId: organisationInvitations.organisationId,
        organisationName: organisations.name,
        email: organisationInvitations.email,
        role: organisationInvitations.role,
        expiresAt: organisationInvitations.expiresAt,
        acceptedAt: organisationInvitations.acceptedAt,
        revokedAt: organisationInvitations.revokedAt,
      })
      .from(organisationInvitations)
      .innerJoin(
        organisations,
        eq(organisationInvitations.organisationId, organisations.id),
      )
      .where(eq(organisationInvitations.tokenHash, tokenHash))
      .limit(1);

    if (!invitation || invitation.acceptedAt || invitation.revokedAt) {
      return { status: 'not_found' };
    }

    if (invitation.expiresAt <= new Date()) {
      return { status: 'expired' };
    }

    if (invitation.email !== userEmail) {
      return { status: 'email_mismatch' };
    }

    const [existing] = await transaction
      .select({ id: organisationMemberships.id })
      .from(organisationMemberships)
      .where(
        and(
          eq(
            organisationMemberships.organisationId,
            invitation.organisationId,
          ),
          eq(organisationMemberships.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      return { status: 'already_member' };
    }

    const [membership] = await transaction
      .insert(organisationMemberships)
      .values({
        organisationId: invitation.organisationId,
        userId,
        role: invitation.role,
        invitedByUserId: null,
      })
      .returning({
        role: organisationMemberships.role,
        joinedAt: organisationMemberships.joinedAt,
      });

    if (!membership) {
      throw new Error('Organisation membership insertion returned no row.');
    }

    await transaction
      .update(organisationInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(organisationInvitations.id, invitation.id));

    return {
      status: 'accepted',
      membership: {
        organisationId: invitation.organisationId,
        organisationName: invitation.organisationName,
        role: membership.role,
        joinedAt: membership.joinedAt,
      },
    };
  });
}

export async function changeOrganisationMemberRoleRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  actorUserId: string,
  targetUserId: string,
  nextRole: OrganisationRole,
  authorize: (
    actorRole: OrganisationRole,
    targetRole: OrganisationRole,
    nextRole: OrganisationRole,
  ) => boolean,
): Promise<MembershipManagementResult> {
  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${organisationId}, 0))`,
    );

    const rows = await transaction
      .select({
        userId: organisationMemberships.userId,
        role: organisationMemberships.role,
        email: users.email,
        displayName: users.displayName,
        joinedAt: organisationMemberships.joinedAt,
      })
      .from(organisationMemberships)
      .innerJoin(users, eq(organisationMemberships.userId, users.id))
      .where(
        and(
          eq(organisationMemberships.organisationId, organisationId),
          sql`${organisationMemberships.userId} in (${actorUserId}, ${targetUserId})`,
        ),
      );

    const actor = rows.find((row) => row.userId === actorUserId);
    const target = rows.find((row) => row.userId === targetUserId);

    if (!actor) {
      return { status: 'organisation_not_found' };
    }
    if (!target) {
      return { status: 'member_not_found' };
    }
    if (!authorize(actor.role, target.role, nextRole)) {
      return { status: 'forbidden' };
    }

    if (target.role === 'owner' && nextRole !== 'owner') {
      const [owners] = await transaction
        .select({ total: count() })
        .from(organisationMemberships)
        .where(
          and(
            eq(organisationMemberships.organisationId, organisationId),
            eq(organisationMemberships.role, 'owner'),
          ),
        );

      if (Number(owners?.total ?? 0) <= 1) {
        return { status: 'last_owner' };
      }
    }

    const [updated] = await transaction
      .update(organisationMemberships)
      .set({ role: nextRole })
      .where(
        and(
          eq(organisationMemberships.organisationId, organisationId),
          eq(organisationMemberships.userId, targetUserId),
        ),
      )
      .returning({
        role: organisationMemberships.role,
        joinedAt: organisationMemberships.joinedAt,
      });

    if (!updated) {
      return { status: 'member_not_found' };
    }

    return {
      status: 'updated',
      member: {
        userId: target.userId,
        email: target.email,
        displayName: target.displayName,
        role: updated.role,
        joinedAt: updated.joinedAt,
      },
    };
  });
}

export async function removeOrganisationMemberRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  actorUserId: string,
  targetUserId: string,
  authorize: (
    actorRole: OrganisationRole,
    targetRole: OrganisationRole,
    isSelf: boolean,
  ) => boolean,
): Promise<MembershipManagementResult> {
  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${organisationId}, 0))`,
    );

    const rows = await transaction
      .select({
        userId: organisationMemberships.userId,
        role: organisationMemberships.role,
      })
      .from(organisationMemberships)
      .where(
        and(
          eq(organisationMemberships.organisationId, organisationId),
          sql`${organisationMemberships.userId} in (${actorUserId}, ${targetUserId})`,
        ),
      );

    const actor = rows.find((row) => row.userId === actorUserId);
    const target = rows.find((row) => row.userId === targetUserId);

    if (!actor) {
      return { status: 'organisation_not_found' };
    }
    if (!target) {
      return { status: 'member_not_found' };
    }
    if (!authorize(actor.role, target.role, actorUserId === targetUserId)) {
      return { status: 'forbidden' };
    }

    if (target.role === 'owner') {
      const [owners] = await transaction
        .select({ total: count() })
        .from(organisationMemberships)
        .where(
          and(
            eq(organisationMemberships.organisationId, organisationId),
            eq(organisationMemberships.role, 'owner'),
          ),
        );

      if (Number(owners?.total ?? 0) <= 1) {
        return { status: 'last_owner' };
      }
    }

    const [deleted] = await transaction
      .delete(organisationMemberships)
      .where(
        and(
          eq(organisationMemberships.organisationId, organisationId),
          eq(organisationMemberships.userId, targetUserId),
        ),
      )
      .returning({ id: organisationMemberships.id });

    return deleted ? { status: 'removed' } : { status: 'member_not_found' };
  });
}
