import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  organisationMemberships,
  organisations,
  userPlatformCapabilities,
  users,
} from '../src/db/schema.js';
import { personalCreatorWorkspaces } from '../src/modules/organisations/personal-creator-workspaces.schema.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'organisation routes enforce broadcaster creation, automate one personal workspace and preserve tenant permissions',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const app = buildApp({ database });
    const userIds: string[] = [];
    const organisationIds: string[] = [];
    let organisationId: string | undefined;

    async function register(
      label: string,
    ): Promise<{ userId: string; cookie: string }> {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `${label}-${suffix}@example.test`,
          displayName: `${label} User`,
          password,
        },
      });

      assert.equal(response.statusCode, 201);
      const userId = response.json().user.id as string;
      userIds.push(userId);
      return { userId, cookie: responseCookie(response) };
    }

    try {
      const creator = await register('Creator');
      const analyst = await register('Analyst');
      const stranger = await register('Stranger');

      const unauthenticated = await app.inject({
        method: 'GET',
        url: '/api/v1/organisations',
      });
      assert.equal(unauthenticated.statusCode, 401);

      await database.db
        .update(userPlatformCapabilities)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(userPlatformCapabilities.userId, creator.userId),
            eq(userPlatformCapabilities.capability, 'broadcaster'),
          ),
        );

      const forbiddenCreation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: creator.cookie },
        payload: { name: 'Creator Network', slug: `creator-${suffix}` },
      });
      assert.equal(forbiddenCreation.statusCode, 403);
      assert.equal(
        forbiddenCreation.json().error.code,
        'BROADCASTER_CAPABILITY_REQUIRED',
      );

      const noForbiddenMapping = await database.db
        .select()
        .from(personalCreatorWorkspaces)
        .where(eq(personalCreatorWorkspaces.userId, creator.userId));
      assert.equal(noForbiddenMapping.length, 0);

      await database.db
        .update(userPlatformCapabilities)
        .set({ revokedAt: null })
        .where(
          and(
            eq(userPlatformCapabilities.userId, creator.userId),
            eq(userPlatformCapabilities.capability, 'broadcaster'),
          ),
        );

      const invalid = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: creator.cookie },
        payload: { name: 'A', slug: 'Invalid Slug' },
      });
      assert.equal(invalid.statusCode, 400);

      const slug = `creator-${suffix}`;
      const creation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: creator.cookie },
        payload: { name: 'Creator Network', slug },
      });
      assert.equal(creation.statusCode, 201);
      assert.equal(creation.json().organisation.role, 'owner');
      assert.equal(creation.json().organisation.slug, slug);
      assert.equal(creation.json().organisation.isPersonalWorkspace, true);
      organisationId = creation.json().organisation.id as string;
      organisationIds.push(organisationId);

      const [personalWorkspace] = await database.db
        .select()
        .from(personalCreatorWorkspaces)
        .where(eq(personalCreatorWorkspaces.userId, creator.userId))
        .limit(1);
      assert.ok(personalWorkspace);
      assert.equal(personalWorkspace.organisationId, organisationId);

      const [ownerMembership] = await database.db
        .select()
        .from(organisationMemberships)
        .where(
          and(
            eq(organisationMemberships.organisationId, organisationId),
            eq(organisationMemberships.userId, creator.userId),
          ),
        )
        .limit(1);
      assert.ok(ownerMembership);
      assert.equal(ownerMembership.role, 'owner');

      const duplicate = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: creator.cookie },
        payload: { name: 'Duplicate Network', slug },
      });
      assert.equal(duplicate.statusCode, 409);

      const secondCreation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: creator.cookie },
        payload: {
          name: 'Creator Network Two',
          slug: `creator-two-${suffix}`,
        },
      });
      assert.equal(secondCreation.statusCode, 201);
      assert.equal(secondCreation.json().organisation.isPersonalWorkspace, false);
      const secondOrganisationId = secondCreation.json().organisation.id as string;
      organisationIds.push(secondOrganisationId);

      const personalMappings = await database.db
        .select()
        .from(personalCreatorWorkspaces)
        .where(eq(personalCreatorWorkspaces.userId, creator.userId));
      assert.equal(personalMappings.length, 1);
      assert.equal(personalMappings[0]?.organisationId, organisationId);

      const ownerList = await app.inject({
        method: 'GET',
        url: '/api/v1/organisations',
        headers: { cookie: creator.cookie },
      });
      assert.equal(ownerList.statusCode, 200);
      assert.equal(ownerList.json().organisations.length, 2);
      const personalOrganisation = ownerList
        .json()
        .organisations.find(
          (item: { isPersonalWorkspace: boolean }) => item.isPersonalWorkspace,
        );
      assert.equal(personalOrganisation?.id, organisationId);

      await database.db.insert(organisationMemberships).values({
        organisationId,
        userId: analyst.userId,
        role: 'analyst',
        invitedByUserId: creator.userId,
      });

      const analystRead = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}`,
        headers: { cookie: analyst.cookie },
      });
      assert.equal(analystRead.statusCode, 200);
      assert.equal(analystRead.json().organisation.role, 'analyst');
      assert.equal(analystRead.json().organisation.isPersonalWorkspace, false);

      const analystUpdate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}`,
        headers: { cookie: analyst.cookie },
        payload: { name: 'Unauthorized Change' },
      });
      assert.equal(analystUpdate.statusCode, 403);

      const strangerRead = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}`,
        headers: { cookie: stranger.cookie },
      });
      assert.equal(strangerRead.statusCode, 404);
      assert.equal(strangerRead.json().error.code, 'ORGANISATION_NOT_FOUND');

      const update = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}`,
        headers: { cookie: creator.cookie },
        payload: { name: 'Creator Network Updated' },
      });
      assert.equal(update.statusCode, 200);
      assert.equal(update.json().organisation.name, 'Creator Network Updated');
      assert.equal(update.json().organisation.role, 'owner');
      assert.equal(update.json().organisation.isPersonalWorkspace, true);
    } finally {
      try {
        for (const id of organisationIds.reverse()) {
          await database.db.delete(organisations).where(eq(organisations.id, id));
        }

        for (const userId of userIds) {
          await database.db.delete(users).where(eq(users.id, userId));
        }
      } finally {
        await app.close();
        await database.close();
      }
    }
  },
);
