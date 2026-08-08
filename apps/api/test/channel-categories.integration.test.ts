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
  'public category catalogue counts only active public non-deleted channels',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const userIds: string[] = [];
    const organisationIds: string[] = [];

    async function register(label: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: `${label}-${suffix}@example.test`, displayName: label, password },
      });
      assert.equal(response.statusCode, 201);
      userIds.push(response.json().user.id as string);
      return responseCookie(response);
    }

    async function createOrganisation(cookie: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie },
        payload: { name: `Categories ${suffix}`, slug: `categories-${suffix}` },
      });
      assert.equal(response.statusCode, 201);
      const id = response.json().organisation.id as string;
      organisationIds.push(id);
      return id;
    }

    async function createChannel(
      cookie: string,
      organisationId: string,
      label: string,
      category: string,
      visibility = 'public',
      activate = true,
    ) {
      const created = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie },
        payload: {
          name: `${label} ${suffix}`,
          slug: `${label}-${suffix}`,
          category,
          visibility,
        },
      });
      assert.equal(created.statusCode, 201);
      const id = created.json().channel.id as string;
      if (!activate) return id;
      const pending = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${id}`,
        headers: { cookie },
        payload: { status: 'pending_review' },
      });
      assert.equal(pending.statusCode, 200);
      const active = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${id}`,
        headers: { cookie },
        payload: { status: 'active' },
      });
      assert.equal(active.statusCode, 200);
      return id;
    }

    try {
      const cookie = await register('category-owner');
      const organisationId = await createOrganisation(cookie);
      const visibleCategory = `public-${suffix}`;
      const secondCategory = `second-${suffix}`;
      const privateOnlyCategory = `private-${suffix}`;
      const draftOnlyCategory = `draft-${suffix}`;

      await createChannel(cookie, organisationId, 'public-a', visibleCategory);
      await createChannel(cookie, organisationId, 'public-b', visibleCategory);
      await createChannel(cookie, organisationId, 'public-c', secondCategory);
      await createChannel(cookie, organisationId, 'private-a', privateOnlyCategory, 'private');
      await createChannel(cookie, organisationId, 'draft-a', draftOnlyCategory, 'public', false);

      const response = await app.inject({ method: 'GET', url: '/api/v1/channel-categories' });
      assert.equal(response.statusCode, 200);
      assert.match(String(response.headers['cache-control']), /max-age=60/);

      const categories = response.json().categories as Array<{ slug: string; channelCount: number }>;
      const visible = categories.find((category) => category.slug === visibleCategory);
      const second = categories.find((category) => category.slug === secondCategory);
      assert.deepEqual(visible, { slug: visibleCategory, channelCount: 2 });
      assert.deepEqual(second, { slug: secondCategory, channelCount: 1 });
      assert.equal(categories.some((category) => category.slug === privateOnlyCategory), false);
      assert.equal(categories.some((category) => category.slug === draftOnlyCategory), false);
      assert.ok(categories.indexOf(visible!) < categories.indexOf(second!));
    } finally {
      for (const organisationId of organisationIds) {
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
