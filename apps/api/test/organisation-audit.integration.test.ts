import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { asc, eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { organisations, users } from '../src/db/schema.js';
import { organisationAuditEvents } from '../src/modules/organisations/organisation-audit.schema.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'organisation create and update write durable actor-scoped audit events',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const app = buildApp({ database });
    const userIds: string[] = [];
    let organisationId: string | undefined;

    async function register(label: string) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `${label}-${suffix}@example.test`,
          displayName: `${label} User`,
          password: 'A-strong-test-password-123!',
        },
      });
      assert.equal(response.statusCode, 201);
      const userId = response.json().user.id as string;
      userIds.push(userId);
      return { userId, cookie: responseCookie(response) };
    }

    try {
      const owner = await register('AuditOwner');
      const outsider = await register('AuditOutsider');
      const slug = `audit-${suffix}`;

      const creation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: { name: 'Audit Workspace', slug },
      });
      assert.equal(creation.statusCode, 201);
      organisationId = creation.json().organisation.id as string;

      const forbiddenUpdate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}`,
        headers: { cookie: outsider.cookie },
        payload: { name: 'Outsider Change' },
      });
      assert.equal(forbiddenUpdate.statusCode, 404);

      const update = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}`,
        headers: { cookie: owner.cookie },
        payload: { name: 'Audit Workspace Updated' },
      });
      assert.equal(update.statusCode, 200);

      const events = await database.db
        .select()
        .from(organisationAuditEvents)
        .where(eq(organisationAuditEvents.organisationId, organisationId))
        .orderBy(asc(organisationAuditEvents.createdAt), asc(organisationAuditEvents.id));

      assert.equal(events.length, 2);
      assert.equal(events[0]?.action, 'organisation.created');
      assert.equal(events[0]?.actorUserId, owner.userId);
      assert.deepEqual(events[0]?.details, { slug });
      assert.equal(events[1]?.action, 'organisation.updated');
      assert.equal(events[1]?.actorUserId, owner.userId);
      assert.deepEqual(events[1]?.details, { changedFields: ['name'] });
      assert.equal(events.some((event) => event.actorUserId === outsider.userId), false);
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
