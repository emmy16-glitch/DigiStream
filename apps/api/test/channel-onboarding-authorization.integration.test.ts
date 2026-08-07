import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  organisationMemberships,
  organisations,
  users,
} from '../src/db/schema.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'channel onboarding preserves role boundaries and private-not-found tenant isolation',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const app = buildApp({ database });
    const userIds: string[] = [];
    let organisationId: string | undefined;

    async function register(label: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `${label.toLowerCase()}-${suffix}@example.test`,
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
      const owner = await register('Owner');
      const analyst = await register('Analyst');
      const outsider = await register('Outsider');

      const organisationCreation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Channel Acceptance Network',
          slug: `channel-acceptance-${suffix}`,
        },
      });
      assert.equal(organisationCreation.statusCode, 201);
      organisationId = organisationCreation.json().organisation.id as string;

      await database.db.insert(organisationMemberships).values({
        organisationId,
        userId: analyst.userId,
        role: 'analyst',
        invitedByUserId: owner.userId,
      });

      const analystCreate = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: analyst.cookie },
        payload: {
          name: 'Analyst must not create',
          slug: `analyst-${suffix}`,
        },
      });
      assert.equal(analystCreate.statusCode, 403);
      assert.equal(
        analystCreate.json().error.code,
        'CHANNEL_MANAGEMENT_REQUIRED',
      );

      const outsiderCreate = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: outsider.cookie },
        payload: {
          name: 'Outsider must not create',
          slug: `outsider-${suffix}`,
        },
      });
      assert.equal(outsiderCreate.statusCode, 404);
      assert.equal(
        outsiderCreate.json().error.code,
        'ORGANISATION_NOT_FOUND',
      );

      const ownerCreate = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Owner Channel',
          slug: `owner-${suffix}`,
          visibility: 'private',
        },
      });
      assert.equal(ownerCreate.statusCode, 201);
      const channelId = ownerCreate.json().channel.id as string;

      const outsiderRead = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(outsiderRead.statusCode, 404);
      assert.equal(
        outsiderRead.json().error.code,
        'ORGANISATION_NOT_FOUND',
      );

      const outsiderUpdate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: outsider.cookie },
        payload: { name: 'Tenant leak attempt' },
      });
      assert.equal(outsiderUpdate.statusCode, 404);
      assert.equal(
        outsiderUpdate.json().error.code,
        'ORGANISATION_NOT_FOUND',
      );
    } finally {
      try {
        if (organisationId) {
          await database.db
            .delete(organisations)
            .where(eq(organisations.id, organisationId));
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
