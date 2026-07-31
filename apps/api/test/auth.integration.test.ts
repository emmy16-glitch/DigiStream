import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  authSessions,
  organisations,
  userPlatformCapabilities,
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
  'registration creates a usable creator workspace and secure database session',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const email = `auth-${suffix}@example.test`;
    const password = 'A-strong-test-password-123!';
    let userId: string | undefined;
    let organisationId: string | undefined;
    const app = buildApp({ database });

    try {
      const providers = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/providers',
      });
      assert.equal(providers.statusCode, 200);
      assert.equal(providers.json().providers.email.enabled, true);
      assert.equal(typeof providers.json().providers.google.enabled, 'boolean');
      assert.equal('clientSecret' in providers.json().providers.google, false);

      const invalidRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid',
          displayName: 'A',
          password: 'short',
        },
      });
      assert.equal(invalidRegistration.statusCode, 400);

      const registration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: {
          'user-agent': 'DigiStream integration test',
        },
        payload: {
          email: `  ${email.toUpperCase()}  `,
          displayName: '  Test   Broadcaster  ',
          password,
        },
      });

      assert.equal(registration.statusCode, 201);
      assert.equal(registration.json().user.email, email);
      assert.equal(registration.json().user.displayName, 'Test Broadcaster');
      assert.equal('passwordHash' in registration.json().user, false);

      const registrationCookieHeader = String(
        registration.headers['set-cookie'],
      );
      assert.match(registrationCookieHeader, /HttpOnly/i);
      assert.match(registrationCookieHeader, /SameSite=Lax/i);
      const registrationCookie = responseCookie(registration);

      const [storedUser] = await database.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      assert.ok(storedUser);
      userId = storedUser.id;
      assert.notEqual(storedUser.passwordHash, password);
      assert.match(storedUser.passwordHash, /^scrypt\$/);

      const capabilities = await database.db
        .select()
        .from(userPlatformCapabilities)
        .where(eq(userPlatformCapabilities.userId, storedUser.id));
      const broadcasterCapability = capabilities.find(
        (capability) => capability.capability === 'broadcaster',
      );
      assert.ok(broadcasterCapability);
      assert.equal(broadcasterCapability.revokedAt, null);

      const organisation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: registrationCookie },
        payload: {
          name: `Auth Test ${suffix}`,
          slug: `auth-test-${suffix}`,
        },
      });
      assert.equal(organisation.statusCode, 201);
      assert.equal(organisation.json().organisation.role, 'owner');
      organisationId = organisation.json().organisation.id;

      const channel = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: registrationCookie },
        payload: {
          name: 'First Channel',
          slug: `first-channel-${suffix}`,
          description: 'The first real creator channel.',
          category: 'community',
          visibility: 'public',
        },
      });
      assert.equal(channel.statusCode, 201);
      assert.equal(channel.json().channel.status, 'draft');
      const channelId = channel.json().channel.id;

      const scheduledStartAt = new Date(Date.now() + 10 * 60_000).toISOString();
      const scheduleBeforeActivation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
        headers: { cookie: registrationCookie },
        payload: {
          title: 'First Scheduled Broadcast',
          slug: `first-broadcast-${suffix}`,
          scheduledStartAt,
        },
      });
      assert.equal(scheduleBeforeActivation.statusCode, 409);
      assert.equal(scheduleBeforeActivation.json().error.code, 'CHANNEL_NOT_ACTIVE');

      const submitChannel = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: registrationCookie },
        payload: { status: 'pending_review' },
      });
      assert.equal(submitChannel.statusCode, 200);
      assert.equal(submitChannel.json().channel.status, 'pending_review');

      const activateChannel = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: registrationCookie },
        payload: { status: 'active' },
      });
      assert.equal(activateChannel.statusCode, 200);
      assert.equal(activateChannel.json().channel.status, 'active');

      const broadcast = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
        headers: { cookie: registrationCookie },
        payload: {
          title: 'First Scheduled Broadcast',
          slug: `first-broadcast-${suffix}`,
          description: 'Created through the first-time creator journey.',
          scheduledStartAt,
        },
      });
      assert.equal(broadcast.statusCode, 201);
      assert.equal(broadcast.json().broadcast.status, 'scheduled');
      assert.equal(broadcast.json().broadcast.channelId, channelId);

      const broadcastList = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
        headers: { cookie: registrationCookie },
      });
      assert.equal(broadcastList.statusCode, 200);
      assert.equal(broadcastList.json().broadcasts.length, 1);
      assert.equal(broadcastList.json().broadcasts[0].id, broadcast.json().broadcast.id);

      const duplicate = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: email.toUpperCase(),
          displayName: 'Duplicate User',
          password,
        },
      });
      assert.equal(duplicate.statusCode, 409);

      const me = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: registrationCookie },
      });
      assert.equal(me.statusCode, 200);
      assert.equal(me.json().user.id, storedUser.id);
      assert.equal('passwordHash' in me.json().user, false);

      const wrongPassword = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email,
          password: 'This-is-the-wrong-password!',
        },
      });
      assert.equal(wrongPassword.statusCode, 401);
      assert.equal(wrongPassword.json().error.code, 'INVALID_CREDENTIALS');

      const logout = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { cookie: registrationCookie },
      });
      assert.equal(logout.statusCode, 204);
      assert.match(String(logout.headers['set-cookie']), /Max-Age=0/i);

      const meAfterLogout = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: registrationCookie },
      });
      assert.equal(meAfterLogout.statusCode, 401);

      const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password },
      });
      assert.equal(login.statusCode, 200);
      assert.equal(login.json().user.id, storedUser.id);
      assert.ok(responseCookie(login));

      const expiredToken = randomBytes(32).toString('base64url');
      const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      await database.db.insert(authSessions).values({
        userId: storedUser.id,
        tokenHash: createHash('sha256').update(expiredToken).digest('hex'),
        createdAt,
        lastUsedAt: createdAt,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      const expiredSession = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: `digistream_session=${expiredToken}` },
      });
      assert.equal(expiredSession.statusCode, 401);
    } finally {
      await app.close();

      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }
      if (userId) {
        await database.db.delete(users).where(eq(users.id, userId));
      }

      await database.close();
    }
  },
);
