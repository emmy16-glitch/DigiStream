import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  userPlatformCapabilities,
  users,
} from '../src/db/schema.js';

const databaseUrl = process.env.DATABASE_URL;
const password = 'A-strong-profile-test-password-123!';

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'profiles expose safe public data and capabilities require platform admin authority',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const adminEmail = `profile-admin-${suffix}@example.test`;
    const creatorEmail = `profile-creator-${suffix}@example.test`;
    const app = buildApp({ database });
    const createdUserIds: string[] = [];

    try {
      const adminRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: adminEmail,
          displayName: 'Profile Administrator',
          password,
        },
      });
      assert.equal(adminRegistration.statusCode, 201);
      const adminId = adminRegistration.json().user.id as string;
      createdUserIds.push(adminId);
      const adminCookie = responseCookie(adminRegistration);

      const creatorRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: creatorEmail,
          displayName: 'Profile Creator',
          password,
        },
      });
      assert.equal(creatorRegistration.statusCode, 201);
      const creatorId = creatorRegistration.json().user.id as string;
      createdUserIds.push(creatorId);
      const creatorCookie = responseCookie(creatorRegistration);

      const emptyOwnProfile = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { cookie: creatorCookie },
      });
      assert.equal(emptyOwnProfile.statusCode, 200);
      assert.equal(emptyOwnProfile.json().profile.profile, null);
      assert.deepEqual(emptyOwnProfile.json().profile.capabilities, []);

      const unauthenticatedUpdate = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile',
        payload: { username: `creator_${suffix}` },
      });
      assert.equal(unauthenticatedUpdate.statusCode, 401);
      assert.equal(
        unauthenticatedUpdate.json().error.code,
        'AUTHENTICATION_REQUIRED',
      );
      assert.equal(
        unauthenticatedUpdate.json().error.requestId,
        unauthenticatedUpdate.headers['x-request-id'],
      );

      const invalidProfile = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile',
        headers: { cookie: creatorCookie },
        payload: {
          username: 'Admin',
          biography: 'Reserved username',
        },
      });
      assert.equal(invalidProfile.statusCode, 400);
      assert.equal(invalidProfile.json().error.code, 'VALIDATION_ERROR');

      const username = `creator_${suffix}`;
      const savedProfile = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile',
        headers: { cookie: creatorCookie },
        payload: {
          username: username.toUpperCase(),
          displayName: '  DigiStream   Creator  ',
          biography: '  Live audio creator and host.  ',
          isDiscoverable: true,
        },
      });
      assert.equal(savedProfile.statusCode, 200);
      assert.equal(savedProfile.json().profile.profile.username, username);
      assert.equal(
        savedProfile.json().profile.displayName,
        'DigiStream Creator',
      );
      assert.equal(
        savedProfile.json().profile.profile.biography,
        'Live audio creator and host.',
      );

      const publicProfile = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${username.toUpperCase()}`,
      });
      assert.equal(publicProfile.statusCode, 200);
      assert.equal(publicProfile.json().profile.username, username);
      assert.equal(publicProfile.json().profile.isBroadcaster, false);
      assert.equal('email' in publicProfile.json().profile, false);
      assert.equal('status' in publicProfile.json().profile, false);
      assert.equal('capabilities' in publicProfile.json().profile, false);

      const duplicateUsername = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile',
        headers: { cookie: adminCookie },
        payload: {
          username,
          biography: null,
          isDiscoverable: true,
        },
      });
      assert.equal(duplicateUsername.statusCode, 409);
      assert.equal(duplicateUsername.json().error.code, 'USERNAME_TAKEN');

      const nonAdminGrant = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/users/${adminId}/capabilities/broadcaster`,
        headers: { cookie: creatorCookie },
      });
      assert.equal(nonAdminGrant.statusCode, 403);
      assert.equal(
        nonAdminGrant.json().error.code,
        'PLATFORM_ADMIN_REQUIRED',
      );

      await database.db.insert(userPlatformCapabilities).values({
        userId: adminId,
        capability: 'platform_admin',
        grantedByUserId: adminId,
      });

      const grantBroadcaster = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/users/${creatorId}/capabilities/broadcaster`,
        headers: { cookie: adminCookie },
      });
      assert.equal(grantBroadcaster.statusCode, 200);
      assert.deepEqual(grantBroadcaster.json().capability, {
        userId: creatorId,
        capability: 'broadcaster',
        active: true,
      });

      const broadcasterProfile = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${username}`,
      });
      assert.equal(broadcasterProfile.statusCode, 200);
      assert.equal(broadcasterProfile.json().profile.isBroadcaster, true);

      const ownProfileWithCapability = await app.inject({
        method: 'GET',
        url: '/api/v1/profile',
        headers: { cookie: creatorCookie },
      });
      assert.equal(ownProfileWithCapability.statusCode, 200);
      assert.deepEqual(
        ownProfileWithCapability.json().profile.capabilities,
        ['broadcaster'],
      );

      const selfAdminRevoke = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/users/${adminId}/capabilities/platform_admin`,
        headers: { cookie: adminCookie },
      });
      assert.equal(selfAdminRevoke.statusCode, 409);
      assert.equal(
        selfAdminRevoke.json().error.code,
        'CANNOT_REVOKE_OWN_ADMIN',
      );

      const revokeBroadcaster = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/users/${creatorId}/capabilities/broadcaster`,
        headers: { cookie: adminCookie },
      });
      assert.equal(revokeBroadcaster.statusCode, 200);
      assert.equal(revokeBroadcaster.json().capability.active, false);

      const revokedProfile = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${username}`,
      });
      assert.equal(revokedProfile.statusCode, 200);
      assert.equal(revokedProfile.json().profile.isBroadcaster, false);

      const hiddenProfileUpdate = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile',
        headers: { cookie: creatorCookie },
        payload: {
          username,
          isDiscoverable: false,
        },
      });
      assert.equal(hiddenProfileUpdate.statusCode, 200);

      const hiddenPublicProfile = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${username}`,
      });
      assert.equal(hiddenPublicProfile.statusCode, 404);
      assert.equal(
        hiddenPublicProfile.json().error.code,
        'PROFILE_NOT_FOUND',
      );
    } finally {
      await app.close();

      for (const userId of createdUserIds) {
        await database.db.delete(users).where(eq(users.id, userId));
      }

      await database.close();
    }
  },
);
