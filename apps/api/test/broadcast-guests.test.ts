import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
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
import type { BackstageProvider } from '../src/modules/media/backstage-provider.js';
import type { ContributionProvider } from '../src/modules/media/contribution-provider.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'guest invitations, admission, call-ins and backstage controls preserve security',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const muted: Array<{ identity: string; value: boolean }> = [];
    const removed: string[] = [];
    const contributionProvider: ContributionProvider = {
      provider: 'livekit',
      clientUrl: 'wss://livekit.example.test',
      async ensureRoom() {},
      async issueCredential(request) {
        return {
          provider: 'livekit',
          url: 'wss://livekit.example.test',
          token: `guest-token-${suffix}`,
          roomName: request.roomName,
          participantIdentity: `guest-${request.userId}-abc123def456`,
          participantRole: request.participantRole,
          expiresAt: new Date(Date.now() + 300_000),
          permissions: {
            canPublish: true,
            canSubscribe: true,
            canPublishData: false,
            canPublishSources: ['microphone'],
          },
        };
      },
    };
    const backstageProvider: BackstageProvider = {
      async listParticipants() {
        return [
          {
            identity: `guest-external-${suffix}-abc123def456`,
            name: 'Guest Person',
            role: 'guest',
            connected: true,
            publishing: true,
            tracks: [{ sid: 'TR_MIC', source: 'microphone', muted: false }],
          },
        ];
      },
      async muteMicrophone(_room, identity, value) {
        muted.push({ identity, value });
        return {
          identity,
          name: 'Guest Person',
          role: 'guest',
          connected: true,
          publishing: true,
          tracks: [{ sid: 'TR_MIC', source: 'microphone', muted: value }],
        };
      },
      async removeParticipant(_room, identity) {
        removed.push(identity);
      },
    };
    const app = buildApp({ database, contributionProvider, backstageProvider });
    const userIds: string[] = [];
    let organisationId = '';

    async function register(label: string) {
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
          name: 'Guest Network',
          slug: `guest-network-${suffix}`,
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
          name: 'Guest Channel',
          slug: `guest-channel-${suffix}`,
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
          title: 'Guest Broadcast',
          slug: `guest-broadcast-${suffix}`,
          status: 'scheduled',
          scheduledStartAt: new Date(Date.now() + 3_600_000),
          contributionRoomName: `guest-room-${suffix}`,
          deliveryStreamName: `guest-delivery-${suffix}`,
        })
        .returning();
      assert.ok(broadcast);

      const base = `/api/v1/organisations/${organisationId}/broadcasts/${broadcast.id}`;
      const analystDenied = await app.inject({
        method: 'POST',
        url: `${base}/guest-invitations`,
        headers: { cookie: analyst.cookie },
        payload: { displayName: 'External Guest' },
      });
      assert.equal(analystDenied.statusCode, 403);

      const outsiderHidden = await app.inject({
        method: 'GET',
        url: `${base}/guest-invitations`,
        headers: { cookie: outsider.cookie },
      });
      assert.equal(outsiderHidden.statusCode, 404);

      const created = await app.inject({
        method: 'POST',
        url: `${base}/guest-invitations`,
        headers: { cookie: owner.cookie },
        payload: {
          email: `guest-${suffix}@example.test`,
          displayName: 'External Guest',
          ttlSeconds: 900,
        },
      });
      assert.equal(created.statusCode, 200);
      assert.equal(created.headers['cache-control'], 'no-store');
      const invitationId = created.json().invitation.id as string;
      const acceptanceToken = created.json().invitation.acceptanceToken as string;
      assert.ok(acceptanceToken.length > 30);

      const accepted = await app.inject({
        method: 'POST',
        url: `/api/v1/guest-invitations/${acceptanceToken}/accept`,
        payload: { displayName: 'External Guest' },
      });
      assert.equal(accepted.statusCode, 200);
      const sessionToken = accepted.json().guestSession.sessionToken as string;

      const replay = await app.inject({
        method: 'POST',
        url: `/api/v1/guest-invitations/${acceptanceToken}/accept`,
        payload: { displayName: 'External Guest' },
      });
      assert.equal(replay.statusCode, 410);

      const waiting = await app.inject({
        method: 'POST',
        url: '/api/v1/guest-contribution-token',
        headers: { 'x-guest-session-token': sessionToken },
      });
      assert.equal(waiting.statusCode, 401);

      const admitted = await app.inject({
        method: 'POST',
        url: `${base}/guest-invitations/${invitationId}/admit`,
        headers: { cookie: moderator.cookie },
      });
      assert.equal(admitted.statusCode, 200);
      assert.equal(admitted.json().invitation.status, 'admitted');

      const credential = await app.inject({
        method: 'POST',
        url: '/api/v1/guest-contribution-token',
        headers: { 'x-guest-session-token': sessionToken },
      });
      assert.equal(credential.statusCode, 200);
      assert.equal(credential.json().credential.participantRole, 'guest');
      assert.deepEqual(credential.json().credential.permissions.canPublishSources, [
        'microphone',
      ]);

      const participants = await app.inject({
        method: 'GET',
        url: `${base}/backstage/participants`,
        headers: { cookie: moderator.cookie },
      });
      assert.equal(participants.statusCode, 200);
      const identity = participants.json().participants[0].identity as string;

      const mute = await app.inject({
        method: 'POST',
        url: `${base}/backstage/participants/${identity}/mute`,
        headers: { cookie: moderator.cookie },
        payload: { muted: true },
      });
      assert.equal(mute.statusCode, 200);
      assert.equal(mute.json().participant.tracks[0].muted, true);
      assert.deepEqual(muted, [{ identity, value: true }]);

      const remove = await app.inject({
        method: 'DELETE',
        url: `${base}/backstage/participants/${identity}`,
        headers: { cookie: owner.cookie },
      });
      assert.equal(remove.statusCode, 204);
      assert.deepEqual(removed, [identity]);

      const callIn = await app.inject({
        method: 'POST',
        url: `/api/v1/broadcasts/${organisation.slug}/${channel.slug}/${broadcast.slug}/call-ins`,
        payload: {
          displayName: 'Listener Caller',
          email: `caller-${suffix}@example.test`,
          message: 'I would like to join the discussion.',
        },
      });
      assert.equal(callIn.statusCode, 200);

      const callIns = await app.inject({
        method: 'GET',
        url: `${base}/call-ins`,
        headers: { cookie: moderator.cookie },
      });
      assert.equal(callIns.statusCode, 200);
      assert.equal(callIns.json().callIns.length, 1);

      const approved = await app.inject({
        method: 'POST',
        url: `${base}/call-ins/${callIn.json().callIn.id}/approve`,
        headers: { cookie: moderator.cookie },
      });
      assert.equal(approved.statusCode, 200);
      assert.equal(approved.json().callIn.status, 'approved');
      assert.ok(approved.json().invitation.acceptanceToken);
    } finally {
      if (organisationId) {
        await database.db
          .delete(organisations)
          .where((await import('drizzle-orm')).eq(organisations.id, organisationId));
      }
      if (userIds.length) {
        await database.db
          .delete(users)
          .where((await import('drizzle-orm')).inArray(users.id, userIds));
      }
      await app.close();
    }
  },
);
