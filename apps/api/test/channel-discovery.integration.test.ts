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
  'public channel discovery supports search, filters and stable cursors without leaking private channels',
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

    async function createOrganisation(cookie: string, label: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie },
        payload: { name: `${label} Network`, slug: `${label}-${suffix}` },
      });
      assert.equal(response.statusCode, 201);
      organisationIds.push(response.json().organisation.id as string);
      return response.json().organisation as { id: string; slug: string };
    }

    async function createActiveChannel(
      cookie: string,
      organisationId: string,
      input: { name: string; slug: string; description: string; category: string; visibility?: string },
    ) {
      const created = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie },
        payload: { ...input, visibility: input.visibility ?? 'public' },
      });
      assert.equal(created.statusCode, 201);
      const channelId = created.json().channel.id as string;
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie },
        payload: { status: 'pending_review' },
      });
      const activated = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}`,
        headers: { cookie },
        payload: { status: 'active' },
      });
      assert.equal(activated.statusCode, 200);
      return channelId;
    }

    try {
      const ownerCookie = await register('discovery-owner');
      const otherCookie = await register('discovery-other');
      const firstOrg = await createOrganisation(ownerCookie, 'search-a');
      const secondOrg = await createOrganisation(otherCookie, 'search-b');

      const firstId = await createActiveChannel(ownerCookie, firstOrg.id, {
        name: 'Morning Community Voice',
        slug: `morning-${suffix}`,
        description: 'Local interviews and community stories',
        category: 'community',
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const secondId = await createActiveChannel(ownerCookie, firstOrg.id, {
        name: 'Evening Technology Brief',
        slug: `technology-${suffix}`,
        description: 'Software and technology news',
        category: 'technology',
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await createActiveChannel(otherCookie, secondOrg.id, {
        name: 'Community Roundtable',
        slug: `roundtable-${suffix}`,
        description: 'Neighbourhood community discussion',
        category: 'community',
      });
      await createActiveChannel(ownerCookie, firstOrg.id, {
        name: 'Private Community Notes',
        slug: `private-${suffix}`,
        description: 'community private material',
        category: 'community',
        visibility: 'private',
      });

      const search = await app.inject({ method: 'GET', url: '/api/v1/channels?q=technology' });
      assert.equal(search.statusCode, 200);
      assert.equal(search.json().channels.length, 1);
      assert.equal(search.json().channels[0].id, secondId);

      const filtered = await app.inject({
        method: 'GET',
        url: `/api/v1/channels?category=community&organisation=${firstOrg.slug}`,
      });
      assert.equal(filtered.statusCode, 200);
      assert.equal(filtered.json().channels.length, 1);
      assert.equal(filtered.json().channels[0].id, firstId);

      const pageOne = await app.inject({ method: 'GET', url: '/api/v1/channels?limit=2' });
      assert.equal(pageOne.statusCode, 200);
      assert.equal(pageOne.json().channels.length, 2);
      assert.equal(typeof pageOne.json().nextCursor, 'string');
      const pageOneIds = new Set(pageOne.json().channels.map((channel: { id: string }) => channel.id));

      const pageTwo = await app.inject({
        method: 'GET',
        url: `/api/v1/channels?limit=2&cursor=${encodeURIComponent(pageOne.json().nextCursor)}`,
      });
      assert.equal(pageTwo.statusCode, 200);
      for (const channel of pageTwo.json().channels as Array<{ id: string }>) {
        assert.equal(pageOneIds.has(channel.id), false);
      }

      const invalidCursor = await app.inject({ method: 'GET', url: '/api/v1/channels?cursor=not-a-cursor' });
      assert.equal(invalidCursor.statusCode, 400);
      assert.equal(invalidCursor.json().error.code, 'INVALID_CURSOR');

      const tooShortSearch = await app.inject({ method: 'GET', url: '/api/v1/channels?q=x' });
      assert.equal(tooShortSearch.statusCode, 400);
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
