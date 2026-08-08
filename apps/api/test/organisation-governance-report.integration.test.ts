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
  'governance report is tenant-safe, role-gated and derived from persisted organisation state',
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
      const userId = response.json().user.id as string;
      userIds.push(userId);
      return { cookie: responseCookie(response), userId };
    }

    async function createOrganisation(cookie: string, label: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie },
        payload: { name: `${label} ${suffix}`, slug: `${label}-${suffix}` },
      });
      assert.equal(response.statusCode, 201);
      const id = response.json().organisation.id as string;
      organisationIds.push(id);
      return id;
    }

    try {
      const owner = await register('governance-owner');
      const member = await register('governance-member');
      const outsider = await register('governance-outsider');
      const organisationId = await createOrganisation(owner.cookie, 'governance');
      const outsiderOrganisationId = await createOrganisation(outsider.cookie, 'other-governance');

      await database.pool.query(
        `insert into organisation_memberships (organisation_id, user_id, role, invited_by_user_id)
         values ($1, $2, 'broadcaster', $3)`,
        [organisationId, member.userId, owner.userId],
      );

      const channel = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/channels`,
        headers: { cookie: owner.cookie },
        payload: {
          name: `Governance channel ${suffix}`,
          slug: `governance-channel-${suffix}`,
          category: `community-${suffix}`,
          visibility: 'private',
        },
      });
      assert.equal(channel.statusCode, 201);

      const unauthenticated = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/reports/governance`,
      });
      assert.equal(unauthenticated.statusCode, 401);

      const outsiderResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/reports/governance`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(outsiderResponse.statusCode, 404);
      assert.equal(outsiderResponse.json().error.code, 'ORGANISATION_NOT_FOUND');

      const insufficientRole = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/reports/governance`,
        headers: { cookie: member.cookie },
      });
      assert.equal(insufficientRole.statusCode, 403);
      assert.equal(insufficientRole.json().error.code, 'GOVERNANCE_REPORT_ACCESS_REQUIRED');

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/reports/governance`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['cache-control'], 'no-store');

      const report = response.json().report as {
        organisationId: string;
        generatedAt: string;
        memberships: { total: number; byRole: Record<string, number> };
        channels: {
          total: number;
          byStatus: Record<string, number>;
          byVisibility: Record<string, number>;
          byCategory: Record<string, number>;
        };
        broadcasts: { total: number };
        governance: { auditEvents: number; chatReports: number };
      };

      assert.equal(report.organisationId, organisationId);
      assert.ok(Number.isFinite(Date.parse(report.generatedAt)));
      assert.equal(report.memberships.total, 2);
      assert.equal(report.memberships.byRole.owner, 1);
      assert.equal(report.memberships.byRole.broadcaster, 1);
      assert.equal(report.channels.total, 1);
      assert.equal(report.channels.byStatus.draft, 1);
      assert.equal(report.channels.byVisibility.private, 1);
      assert.equal(report.channels.byCategory[`community-${suffix}`], 1);
      assert.equal(report.broadcasts.total, 0);
      assert.ok(report.governance.auditEvents >= 1);
      assert.equal(report.governance.chatReports, 0);

      const ownerCannotReadOtherTenant = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${outsiderOrganisationId}/reports/governance`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(ownerCannotReadOtherTenant.statusCode, 404);
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
