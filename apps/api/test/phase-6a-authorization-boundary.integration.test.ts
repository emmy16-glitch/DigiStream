import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq, inArray } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  organisationMemberships,
  organisations,
  users,
} from '../src/db/schema.js';
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
import { channelRecords } from '../src/modules/channels/channels.schema.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'role-aware listener actions remain independently enforced by the API',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const app = buildApp({ database });
    const userIds: string[] = [];
    let organisationId = '';

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
      const analyst = await register('Analyst');
      const outsider = await register('Outsider');

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Authorization Boundary Network',
          slug: `authorization-boundary-${suffix}`,
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(organisation);
      organisationId = organisation.id;

      await database.db.insert(organisationMemberships).values([
        { organisationId, userId: owner.userId, role: 'owner' },
        {
          organisationId,
          userId: moderator.userId,
          role: 'moderator',
          invitedByUserId: owner.userId,
        },
        {
          organisationId,
          userId: analyst.userId,
          role: 'analyst',
          invitedByUserId: owner.userId,
        },
      ]);

      const [channel] = await database.db
        .insert(channelRecords)
        .values({
          organisationId,
          name: 'Authorization Channel',
          slug: `authorization-channel-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(channel);

      const [broadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: channel.id,
          createdByUserId: owner.userId,
          title: 'Authorization Boundary Broadcast',
          slug: `authorization-broadcast-${suffix}`,
          status: 'scheduled',
          scheduledStartAt: new Date(Date.now() + 3_600_000),
          contributionRoomName: `authorization-room-${suffix}`,
          deliveryStreamName: `authorization-delivery-${suffix}`,
        })
        .returning();
      assert.ok(broadcast);

      const creatorBase = `/api/v1/organisations/${organisationId}/broadcasts/${broadcast.id}`;
      const publicBase = `/api/v1/broadcasts/${organisation.slug}/${channel.slug}/${broadcast.slug}`;

      const unauthenticatedCreatorAction = await app.inject({
        method: 'GET',
        url: `${creatorBase}/call-ins`,
      });
      assert.equal(unauthenticatedCreatorAction.statusCode, 401);

      const anonymousCallIn = await app.inject({
        method: 'POST',
        url: `${publicBase}/call-ins`,
        payload: {
          displayName: 'Public Listener',
          email: `listener-${suffix}@example.test`,
          message: 'I would like to contribute.',
        },
      });
      assert.equal(anonymousCallIn.statusCode, 200);

      const ownerInvitation = await app.inject({
        method: 'POST',
        url: `${creatorBase}/guest-invitations`,
        headers: { cookie: owner.cookie },
        payload: { displayName: 'Approved Guest', ttlSeconds: 900 },
      });
      assert.equal(ownerInvitation.statusCode, 200);
      assert.equal(typeof ownerInvitation.json().invitation.acceptanceToken, 'string');

      const moderatorCannotCreateInvitation = await app.inject({
        method: 'POST',
        url: `${creatorBase}/guest-invitations`,
        headers: { cookie: moderator.cookie },
        payload: { displayName: 'Unauthorized Guest' },
      });
      assert.equal(moderatorCannotCreateInvitation.statusCode, 403);
      assert.equal(moderatorCannotCreateInvitation.json().error.code, 'BACKSTAGE_FORBIDDEN');

      const moderatorCanOpenCallInDesk = await app.inject({
        method: 'GET',
        url: `${creatorBase}/call-ins`,
        headers: { cookie: moderator.cookie },
      });
      assert.equal(moderatorCanOpenCallInDesk.statusCode, 200);
      assert.equal(moderatorCanOpenCallInDesk.json().callIns.length, 1);

      const analystCannotOpenCallInDesk = await app.inject({
        method: 'GET',
        url: `${creatorBase}/call-ins`,
        headers: { cookie: analyst.cookie },
      });
      assert.equal(analystCannotOpenCallInDesk.statusCode, 403);
      assert.equal(analystCannotOpenCallInDesk.json().error.code, 'BACKSTAGE_FORBIDDEN');

      const outsiderCannotDiscoverCallInDesk = await app.inject({
        method: 'GET',
        url: `${creatorBase}/call-ins`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(outsiderCannotDiscoverCallInDesk.statusCode, 404);
      assert.equal(outsiderCannotDiscoverCallInDesk.json().error.code, 'BROADCAST_NOT_FOUND');
    } finally {
      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }
      if (userIds.length) {
        await database.db.delete(users).where(inArray(users.id, userIds));
      }
      await app.close();
    }
  },
);
