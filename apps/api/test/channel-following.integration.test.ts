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
  'channel following is authenticated, visibility-safe and idempotent',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const userIds: string[] = [];
    let organisationId = '';

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
      userIds.push(response.json().user.id as string);
      return { cookie: responseCookie(response) };
    }

    try {
      const owner = await register('follow-owner');
      const follower = await register('follow-listener');
      const organisationSlug = `follow-org-${suffix}`;
      const channelSlug = `follow-channel-${suffix}`;

      const organisationResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: { name: 'Follow Test Network', slug: organisationSlug },
      });
      assert.equal(organisationResponse.statusCode, 201);
      organisationId = organisationResponse.json().organisation.id as string;

      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: owner.cookie },
        payload: { name: 'Follow Test Channel', slug: channelSlug, visibility: 'public' },
      });
      assert.equal(createResponse.statusCode, 201);
      const channelId = createResponse.json().channel.id as string;

      await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'pending_review' },
      });
      const active = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { status: 'active' },
      });
      assert.equal(active.statusCode, 200);

      const unauthenticated = await app.inject({
        method: 'PUT',
        url: `/api/v1/channels/${organisationSlug}/${channelSlug}/follow`,
      });
      assert.equal(unauthenticated.statusCode, 401);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const follow = await app.inject({
          method: 'PUT',
          url: `/api/v1/channels/${organisationSlug}/${channelSlug}/follow`,
          headers: { cookie: follower.cookie },
        });
        assert.equal(follow.statusCode, 200);
        assert.equal(follow.json().following, true);
      }

      const rows = await database.pool.query<{ count: string }>(
        'select count(*)::text as count from channel_follows where channel_id = $1',
        [channelId],
      );
      assert.equal(rows.rows[0]?.count, '1');

      const followed = await app.inject({
        method: 'GET',
        url: '/api/v1/me/channel-follows',
        headers: { cookie: follower.cookie },
      });
      assert.equal(followed.statusCode, 200);
      assert.equal(followed.json().channels.length, 1);
      assert.equal(followed.json().channels[0].slug, channelSlug);

      const makePrivate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { visibility: 'private' },
      });
      assert.equal(makePrivate.statusCode, 200);

      const hidden = await app.inject({
        method: 'GET',
        url: '/api/v1/me/channel-follows',
        headers: { cookie: follower.cookie },
      });
      assert.equal(hidden.statusCode, 200);
      assert.equal(hidden.json().channels.length, 0);

      const privateFollow = await app.inject({
        method: 'PUT',
        url: `/api/v1/channels/${organisationSlug}/${channelSlug}/follow`,
        headers: { cookie: follower.cookie },
      });
      assert.equal(privateFollow.statusCode, 404);
      assert.equal(privateFollow.json().error.code, 'CHANNEL_NOT_FOUND');

      const restorePublic = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { visibility: 'public' },
      });
      assert.equal(restorePublic.statusCode, 200);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const unfollow = await app.inject({
          method: 'DELETE',
          url: `/api/v1/channels/${organisationSlug}/${channelSlug}/follow`,
          headers: { cookie: follower.cookie },
        });
        assert.equal(unfollow.statusCode, 200);
        assert.equal(unfollow.json().following, false);
      }

      const empty = await app.inject({
        method: 'GET',
        url: '/api/v1/me/channel-follows',
        headers: { cookie: follower.cookie },
      });
      assert.equal(empty.statusCode, 200);
      assert.equal(empty.json().channels.length, 0);
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
