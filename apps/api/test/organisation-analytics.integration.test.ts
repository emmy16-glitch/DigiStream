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
  'organisation analytics reports persisted counts without widening tenant access or inventing media metrics',
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
        payload: {
          email: `${label}-${suffix}@example.test`,
          displayName: label,
          password,
        },
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
      const id = response.json().organisation.id as string;
      organisationIds.push(id);
      return id;
    }

    try {
      const ownerCookie = await register('analytics-owner');
      const listenerCookie = await register('analytics-listener');
      const outsiderCookie = await register('analytics-outsider');
      const organisationId = await createOrganisation(ownerCookie, 'analytics');
      await createOrganisation(outsiderCookie, 'outsider');

      const channel = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: ownerCookie },
        payload: {
          name: 'Measured Channel',
          slug: `measured-${suffix}`,
          visibility: 'public',
        },
      });
      assert.equal(channel.statusCode, 201);
      const channelId = channel.json().channel.id as string;

      const broadcast = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
        headers: { cookie: ownerCookie },
        payload: { title: 'Measured Broadcast', slug: `measured-show-${suffix}` },
      });
      assert.equal(broadcast.statusCode, 201);
      const broadcastId = broadcast.json().broadcast.id as string;

      const schedule = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/schedule`,
        headers: {
          cookie: ownerCookie,
          'idempotency-key': `analytics-schedule-${suffix}`,
        },
        payload: {
          expectedVersion: 0,
          scheduledStartAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        },
      });
      assert.equal(schedule.statusCode, 200);

      const save = await app.inject({
        method: 'PUT',
        url: `/api/v1/me/saved-broadcasts/${broadcastId}`,
        headers: { cookie: listenerCookie },
      });
      assert.equal(save.statusCode, 200);

      const history = await app.inject({
        method: 'PUT',
        url: `/api/v1/me/listening-history/${broadcastId}`,
        headers: { cookie: listenerCookie },
      });
      assert.equal(history.statusCode, 200);

      const unauthenticated = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/analytics`,
      });
      assert.equal(unauthenticated.statusCode, 401);

      const crossTenant = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/analytics`,
        headers: { cookie: outsiderCookie },
      });
      assert.equal(crossTenant.statusCode, 404);
      assert.equal(crossTenant.json().error.code, 'ORGANISATION_NOT_FOUND');

      const analyticsResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/analytics`,
        headers: { cookie: ownerCookie },
      });
      assert.equal(analyticsResponse.statusCode, 200);
      const analytics = analyticsResponse.json().analytics;
      assert.equal(analytics.organisationId, organisationId);
      assert.equal(analytics.channels.total, 1);
      assert.equal(analytics.channels.byStatus.draft, 1);
      assert.equal(analytics.broadcasts.total, 1);
      assert.equal(analytics.broadcasts.byStatus.scheduled, 1);
      assert.equal(analytics.audience.registeredListeners, 1);
      assert.equal(analytics.audience.listeningHistoryEntries, 1);
      assert.equal(analytics.audience.savedBroadcasts, 1);
      assert.equal(analytics.audience.usersWhoSaved, 1);
      assert.equal(analytics.coverage.anonymousListenerReach, 'not_collected');
      assert.equal(analytics.coverage.concurrentAudience, 'not_collected');
      assert.equal(analytics.coverage.listeningDuration, 'not_collected');
      assert.equal(analytics.coverage.streamQuality, 'not_collected');
      assert.match(analytics.definitions.listeningHistoryEntries, /not play count or listening duration/i);
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
