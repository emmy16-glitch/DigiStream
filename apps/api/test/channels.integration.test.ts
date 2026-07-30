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
  'channel routes enforce lifecycle, visibility and tenant permissions',
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

    async function register(
      label: string,
    ): Promise<{ userId: string; cookie: string }> {
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
      const broadcaster = await register('Broadcaster');
      const analyst = await register('Analyst');
      const stranger = await register('Stranger');

      await database.db.insert(userPlatformCapabilities).values({
        userId: owner.userId,
        capability: 'broadcaster',
        grantedByUserId: owner.userId,
      });

      const organisationCreation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Channel Test Network',
          slug: `channel-test-${suffix}`,
        },
      });
      assert.equal(organisationCreation.statusCode, 201);
      organisationId = organisationCreation.json().organisation.id as string;
      const organisationSlug = organisationCreation.json().organisation.slug as string;

      await database.db.insert(organisationMemberships).values([
        {
          organisationId,
          userId: broadcaster.userId,
          role: 'broadcaster',
          invitedByUserId: owner.userId,
        },
        {
          organisationId,
          userId: analyst.userId,
          role: 'analyst',
          invitedByUserId: owner.userId,
        },
      ]);

      const channelSlug = `morning-${suffix}`;
      const creation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: broadcaster.cookie },
        payload: {
          name: 'Morning Voice',
          slug: channelSlug,
          description: 'Daily live audio and community updates.',
          category: 'community',
          visibility: 'public',
        },
      });
      assert.equal(creation.statusCode, 201);
      assert.equal(creation.json().channel.status, 'draft');
      assert.equal(creation.json().channel.createdByUserId, broadcaster.userId);
      const channelId = creation.json().channel.id as string;

      const duplicate = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Duplicate Channel',
          slug: channelSlug,
        },
      });
      assert.equal(duplicate.statusCode, 409);
      assert.equal(duplicate.json().error.code, 'CHANNEL_SLUG_TAKEN');

      const analystList = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: analyst.cookie },
      });
      assert.equal(analystList.statusCode, 200);
      assert.equal(analystList.json().channels.length, 1);

      const strangerList = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: stranger.cookie },
      });
      assert.equal(strangerList.statusCode, 404);
      assert.equal(strangerList.json().error.code, 'ORGANISATION_NOT_FOUND');

      const invalidActivation = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'active' },
      });
      assert.equal(invalidActivation.statusCode, 409);
      assert.equal(
        invalidActivation.json().error.code,
        'INVALID_CHANNEL_STATUS_TRANSITION',
      );

      const broadcasterApproval = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: broadcaster.cookie },
        payload: { status: 'pending_review' },
      });
      assert.equal(broadcasterApproval.statusCode, 403);
      assert.equal(
        broadcasterApproval.json().error.code,
        'CHANNEL_APPROVAL_REQUIRED',
      );

      const contentUpdate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: broadcaster.cookie },
        payload: {
          description: 'Updated community programming.',
          visibility: 'unlisted',
        },
      });
      assert.equal(contentUpdate.statusCode, 200);
      assert.equal(contentUpdate.json().channel.visibility, 'unlisted');

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

      const unlistedPublicList = await app.inject({
        method: 'GET',
        url: '/api/v1/channels?category=community',
      });
      assert.equal(unlistedPublicList.statusCode, 200);
      assert.equal(unlistedPublicList.json().channels.length, 0);

      const unlistedDirect = await app.inject({
        method: 'GET',
        url: `/api/v1/channels/${organisationSlug}/${channelSlug}`,
      });
      assert.equal(unlistedDirect.statusCode, 200);

      const makePublic = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: broadcaster.cookie },
        payload: { visibility: 'public' },
      });
      assert.equal(makePublic.statusCode, 200);

      const publicList = await app.inject({
        method: 'GET',
        url: '/api/v1/channels?category=community&limit=10',
      });
      assert.equal(publicList.statusCode, 200);
      assert.equal(publicList.json().channels.length, 1);
      assert.equal(publicList.json().channels[0].slug, channelSlug);

      const analystUpdate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: analyst.cookie },
        payload: { name: 'Unauthorized Rename' },
      });
      assert.equal(analystUpdate.statusCode, 403);

      const makePrivate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { visibility: 'private' },
      });
      assert.equal(makePrivate.statusCode, 200);

      const privateDirect = await app.inject({
        method: 'GET',
        url: `/api/v1/channels/${organisationSlug}/${channelSlug}`,
      });
      assert.equal(privateDirect.statusCode, 404);

      const archived = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'archived' },
      });
      assert.equal(archived.statusCode, 200);

      const restoreArchived = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'active' },
      });
      assert.equal(restoreArchived.statusCode, 409);
    } finally {
      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }
      for (const userId of userIds) {
        await database.db.delete(users).where(eq(users.id, userId));
      }
      await app.close();
      await database.close();
    }
  },
);
