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
  'platform user administration is capability-gated, paginated, safe, and revokes suspended sessions',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const userIds: string[] = [];

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
      const administrator = await register('platform-admin');
      const ordinaryUser = await register('ordinary-user');
      const target = await register('admin-target');

      await database.pool.query(
        `insert into user_platform_capabilities
          (user_id, capability, granted_by_user_id)
         values ($1, 'platform_admin', $1)`,
        [administrator.userId],
      );

      const unauthenticated = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
      });
      assert.equal(unauthenticated.statusCode, 401);

      const insufficientCapability = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: { cookie: ordinaryUser.cookie },
      });
      assert.equal(insufficientCapability.statusCode, 403);
      assert.equal(insufficientCapability.json().error.code, 'PLATFORM_ADMIN_REQUIRED');

      const firstPage = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users?limit=1&status=active',
        headers: { cookie: administrator.cookie },
      });
      assert.equal(firstPage.statusCode, 200);
      assert.equal(firstPage.headers['cache-control'], 'no-store');
      const firstPayload = firstPage.json() as {
        users: Array<Record<string, unknown>>;
        nextCursor: string | null;
      };
      assert.equal(firstPayload.users.length, 1);
      assert.equal(typeof firstPayload.nextCursor, 'string');
      assert.equal('passwordHash' in firstPayload.users[0]!, false);
      assert.equal('password_hash' in firstPayload.users[0]!, false);

      const secondPage = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/users?limit=1&status=active&cursor=${encodeURIComponent(firstPayload.nextCursor!)}`,
        headers: { cookie: administrator.cookie },
      });
      assert.equal(secondPage.statusCode, 200);
      const secondPayload = secondPage.json() as { users: Array<{ id: string }> };
      assert.equal(secondPayload.users.length, 1);
      assert.notEqual(secondPayload.users[0]!.id, firstPayload.users[0]!.id);

      const invalidCursor = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users?cursor=not-a-real-cursor',
        headers: { cookie: administrator.cookie },
      });
      assert.equal(invalidCursor.statusCode, 400);
      assert.equal(invalidCursor.json().error.code, 'INVALID_CURSOR');

      const suspend = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${target.userId}/status`,
        headers: { cookie: administrator.cookie },
        payload: { status: 'suspended' },
      });
      assert.equal(suspend.statusCode, 200);
      assert.equal(suspend.headers['cache-control'], 'no-store');
      assert.equal(suspend.json().user.id, target.userId);
      assert.equal(suspend.json().user.status, 'suspended');
      assert.equal('passwordHash' in suspend.json().user, false);

      const suspendedSession = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: target.cookie },
      });
      assert.equal(suspendedSession.statusCode, 401);

      const suspendedLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `admin-target-${suffix}@example.test`,
          password,
        },
      });
      assert.equal(suspendedLogin.statusCode, 403);
      assert.equal(suspendedLogin.json().error.code, 'ACCOUNT_UNAVAILABLE');

      const reactivate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${target.userId}/status`,
        headers: { cookie: administrator.cookie },
        payload: { status: 'active' },
      });
      assert.equal(reactivate.statusCode, 200);
      assert.equal(reactivate.json().user.status, 'active');

      const loginAfterReactivation = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: `admin-target-${suffix}@example.test`,
          password,
        },
      });
      assert.equal(loginAfterReactivation.statusCode, 200);

      const selfSuspend = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${administrator.userId}/status`,
        headers: { cookie: administrator.cookie },
        payload: { status: 'suspended' },
      });
      assert.equal(selfSuspend.statusCode, 409);
      assert.equal(selfSuspend.json().error.code, 'SELF_SUSPENSION_NOT_ALLOWED');

      const invalidStatus = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${target.userId}/status`,
        headers: { cookie: administrator.cookie },
        payload: { status: 'deleted' },
      });
      assert.equal(invalidStatus.statusCode, 400);
      assert.equal(invalidStatus.json().error.code, 'INVALID_USER_STATUS');

      const missingUser = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/users/${randomUUID()}/status`,
        headers: { cookie: administrator.cookie },
        payload: { status: 'suspended' },
      });
      assert.equal(missingUser.statusCode, 404);
      assert.equal(missingUser.json().error.code, 'USER_NOT_FOUND');
    } finally {
      for (const userId of userIds) {
        await database.pool.query('delete from users where id = $1', [userId]);
      }
      await app.close();
      await database.close();
    }
  },
);
