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
  'listener library is authenticated, idempotent and visibility-safe',
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
      const owner = await register('library-owner');
      const listener = await register('library-listener');
      const organisationSlug = `library-org-${suffix}`;
      const channelSlug = `library-channel-${suffix}`;

      const organisation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: { name: 'Listener Library Network', slug: organisationSlug },
      });
      assert.equal(organisation.statusCode, 201);
      organisationId = organisation.json().organisation.id as string;

      const channel = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: owner.cookie },
        payload: { name: 'Library Channel', slug: channelSlug, visibility: 'public' },
      });
      assert.equal(channel.statusCode, 201);
      const channelId = channel.json().channel.id as string;

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

      const creation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
        headers: { cookie: owner.cookie },
        payload: { title: 'Saved Show', slug: `saved-show-${suffix}` },
      });
      assert.equal(creation.statusCode, 201);
      const broadcastId = creation.json().broadcast.id as string;

      const scheduledStartAt = new Date(Date.now() + 15 * 60_000).toISOString();
      const schedule = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/schedule`,
        headers: { cookie: owner.cookie, 'idempotency-key': `library-schedule-${suffix}` },
        payload: { expectedVersion: 0, scheduledStartAt },
      });
      assert.equal(schedule.statusCode, 200);

      const unauthenticated = await app.inject({
        method: 'PUT',
        url: `/api/v1/me/saved-broadcasts/${broadcastId}`,
      });
      assert.equal(unauthenticated.statusCode, 401);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const save = await app.inject({
          method: 'PUT',
          url: `/api/v1/me/saved-broadcasts/${broadcastId}`,
          headers: { cookie: listener.cookie },
        });
        assert.equal(save.statusCode, 200);
        assert.equal(save.json().saved, true);
      }
      const savedRows = await database.pool.query<{ count: string }>(
        'select count(*)::text as count from saved_broadcasts where broadcast_id = $1',
        [broadcastId],
      );
      assert.equal(savedRows.rows[0]?.count, '1');

      const historyWrite = await app.inject({
        method: 'PUT',
        url: `/api/v1/me/listening-history/${broadcastId}`,
        headers: { cookie: listener.cookie },
      });
      assert.equal(historyWrite.statusCode, 200);

      const saved = await app.inject({ method: 'GET', url: '/api/v1/me/saved-broadcasts', headers: { cookie: listener.cookie } });
      assert.equal(saved.statusCode, 200);
      assert.equal(saved.json().broadcasts.length, 1);
      assert.equal(saved.json().broadcasts[0].id, broadcastId);

      const history = await app.inject({ method: 'GET', url: '/api/v1/me/listening-history', headers: { cookie: listener.cookie } });
      assert.equal(history.statusCode, 200);
      assert.equal(history.json().broadcasts.length, 1);
      assert.equal(history.json().broadcasts[0].id, broadcastId);

      const makePrivate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie: owner.cookie },
        payload: { visibility: 'private' },
      });
      assert.equal(makePrivate.statusCode, 200);

      const hiddenSaved = await app.inject({ method: 'GET', url: '/api/v1/me/saved-broadcasts', headers: { cookie: listener.cookie } });
      assert.equal(hiddenSaved.json().broadcasts.length, 0);
      const hiddenHistory = await app.inject({ method: 'GET', url: '/api/v1/me/listening-history', headers: { cookie: listener.cookie } });
      assert.equal(hiddenHistory.json().broadcasts.length, 0);

      const privateWrite = await app.inject({
        method: 'PUT',
        url: `/api/v1/me/listening-history/${broadcastId}`,
        headers: { cookie: listener.cookie },
      });
      assert.equal(privateWrite.statusCode, 404);
      assert.equal(privateWrite.json().error.code, 'BROADCAST_NOT_FOUND');

      const clear = await app.inject({ method: 'DELETE', url: '/api/v1/me/listening-history', headers: { cookie: listener.cookie } });
      assert.equal(clear.statusCode, 204);
      await app.inject({ method: 'DELETE', url: `/api/v1/me/saved-broadcasts/${broadcastId}`, headers: { cookie: listener.cookie } });
    } finally {
      if (organisationId) await database.pool.query('delete from organisations where id = $1', [organisationId]);
      for (const userId of userIds) await database.pool.query('delete from users where id = $1', [userId]);
      await app.close();
      await database.close();
    }
  },
);
