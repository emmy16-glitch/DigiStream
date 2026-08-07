import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { users } from '../src/db/schema.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'users can list active sessions and revoke another device without crossing account boundaries',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const email = `sessions-${suffix}@example.test`;
    const otherEmail = `sessions-other-${suffix}@example.test`;
    const password = 'A-strong-test-password-123!';
    const app = buildApp({ database });
    let userId: string | undefined;
    let otherUserId: string | undefined;

    try {
      const registration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'user-agent': 'Primary Android Chrome' },
        payload: { email, displayName: 'Session Owner', password },
      });
      assert.equal(registration.statusCode, 201);
      const primaryCookie = responseCookie(registration);
      userId = registration.json().user.id;

      const secondLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'user-agent': 'Desktop Chrome' },
        payload: { email, password },
      });
      assert.equal(secondLogin.statusCode, 200);
      const secondCookie = responseCookie(secondLogin);

      const thirdLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'user-agent': 'Android tablet' },
        payload: { email, password },
      });
      assert.equal(thirdLogin.statusCode, 200);
      const thirdCookie = responseCookie(thirdLogin);

      const list = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sessions',
        headers: { cookie: primaryCookie },
      });
      assert.equal(list.statusCode, 200);
      assert.match(String(list.headers['cache-control']), /no-store/i);
      const sessions = list.json().sessions as Array<{
        id: string;
        userAgent: string | null;
        current: boolean;
      }>;
      assert.equal(sessions.length, 3);
      assert.equal(sessions.filter((session) => session.current).length, 1);
      assert.equal(
        sessions.find((session) => session.current)?.userAgent,
        'Primary Android Chrome',
      );
      assert.equal(
        sessions.some((session) => 'tokenHash' in session || 'ipAddress' in session),
        false,
      );

      const secondSession = sessions.find(
        (session) => session.userAgent === 'Desktop Chrome',
      );
      assert.ok(secondSession);

      const revoke = await app.inject({
        method: 'DELETE',
        url: `/api/v1/auth/sessions/${secondSession.id}`,
        headers: { cookie: primaryCookie },
      });
      assert.equal(revoke.statusCode, 204);

      const revokeAgain = await app.inject({
        method: 'DELETE',
        url: `/api/v1/auth/sessions/${secondSession.id}`,
        headers: { cookie: primaryCookie },
      });
      assert.equal(revokeAgain.statusCode, 204);

      const revokedDevice = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: secondCookie },
      });
      assert.equal(revokedDevice.statusCode, 401);

      const currentSession = sessions.find((session) => session.current);
      assert.ok(currentSession);
      const revokeCurrent = await app.inject({
        method: 'DELETE',
        url: `/api/v1/auth/sessions/${currentSession.id}`,
        headers: { cookie: primaryCookie },
      });
      assert.equal(revokeCurrent.statusCode, 409);
      assert.equal(
        revokeCurrent.json().error.code,
        'CURRENT_SESSION_REQUIRES_LOGOUT',
      );

      const otherRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'user-agent': 'Unrelated browser' },
        payload: { other: true, email: otherEmail, displayName: 'Other User', password },
      });
      assert.equal(otherRegistration.statusCode, 201);
      const otherCookie = responseCookie(otherRegistration);
      otherUserId = otherRegistration.json().user.id;

      const crossAccountRevoke = await app.inject({
        method: 'DELETE',
        url: `/api/v1/auth/sessions/${thirdLogin.json().sessionId ?? secondSession.id}`,
        headers: { cookie: otherCookie },
      });
      assert.equal(crossAccountRevoke.statusCode, 404);
      assert.equal(crossAccountRevoke.json().error.code, 'SESSION_NOT_FOUND');

      const thirdStillActive = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: thirdCookie },
      });
      assert.equal(thirdStillActive.statusCode, 200);

      const noAuth = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sessions',
      });
      assert.equal(noAuth.statusCode, 401);
    } finally {
      await app.close();
      if (userId) await database.db.delete(users).where(eq(users.id, userId));
      if (otherUserId) {
        await database.db.delete(users).where(eq(users.id, otherUserId));
      }
      await database.close();
    }
  },
);
