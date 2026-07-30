import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  broadcasts,
  organisationMemberships,
  organisations,
  users,
} from '../src/db/schema.js';
import { channelRecords } from '../src/modules/channels/channels.schema.js';
import type { ContributionProvider } from '../src/modules/media/contribution-provider.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'LiveKit contribution credentials enforce tenant, role and broadcast state',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const roomRequests: string[] = [];
    const provider: ContributionProvider = {
      provider: 'livekit',
      clientUrl: 'wss://livekit.example.test',
      async ensureRoom(request) {
        roomRequests.push(request.roomName);
      },
      async issueCredential(request) {
        const canPublish = request.participantRole !== 'monitor';
        return {
          provider: 'livekit',
          url: 'wss://livekit.example.test',
          token: `token-${request.participantRole}-${suffix}`,
          roomName: request.roomName,
          participantIdentity: `${request.participantRole}-${request.userId}`,
          participantRole: request.participantRole,
          expiresAt: new Date(Date.now() + 300_000),
          permissions: {
            canPublish,
            canSubscribe: true,
            canPublishData: false,
            canPublishSources: canPublish ? ['microphone'] : [],
          },
        };
      },
    };
    const app = buildApp({ database, contributionProvider: provider });
    const userIds: string[] = [];
    let organisationId: string | undefined;

    async function register(
      label: string,
    ): Promise<{ userId: string; cookie: string }> {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `${label}-${suffix}@example.test`,
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
          name: 'Contribution Network',
          slug: `contribution-network-${suffix}`,
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
          name: 'Contribution Channel',
          slug: `contribution-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(channel);

      const [broadcast] = await database.db
        .insert(broadcasts)
        .values({
          organisationId,
          channelId: channel.id,
          createdByUserId: owner.userId,
          title: 'Contribution Test',
          slug: `contribution-test-${suffix}`,
          status: 'scheduled',
          scheduledStartAt: new Date(Date.now() + 3_600_000),
          contributionRoomName: `broadcast-${suffix}`,
          deliveryStreamName: `delivery-${suffix}`,
        })
        .returning();
      assert.ok(broadcast);

      const endpoint = `/api/v1/organisations/${organisationId}/broadcasts/${broadcast.id}/contribution-token`;

      const unauthenticated = await app.inject({
        method: 'POST',
        url: endpoint,
        payload: { participantRole: 'host' },
      });
      assert.equal(unauthenticated.statusCode, 401);

      const hiddenFromOutsider = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: { cookie: outsider.cookie },
        payload: { participantRole: 'monitor' },
      });
      assert.equal(hiddenFromOutsider.statusCode, 404);

      const analystDenied = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: { cookie: analyst.cookie },
        payload: { participantRole: 'monitor' },
      });
      assert.equal(analystDenied.statusCode, 403);

      const moderatorHostDenied = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: { cookie: moderator.cookie },
        payload: { participantRole: 'host' },
      });
      assert.equal(moderatorHostDenied.statusCode, 403);

      const monitor = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: { cookie: moderator.cookie },
        payload: { participantRole: 'monitor' },
      });
      assert.equal(monitor.statusCode, 200);
      assert.equal(monitor.headers['cache-control'], 'no-store');
      assert.equal(monitor.json().credential.participantRole, 'monitor');
      assert.equal(monitor.json().credential.permissions.canPublish, false);

      const host = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: { cookie: owner.cookie },
        payload: { participantRole: 'host' },
      });
      assert.equal(host.statusCode, 200);
      assert.equal(host.json().credential.permissions.canPublish, true);
      assert.deepEqual(host.json().credential.permissions.canPublishSources, [
        'microphone',
      ]);
      assert.equal(roomRequests.length, 2);
      assert.equal(roomRequests[0], monitor.json().credential.roomName);
      assert.equal(roomRequests[1], host.json().credential.roomName);
      assert.equal(roomRequests[0], roomRequests[1]);

      await database.db
        .update(broadcasts)
        .set({ status: 'completed', endedAt: new Date() })
        .where(eq(broadcasts.id, broadcast.id));

      const completedDenied = await app.inject({
        method: 'POST',
        url: endpoint,
        headers: { cookie: owner.cookie },
        payload: { participantRole: 'host' },
      });
      assert.equal(completedDenied.statusCode, 409);
      assert.equal(
        completedDenied.json().error.code,
        'BROADCAST_NOT_READY_FOR_CONTRIBUTION',
      );
    } finally {
      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }
      for (const userId of userIds) {
        await database.db.delete(users).where(eq(users.id, userId));
      }
      await app.close();
      await database.close();
    }
  },
);
