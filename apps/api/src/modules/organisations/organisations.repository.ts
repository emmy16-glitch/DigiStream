import { and, asc, eq, isNull, or } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import {
  organisationMemberships,
  organisations,
  userPlatformCapabilities,
} from '../../db/schema.js';
import { organisationAuditEvents } from './organisation-audit.schema.js';
import { personalCreatorWorkspaces } from './personal-creator-workspaces.schema.js';
import type {
  CreateOrganisationInput,
  OrganisationDto,
  OrganisationRole,
  UpdateOrganisationInput,
} from './organisations.types.js';

export async function canCreateOrganisation(
  db: DigiStreamDatabase,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: userPlatformCapabilities.id })
    .from(userPlatformCapabilities)
    .where(
      and(
        eq(userPlatformCapabilities.userId, userId),
        isNull(userPlatformCapabilities.revokedAt),
        or(
          eq(userPlatformCapabilities.capability, 'broadcaster'),
          eq(userPlatformCapabilities.capability, 'platform_admin'),
        ),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function createOrganisationWithOwner(
  db: DigiStreamDatabase,
  userId: string,
  input: CreateOrganisationInput,
): Promise<OrganisationDto> {
  return db.transaction(async (transaction) => {
    const [organisation] = await transaction
      .insert(organisations)
      .values({
        name: input.name,
        slug: input.slug,
        createdByUserId: userId,
      })
      .returning();

    if (!organisation) {
      throw new Error('Organisation insertion returned no row.');
    }

    await transaction.insert(organisationMemberships).values({
      organisationId: organisation.id,
      userId,
      role: 'owner',
    });

    const [personalWorkspace] = await transaction
      .insert(personalCreatorWorkspaces)
      .values({
        userId,
        organisationId: organisation.id,
      })
      .onConflictDoNothing({ target: personalCreatorWorkspaces.userId })
      .returning({ userId: personalCreatorWorkspaces.userId });

    await transaction.insert(organisationAuditEvents).values({
      organisationId: organisation.id,
      actorUserId: userId,
      action: 'organisation.created',
      details: {
        slug: organisation.slug,
      },
    });

    return {
      id: organisation.id,
      name: organisation.name,
      slug: organisation.slug,
      role: 'owner',
      isPersonalWorkspace: Boolean(personalWorkspace),
      createdAt: organisation.createdAt,
      updatedAt: organisation.updatedAt,
    };
  });
}

export async function listOrganisationsForUser(
  db: DigiStreamDatabase,
  userId: string,
): Promise<OrganisationDto[]> {
  const rows = await db
    .select({
      id: organisations.id,
      name: organisations.name,
      slug: organisations.slug,
      role: organisationMemberships.role,
      personalWorkspaceOrganisationId: personalCreatorWorkspaces.organisationId,
      createdAt: organisations.createdAt,
      updatedAt: organisations.updatedAt,
    })
    .from(organisationMemberships)
    .innerJoin(
      organisations,
      eq(organisationMemberships.organisationId, organisations.id),
    )
    .leftJoin(
      personalCreatorWorkspaces,
      and(
        eq(personalCreatorWorkspaces.userId, userId),
        eq(personalCreatorWorkspaces.organisationId, organisations.id),
      ),
    )
    .where(eq(organisationMemberships.userId, userId))
    .orderBy(asc(organisations.name), asc(organisations.id));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    role: row.role,
    isPersonalWorkspace: row.personalWorkspaceOrganisationId === row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function findOrganisationForUser(
  db: DigiStreamDatabase,
  userId: string,
  organisationId: string,
): Promise<OrganisationDto | null> {
  const [row] = await db
    .select({
      id: organisations.id,
      name: organisations.name,
      slug: organisations.slug,
      role: organisationMemberships.role,
      personalWorkspaceOrganisationId: personalCreatorWorkspaces.organisationId,
      createdAt: organisations.createdAt,
      updatedAt: organisations.updatedAt,
    })
    .from(organisationMemberships)
    .innerJoin(
      organisations,
      eq(organisationMemberships.organisationId, organisations.id),
    )
    .leftJoin(
      personalCreatorWorkspaces,
      and(
        eq(personalCreatorWorkspaces.userId, userId),
        eq(personalCreatorWorkspaces.organisationId, organisations.id),
      ),
    )
    .where(
      and(
        eq(organisationMemberships.userId, userId),
        eq(organisationMemberships.organisationId, organisationId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    role: row.role,
    isPersonalWorkspace: row.personalWorkspaceOrganisationId === row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function updateOrganisationRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  actorUserId: string,
  role: OrganisationRole,
  input: UpdateOrganisationInput,
): Promise<OrganisationDto | null> {
  return db.transaction(async (transaction) => {
    const [row] = await transaction
      .update(organisations)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(organisations.id, organisationId))
      .returning();

    if (!row) {
      return null;
    }

    await transaction.insert(organisationAuditEvents).values({
      organisationId,
      actorUserId,
      action: 'organisation.updated',
      details: {
        changedFields: Object.keys(input).sort(),
      },
    });

    const [personalWorkspace] = await transaction
      .select({ organisationId: personalCreatorWorkspaces.organisationId })
      .from(personalCreatorWorkspaces)
      .where(
        and(
          eq(personalCreatorWorkspaces.userId, actorUserId),
          eq(personalCreatorWorkspaces.organisationId, organisationId),
        ),
      )
      .limit(1);

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      role,
      isPersonalWorkspace: Boolean(personalWorkspace),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}
