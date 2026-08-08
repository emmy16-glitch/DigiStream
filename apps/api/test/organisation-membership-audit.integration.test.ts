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
  'organisation membership mutations write atomic actor-scoped audit events without secret details',
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
      const email = `${label.toLowerCase()}-${suffix}@example.test`;
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          displayName: `${label} User`,
          password: 'A-strong-test-password-123!',
        },
      });
      assert.equal(response.statusCode, 201);
      const userId = response.json().user.id as string;
      userIds.push(userId);
      return { userId, email, cookie: responseCookie(response) };
    }

    try {
      const owner = await register('AuditOwner');
      const administrator = await register('AuditAdmin');
      const broadcaster = await register('AuditBroadcaster');
      const outsider = await register('AuditOutsider');

      const creation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Membership Audit Workspace',
          slug: `membership-audit-${suffix}`,
        },
      });
      assert.equal(creation.statusCode, 201);
      organisationId = creation.json().organisation.id as string;

      const adminInvitation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/invitations`,
        headers: { cookie: owner.cookie },
        payload: { email: administrator.email, role: 'admin' },
      });
      assert.equal(adminInvitation.statusCode, 201);
      const adminInvitationId = adminInvitation.json().invitation.id as string;
      const adminToken = adminInvitation.json().invitation.acceptanceToken as string;

      const mismatchedAcceptance = await app.inject({
        method: 'POST',
        url: `/api/v1/organisation-invitations/${adminToken}/accept`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(mismatchedAcceptance.statusCode, 403);

      const acceptedAdmin = await app.inject({
        method: 'POST',
        url: `/api/v1/organisation-invitations/${adminToken}/accept`,
        headers: { cookie: administrator.cookie },
      });
      assert.equal(acceptedAdmin.statusCode, 200);

      const revokedInvitation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/invitations`,
        headers: { cookie: administrator.cookie },
        payload: { email: outsider.email, role: 'analyst' },
      });
      assert.equal(revokedInvitation.statusCode, 201);
      const revokedInvitationId = revokedInvitation.json().invitation.id as string;
      const revokedToken = revokedInvitation.json().invitation.acceptanceToken as string;

      const revoke = await app.inject({
        method: 'DELETE',
        url: `/api/v1/organisations/${organisationId}/invitations/${revokedInvitationId}`,
        headers: { cookie: administrator.cookie },
      });
      assert.equal(revoke.statusCode, 204);

      const revokedAcceptance = await app.inject({
        method: 'POST',
        url: `/api/v1/organisation-invitations/${revokedToken}/accept`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(revokedAcceptance.statusCode, 404);

      const broadcasterInvitation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/invitations`,
        headers: { cookie: administrator.cookie },
        payload: { email: broadcaster.email, role: 'broadcaster' },
      });
      assert.equal(broadcasterInvitation.statusCode, 201);
      const broadcasterInvitationId = broadcasterInvitation.json().invitation.id as string;
      const broadcasterToken = broadcasterInvitation.json().invitation.acceptanceToken as string;

      const acceptedBroadcaster = await app.inject({
        method: 'POST',
        url: `/api/v1/organisation-invitations/${broadcasterToken}/accept`,
        headers: { cookie: broadcaster.cookie },
      });
      assert.equal(acceptedBroadcaster.statusCode, 200);

      const forbiddenPromotion = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/members/${broadcaster.userId}`,
        headers: { cookie: administrator.cookie },
        payload: { role: 'admin' },
      });
      assert.equal(forbiddenPromotion.statusCode, 403);

      const roleChange = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/members/${broadcaster.userId}`,
        headers: { cookie: owner.cookie },
        payload: { role: 'moderator' },
      });
      assert.equal(roleChange.statusCode, 200);
      assert.equal(roleChange.json().member.role, 'moderator');

      const removal = await app.inject({
        method: 'DELETE',
        url: `/api/v1/organisations/${organisationId}/members/${broadcaster.userId}`,
        headers: { cookie: administrator.cookie },
      });
      assert.equal(removal.statusCode, 204);

      const events = await database.db
        .select()
        .from(organisationAuditEvents)
        .where(eq(organisationAuditEvents.organisationId, organisationId))
        .orderBy(asc(organisationAuditEvents.createdAt), asc(organisationAuditEvents.id));

      const membershipEvents = events.filter((event) =>
        event.action.startsWith('organisation.invitation.') ||
        event.action.startsWith('organisation.member.'),
      );

      assert.deepEqual(
        membershipEvents.map((event) => event.action),
        [
          'organisation.invitation.created',
          'organisation.invitation.accepted',
          'organisation.invitation.created',
          'organisation.invitation.revoked',
          'organisation.invitation.created',
          'organisation.invitation.accepted',
          'organisation.member.role_changed',
          'organisation.member.removed',
        ],
      );

      assert.deepEqual(membershipEvents[0]?.details, {
        invitationId: adminInvitationId,
        role: 'admin',
      });
      assert.equal(membershipEvents[0]?.actorUserId, owner.userId);
      assert.deepEqual(membershipEvents[1]?.details, {
        invitationId: adminInvitationId,
        userId: administrator.userId,
        role: 'admin',
      });
      assert.equal(membershipEvents[1]?.actorUserId, administrator.userId);
      assert.deepEqual(membershipEvents[3]?.details, {
        invitationId: revokedInvitationId,
      });
      assert.equal(membershipEvents[3]?.actorUserId, administrator.userId);
      assert.deepEqual(membershipEvents[5]?.details, {
        invitationId: broadcasterInvitationId,
        userId: broadcaster.userId,
        role: 'broadcaster',
      });
      assert.deepEqual(membershipEvents[6]?.details, {
        targetUserId: broadcaster.userId,
        previousRole: 'broadcaster',
        nextRole: 'moderator',
      });
      assert.equal(membershipEvents[6]?.actorUserId, owner.userId);
      assert.deepEqual(membershipEvents[7]?.details, {
        targetUserId: broadcaster.userId,
        previousRole: 'moderator',
      });
      assert.equal(membershipEvents[7]?.actorUserId, administrator.userId);

      const serializedDetails = JSON.stringify(membershipEvents.map((event) => event.details));
      assert.equal(serializedDetails.includes(adminToken), false);
      assert.equal(serializedDetails.includes(revokedToken), false);
      assert.equal(serializedDetails.includes(broadcasterToken), false);
      assert.equal(serializedDetails.includes(owner.email), false);
      assert.equal(serializedDetails.includes(administrator.email), false);
      assert.equal(serializedDetails.includes(broadcaster.email), false);
      assert.equal(serializedDetails.includes(outsider.email), false);
      assert.equal(
        membershipEvents.some((event) => event.actorUserId === outsider.userId),
        false,
      );
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
