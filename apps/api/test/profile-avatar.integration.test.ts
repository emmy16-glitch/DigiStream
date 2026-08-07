import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { users } from '../src/db/schema.js';
import { InMemoryObjectStorage } from '../src/modules/storage/object-storage.js';

const databaseUrl = process.env.DATABASE_URL;

function cookie(response: { headers: Record<string, unknown> }): string {
  const value = String(response.headers['set-cookie'] ?? '');
  return value.split(';', 1)[0] ?? '';
}

test(
  'profile avatars stay private in storage and use controlled public delivery',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const storage = new InMemoryObjectStorage();
    const app = buildApp({ database, objectStorage: storage, realtime: false });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
    const email = `avatar-${suffix}@example.test`;
    const username = `avatar_${suffix}`;
    let userId: string | undefined;

    try {
      const registration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          displayName: 'Avatar Tester',
          password: 'Avatar-test-password-123!',
        },
      });
      assert.equal(registration.statusCode, 201);
      userId = registration.json().user.id;
      const session = cookie(registration);

      const profile = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile',
        headers: { cookie: session },
        payload: {
          username,
          displayName: 'Avatar Tester',
          biography: 'Profile avatar acceptance test',
          isDiscoverable: true,
        },
      });
      assert.equal(profile.statusCode, 200);

      const unauthenticated = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile/avatar',
        headers: { 'content-type': 'image/png' },
        payload: Buffer.from('fake-image'),
      });
      assert.equal(unauthenticated.statusCode, 401);

      const invalid = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile/avatar',
        headers: { cookie: session, 'content-type': 'image/png' },
        payload: Buffer.alloc(0),
      });
      assert.equal(invalid.statusCode, 400);

      const bytes = Buffer.from('digistream-avatar-bytes');
      const upload = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile/avatar',
        headers: { cookie: session, 'content-type': 'image/png' },
        payload: bytes,
      });
      assert.equal(upload.statusCode, 200);
      assert.equal(upload.json().avatar.url, `/api/v1/profiles/${username}/avatar`);
      assert.equal(upload.json().avatar.contentType, 'image/png');
      assert.equal(upload.json().avatar.sizeBytes, bytes.byteLength);

      const publicAvatar = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${username}/avatar`,
      });
      assert.equal(publicAvatar.statusCode, 200);
      assert.equal(publicAvatar.headers['content-type'], 'image/png');
      assert.deepEqual(publicAvatar.rawPayload, bytes);

      const hideProfile = await app.inject({
        method: 'PUT',
        url: '/api/v1/profile',
        headers: { cookie: session },
        payload: {
          username,
          displayName: 'Avatar Tester',
          biography: 'Profile avatar acceptance test',
          isDiscoverable: false,
        },
      });
      assert.equal(hideProfile.statusCode, 200);
      const hiddenAvatar = await app.inject({
        method: 'GET',
        url: `/api/v1/profiles/${username}/avatar`,
      });
      assert.equal(hiddenAvatar.statusCode, 404);

      const remove = await app.inject({
        method: 'DELETE',
        url: '/api/v1/profile/avatar',
        headers: { cookie: session },
      });
      assert.equal(remove.statusCode, 204);
      const repeatedRemove = await app.inject({
        method: 'DELETE',
        url: '/api/v1/profile/avatar',
        headers: { cookie: session },
      });
      assert.equal(repeatedRemove.statusCode, 204);
    } finally {
      await app.close();
      if (userId) await database.db.delete(users).where(eq(users.id, userId));
      await database.close();
    }
  },
);
