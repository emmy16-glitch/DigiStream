import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { organisationMemberships, organisations, users } from '../src/db/schema.js';
import { InMemoryObjectStorage } from '../src/modules/storage/object-storage.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'channel artwork stays private in storage and follows tenant and channel visibility truth',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const storage = new InMemoryObjectStorage();
    const app = buildApp({ database, objectStorage: storage, realtime: false });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const userIds: string[] = [];
    let organisationId: string | undefined;

    async function register(label: string): Promise<{ userId: string; cookie: string }> {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `${label.toLowerCase()}-art-${suffix}@example.test`,
          displayName: `${label} Artwork User`,
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
      const stranger = await register('Stranger');
      const organisationCreation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: { name: 'Artwork Network', slug: `artwork-${suffix}` },
      });
      assert.equal(organisationCreation.statusCode, 201);
      organisationId = organisationCreation.json().organisation.id as string;
      const organisationSlug = organisationCreation.json().organisation.slug as string;

      await database.db.insert(organisationMemberships).values({
        organisationId,
        userId: analyst.userId,
        role: 'analyst',
        invitedByUserId: owner.userId,
      });

      const channelSlug = `art-${suffix}`;
      const creation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Artwork Channel',
          slug: channelSlug,
          visibility: 'public',
        },
      });
      assert.equal(creation.statusCode, 201);
      const channelId = creation.json().channel.id as string;
      const managedArtworkUrl = `/api/v1/organisations/${organisationId}/channels/${channelId}/artwork`;
      const publicArtworkUrl = `/api/v1/channels/${organisationSlug}/${channelSlug}/artwork`;
      const bytes = Buffer.from('digistream-channel-artwork');

      const unauthenticated = await app.inject({
        method: 'PUT',
        url: managedArtworkUrl,
        headers: { 'content-type': 'image/png' },
        payload: bytes,
      });
      assert.equal(unauthenticated.statusCode, 401);

      const analystUpload = await app.inject({
        method: 'PUT',
        url: managedArtworkUrl,
        headers: { cookie: analyst.cookie, 'content-type': 'image/png' },
        payload: bytes,
      });
      assert.equal(analystUpload.statusCode, 403);
      assert.equal(analystUpload.json().error.code, 'CHANNEL_MANAGEMENT_REQUIRED');

      const strangerRead = await app.inject({
        method: 'GET',
        url: managedArtworkUrl,
        headers: { cookie: stranger.cookie },
      });
      assert.equal(strangerRead.statusCode, 404);
      assert.equal(strangerRead.json().error.code, 'CHANNEL_NOT_FOUND');

      const upload = await app.inject({
        method: 'PUT',
        url: managedArtworkUrl,
        headers: { cookie: owner.cookie, 'content-type': 'image/png' },
        payload: bytes,
      });
      assert.equal(upload.statusCode, 200);
      assert.equal(upload.json().artwork.url, managedArtworkUrl);
      assert.equal(upload.json().artwork.contentType, 'image/png');
      assert.equal(upload.json().artwork.sizeBytes, bytes.byteLength);
      assert.equal(JSON.stringify(upload.json()).includes('storage_key'), false);
      assert.equal(JSON.stringify(upload.json()).includes('checksum'), false);

      const memberRead = await app.inject({
        method: 'GET',
        url: managedArtworkUrl,
        headers: { cookie: analyst.cookie },
      });
      assert.equal(memberRead.statusCode, 200);
      assert.equal(memberRead.headers['content-type'], 'image/png');
      assert.deepEqual(memberRead.rawPayload, bytes);

      const draftPublic = await app.inject({ method: 'GET', url: publicArtworkUrl });
      assert.equal(draftPublic.statusCode, 404);

      const pending = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'pending_review' },
      });
      assert.equal(pending.statusCode, 200);
      const active = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'active' },
      });
      assert.equal(active.statusCode, 200);

      const publicRead = await app.inject({ method: 'GET', url: publicArtworkUrl });
      assert.equal(publicRead.statusCode, 200);
      assert.equal(publicRead.headers['content-type'], 'image/png');
      assert.deepEqual(publicRead.rawPayload, bytes);

      const privateUpdate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { visibility: 'private' },
      });
      assert.equal(privateUpdate.statusCode, 200);
      const privatePublicRead = await app.inject({ method: 'GET', url: publicArtworkUrl });
      assert.equal(privatePublicRead.statusCode, 404);

      const remove = await app.inject({
        method: 'DELETE',
        url: managedArtworkUrl,
        headers: { cookie: owner.cookie },
      });
      assert.equal(remove.statusCode, 204);
      const repeatedRemove = await app.inject({
        method: 'DELETE',
        url: managedArtworkUrl,
        headers: { cookie: owner.cookie },
      });
      assert.equal(repeatedRemove.statusCode, 204);
      const afterRemoval = await app.inject({
        method: 'GET',
        url: managedArtworkUrl,
        headers: { cookie: owner.cookie },
      });
      assert.equal(afterRemoval.statusCode, 404);
    } finally {
      try {
        if (organisationId) {
          await database.db.delete(organisations).where(eq(organisations.id, organisationId));
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
