import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { organisationMemberships, organisations, users } from '../src/db/schema.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'channel moderation and retained deletion preserve tenant and public truth',
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
      const moderator = await register('Moderator');
      const broadcaster = await register('Broadcaster');
      const stranger = await register('Stranger');

      const organisationCreation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: { name: 'Moderation Network', slug: `moderation-${suffix}` },
      });
      assert.equal(organisationCreation.statusCode, 201);
      organisationId = organisationCreation.json().organisation.id as string;
      const organisationSlug = organisationCreation.json().organisation.slug as string;

      await database.db.insert(organisationMemberships).values([
        {
          organisationId,
          userId: moderator.userId,
          role: 'moderator',
          invitedByUserId: owner.userId,
        },
        {
          organisationId,
          userId: broadcaster.userId,
          role: 'broadcaster',
          invitedByUserId: owner.userId,
        },
      ]);

      const channelSlug = `moderated-${suffix}`;
      const creation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: broadcaster.cookie },
        payload: { name: 'Moderated Channel', slug: channelSlug, visibility: 'public' },
      });
      assert.equal(creation.statusCode, 201);
      const channelId = creation.json().channel.id as string;

      for (const status of ['pending_review', 'active']) {
        const transition = await app.inject({
          method: 'PATCH',
          url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
          headers: { cookie: owner.cookie },
          payload: { status },
        });
        assert.equal(transition.statusCode, 200);
      }

      const unauthenticated = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/moderation`,
        payload: { action: 'suspend', reason: 'Policy review' },
      });
      assert.equal(unauthenticated.statusCode, 401);

      const strangerAttempt = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/moderation`,
        headers: { cookie: stranger.cookie },
        payload: { action: 'suspend', reason: 'Should not be visible' },
      });
      assert.equal(strangerAttempt.statusCode, 404);
      assert.equal(strangerAttempt.json().error.code, 'ORGANISATION_NOT_FOUND');

      const broadcasterAttempt = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/moderation`,
        headers: { cookie: broadcaster.cookie },
        payload: { action: 'suspend', reason: 'Should be blocked' },
      });
      assert.equal(broadcasterAttempt.statusCode, 403);
      assert.equal(broadcasterAttempt.json().error.code, 'CHANNEL_MODERATION_REQUIRED');

      const genericSuspension = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'suspended' },
      });
      assert.equal(genericSuspension.statusCode, 409);
      assert.equal(
        genericSuspension.json().error.code,
        'CHANNEL_MODERATION_ROUTE_REQUIRED',
      );

      const suspended = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/moderation`,
        headers: { cookie: moderator.cookie },
        payload: { action: 'suspend', reason: 'Community safety review' },
      });
      assert.equal(suspended.statusCode, 200);
      assert.equal(suspended.json().channel.status, 'suspended');
      assert.equal(suspended.json().channel.moderatedByUserId, moderator.userId);
      assert.equal(suspended.json().channel.moderationReason, 'Community safety review');

      const genericRestore = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'active' },
      });
      assert.equal(genericRestore.statusCode, 409);
      assert.equal(genericRestore.json().error.code, 'CHANNEL_MODERATION_ROUTE_REQUIRED');

      const duplicateSuspend = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/moderation`,
        headers: { cookie: moderator.cookie },
        payload: { action: 'suspend', reason: 'Duplicate request' },
      });
      assert.equal(duplicateSuspend.statusCode, 200);
      assert.equal(duplicateSuspend.json().channel.moderationReason, 'Community safety review');

      const hiddenWhileSuspended = await app.inject({
        method: 'GET',
        url: `/api/v1/channels/${organisationSlug}/${channelSlug}`,
      });
      assert.equal(hiddenWhileSuspended.statusCode, 404);

      const restored = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/moderation`,
        headers: { cookie: moderator.cookie },
        payload: { action: 'restore', reason: 'Review completed' },
      });
      assert.equal(restored.statusCode, 200);
      assert.equal(restored.json().channel.status, 'active');

      const moderatorDelete = await app.inject({
        method: 'DELETE',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: moderator.cookie },
        payload: { reason: 'Insufficient authority' },
      });
      assert.equal(moderatorDelete.statusCode, 403);
      assert.equal(moderatorDelete.json().error.code, 'CHANNEL_DELETION_REQUIRED');

      const deleted = await app.inject({
        method: 'DELETE',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { reason: 'Owner requested removal' },
      });
      assert.equal(deleted.statusCode, 200);
      assert.equal(deleted.json().channel.status, 'archived');
      assert.ok(deleted.json().channel.deletedAt);
      assert.ok(deleted.json().channel.retentionUntil);
      assert.ok(new Date(deleted.json().channel.retentionUntil).getTime() > Date.now());

      const duplicateDelete = await app.inject({
        method: 'DELETE',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { reason: 'Duplicate owner request' },
      });
      assert.equal(duplicateDelete.statusCode, 200);
      assert.equal(duplicateDelete.json().channel.deletedAt, deleted.json().channel.deletedAt);

      const privateAfterDelete = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(privateAfterDelete.statusCode, 404);
      assert.equal(privateAfterDelete.json().error.code, 'CHANNEL_NOT_FOUND');

      const publicAfterDelete = await app.inject({
        method: 'GET',
        url: `/api/v1/channels/${organisationSlug}/${channelSlug}`,
      });
      assert.equal(publicAfterDelete.statusCode, 404);

      const discoveryAfterDelete = await app.inject({
        method: 'GET',
        url: `/api/v1/channels?q=Moderated`,
      });
      assert.equal(discoveryAfterDelete.statusCode, 200);
      assert.equal(
        discoveryAfterDelete.json().channels.some((channel: { id: string }) => channel.id === channelId),
        false,
      );

      const restoredDeletion = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/restore`,
        headers: { cookie: owner.cookie },
        payload: { reason: 'Owner reversed deletion' },
      });
      assert.equal(restoredDeletion.statusCode, 200);
      assert.equal(restoredDeletion.json().channel.status, 'draft');
      assert.equal(restoredDeletion.json().channel.deletedAt, null);
      assert.equal(restoredDeletion.json().channel.retentionUntil, null);

      const visibleToOrganisationAgain = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(visibleToOrganisationAgain.statusCode, 200);
      assert.equal(visibleToOrganisationAgain.json().channel.status, 'draft');
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
