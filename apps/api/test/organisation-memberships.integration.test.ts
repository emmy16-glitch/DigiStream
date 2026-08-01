import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  organisations,
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
  'organisation invitations and role changes preserve tenant and owner safety',
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
      const email = `${label.toLowerCase()}-${suffix}@example.test`;
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email,
          displayName: `${label} User`,
          password,
        },
      });

      assert.equal(response.statusCode, 201);
      const userId = response.json().user.id as string;
      userIds.push(userId);
      return { userId, email, cookie: responseCookie(response) };
    }

    try {
      const owner = await register('Owner');
      const administrator = await register('Administrator');
      const broadcaster = await register('Broadcaster');
      const outsider = await register('Outsider');

      const creation = await app.inject({
        method: 'POST',
        url: '/api/v1/organisations',
        headers: { cookie: owner.cookie },
        payload: {
          name: 'Membership Test Network',
          slug: `membership-${suffix}`,
        },
      });
      assert.equal(creation.statusCode, 201);
      organisationId = creation.json().organisation.id as string;

      const adminInvitation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/invitations`,
        headers: { cookie: owner.cookie },
        payload: { email: administrator.email.toUpperCase(), role: 'admin' },
      });
      assert.equal(adminInvitation.statusCode, 201);
      const adminToken = adminInvitation.json().invitation
        .acceptanceToken as string;
      assert.ok(adminToken);

      const outsiderAcceptance = await app.inject({
        method: 'POST',
        url: `/api/v1/organisation-invitations/${adminToken}/accept`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(outsiderAcceptance.statusCode, 403);
      assert.equal(
        outsiderAcceptance.json().error.code,
        'INVITATION_EMAIL_MISMATCH',
      );

      const acceptedAdmin = await app.inject({
        method: 'POST',
        url: `/api/v1/organisation-invitations/${adminToken}/accept`,
        headers: { cookie: administrator.cookie },
      });
      assert.equal(acceptedAdmin.statusCode, 200);
      assert.equal(acceptedAdmin.json().membership.role, 'admin');

      const pendingAfterAcceptance = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/invitations`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(pendingAfterAcceptance.statusCode, 200);
      assert.equal(pendingAfterAcceptance.json().invitations.length, 0);

      const adminCannotInviteAdmin = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/invitations`,
        headers: { cookie: administrator.cookie },
        payload: { email: outsider.email, role: 'admin' },
      });
      assert.equal(adminCannotInviteAdmin.statusCode, 403);

      const broadcasterInvitation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/invitations`,
        headers: { cookie: administrator.cookie },
        payload: { email: broadcaster.email, role: 'broadcaster' },
      });
      assert.equal(broadcasterInvitation.statusCode, 201);
      const broadcasterToken = broadcasterInvitation.json().invitation
        .acceptanceToken as string;

      const acceptedBroadcaster = await app.inject({
        method: 'POST',
        url: `/api/v1/organisation-invitations/${broadcasterToken}/accept`,
        headers: { cookie: broadcaster.cookie },
      });
      assert.equal(acceptedBroadcaster.statusCode, 200);
      assert.equal(acceptedBroadcaster.json().membership.role, 'broadcaster');

      const outsiderInvitation = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/invitations`,
        headers: { cookie: owner.cookie },
        payload: { email: outsider.email, role: 'analyst' },
      });
      assert.equal(outsiderInvitation.statusCode, 201);
      const outsiderInvitationId = outsiderInvitation.json().invitation.id as string;
      const outsiderToken = outsiderInvitation.json().invitation
        .acceptanceToken as string;

      const duplicatePending = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/invitations`,
        headers: { cookie: owner.cookie },
        payload: { email: outsider.email, role: 'moderator' },
      });
      assert.equal(duplicatePending.statusCode, 409);

      const revoke = await app.inject({
        method: 'DELETE',
        url: `/api/v1/organisations/${organisationId}/invitations/${outsiderInvitationId}`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(revoke.statusCode, 204);

      const revokedAcceptance = await app.inject({
        method: 'POST',
        url: `/api/v1/organisation-invitations/${outsiderToken}/accept`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(revokedAcceptance.statusCode, 404);

      const memberList = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/members`,
        headers: { cookie: broadcaster.cookie },
      });
      assert.equal(memberList.statusCode, 200);
      assert.equal(memberList.json().members.length, 3);
      assert.equal(
        memberList.json().members.some(
          (member: { email: string }) => member.email === owner.email,
        ),
        true,
      );

      const hiddenFromOutsider = await app.inject({
        method: 'GET',
        url: `/api/v1/organisations/${organisationId}/members`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(hiddenFromOutsider.statusCode, 404);
      assert.equal(hiddenFromOutsider.json().error.code, 'ORGANISATION_NOT_FOUND');

      const adminCannotPromote = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/members/${broadcaster.userId}`,
        headers: { cookie: administrator.cookie },
        payload: { role: 'admin' },
      });
      assert.equal(adminCannotPromote.statusCode, 403);

      const finalOwnerDemotion = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/members/${owner.userId}`,
        headers: { cookie: owner.cookie },
        payload: { role: 'admin' },
      });
      assert.equal(finalOwnerDemotion.statusCode, 409);
      assert.equal(finalOwnerDemotion.json().error.code, 'FINAL_OWNER_REQUIRED');

      const promoteSecondOwner = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/members/${administrator.userId}`,
        headers: { cookie: owner.cookie },
        payload: { role: 'owner' },
      });
      assert.equal(promoteSecondOwner.statusCode, 200);
      assert.equal(promoteSecondOwner.json().member.role, 'owner');

      const demoteOriginalOwner = await app.inject({
        method: 'PATCH',
        url: `/api/v1/organisations/${organisationId}/members/${owner.userId}`,
        headers: { cookie: owner.cookie },
        payload: { role: 'admin' },
      });
      assert.equal(demoteOriginalOwner.statusCode, 200);

      const removeBroadcaster = await app.inject({
        method: 'DELETE',
        url: `/api/v1/organisations/${organisationId}/members/${broadcaster.userId}`,
        headers: { cookie: administrator.cookie },
      });
      assert.equal(removeBroadcaster.statusCode, 204);

      const administratorLeaves = await app.inject({
        method: 'DELETE',
        url: `/api/v1/organisations/${organisationId}/members/${owner.userId}`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(administratorLeaves.statusCode, 204);

      const finalOwnerRemoval = await app.inject({
        method: 'DELETE',
        url: `/api/v1/organisations/${organisationId}/members/${administrator.userId}`,
        headers: { cookie: administrator.cookie },
      });
      assert.equal(finalOwnerRemoval.statusCode, 409);
      assert.equal(finalOwnerRemoval.json().error.code, 'FINAL_OWNER_REQUIRED');
    } finally {
      try {
        if (organisationId) {
          await database.db
            .delete(organisations)
            .where(eq(organisations.id, organisationId));
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
