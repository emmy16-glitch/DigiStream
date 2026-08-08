import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'organisation audit log is owner-admin only, tenant-safe and cursor paginated',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const userIds: string[] = [];
    let organisationId: string | null = null;

    async function register(label: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `${label}-${suffix}@example.test`,
          displayName: label,
          password,
        },
      });
      assert.equal(response.statusCode, 201);
      const userId = response.json().user.id as string;
      userIds.push(userId);
      return { cookie: responseCookie(response), userId };
    }

    try {
      const owner = await register('audit-owner');
      const broadcaster = await register('audit-broadcaster');
      const outsider = await register('audit-outsider');

      const create = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: { name: 'Audit Network', slug: `audit-${suffix}` },
      });
      assert.equal(create.statusCode, 201);
      organisationId = create.json().organisation.id as string;

      await database.pool.query(
        `insert into organisation_memberships (organisation_id, user_id, role)
         values ($1, $2, 'broadcaster')`,
        [organisationId, broadcaster.userId],
      );

      const update = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}`,
        headers: { cookie: owner.cookie },
        payload: { name: 'Audit Network Updated' },
      });
      assert.equal(update.statusCode, 200);

      const unauthenticated = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/audit-log`,
      });
      assert.equal(unauthenticated.statusCode, 401);

      const outsiderResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/audit-log`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(outsiderResponse.statusCode, 404);
      assert.equal(outsiderResponse.json().error.code, 'ORGANISATION_NOT_FOUND');

      const broadcasterResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/audit-log`,
        headers: { cookie: broadcaster.cookie },
      });
      assert.equal(broadcasterResponse.statusCode, 403);
      assert.equal(broadcasterResponse.json().error.code, 'AUDIT_LOG_ACCESS_REQUIRED');

      const firstPage = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/audit-log?limit=1`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(firstPage.statusCode, 200);
      const firstBody = firstPage.json();
      assert.equal(firstBody.events.length, 1);
      assert.equal(firstBody.events[0].action, 'organisation.updated');
      assert.equal(firstBody.events[0].actorUserId, owner.userId);
      assert.equal(typeof firstBody.nextCursor, 'string');

      const secondPage = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/audit-log?limit=1&cursor=${encodeURIComponent(firstBody.nextCursor)}`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(secondPage.statusCode, 200);
      const secondBody = secondPage.json();
      assert.equal(secondBody.events.length, 1);
      assert.equal(secondBody.events[0].action, 'organisation.created');
      assert.equal(secondBody.events[0].actorUserId, owner.userId);
      assert.equal(secondBody.nextCursor, null);

      const badCursor = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/audit-log?cursor=not-a-cursor`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(badCursor.statusCode, 400);
    } finally {
      if (organisationId) {
        await database.pool.query('delete from organisations where id = $1', [organisationId]);
      }
      for (const userId of userIds) {
        await database.pool.query('delete from users where id = $1', [userId]);
      }
      await app.close();
      await database.close();
    }
  },
);
