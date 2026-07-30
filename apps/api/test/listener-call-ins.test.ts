import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
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

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

test(
  'listener call-ins expose private status polling and durable abuse controls',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    process.env.NODE_ENV = 'test';
    process.env.CALL_IN_FINGERPRINT_SECRET = 'listener-call-in-test-secret';
    process.env.CALL_IN_RATE_LIMIT_MAX = '3';
    process.env.CALL_IN_RATE_LIMIT_WINDOW_SECONDS = '1800';
    process.env.CALL_IN_STATUS_TTL_SECONDS = '86400';

    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database });

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const userIds: string[] = [];
    let organisationId = '';

    try {
      const registration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `call-in-owner-${suffix}@example.test`,
          displayName: 'Call-in Owner',
          password,
        },
      });
      assert.equal(registration.statusCode, 201);
      const ownerId = registration.json().user.id as string;
      const ownerCookie = responseCookie(registration);
      userIds.push(ownerId);

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Listener Call-in Network',
          slug: `listener-call-in-network-${suffix}`,
          createdByUserId: ownerId,
        })
        .returning();
      assert.ok(organisation);
      organisationId = organisation.id;
      await database.db.insert(organisationMemberships).values({
        organisationId,
        userId: ownerId,
        role: 'owner',
      });

      const [channel] = await database.db
        .insert(channelRecords)
        .values({
          organisationId,
          name: 'Listener Call-in Channel',
          slug: `listener-call-in-channel-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: ownerId,
        })
        .returning();
      assert.ok(channel);

      const [broadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: channel.id,
          createdByUserId: ownerId,
          title: 'Listener Call-in Broadcast',
          slug: `listener-call-in-broadcast-${suffix}`,
          status: 'scheduled',
          scheduledStartAt: new Date(Date.now() + 3_600_000),
          contributionRoomName: `listener-call-in-room-${suffix}`,
          deliveryStreamName: `listener-call-in-delivery-${suffix}`,
        })
        .returning();
      assert.ok(broadcast);

      const publicEndpoint = `/api/v1/broadcasts/${organisation.slug}/${channel.slug}/${broadcast.slug}/call-ins`;
      const managementBase = `/api/v1/organisations/${organisationId}/broadcasts/${broadcast.id}`;
      const headers = { 'user-agent': `DigiStream-Listener-Test/${suffix}` };

      async function submitCallIn(label: string) {
        return app.inject({
          method: 'POST',
          url: publicEndpoint,
          headers,
          payload: {
            displayName: 'Listener Caller',
            email: `listener-${suffix}@example.test`,
            message: `Request ${label}`,
          },
        });
      }

      const created = await submitCallIn('one');
      assert.equal(created.statusCode, 200);
      assert.equal(created.headers['cache-control'], 'no-store');
      const firstId = created.json().callIn.id as string;
      const firstStatusToken = created.json().statusToken as string;
      assert.ok(firstStatusToken.length > 30);
      assert.ok(created.json().statusExpiresAt);

      const status = await app.inject({
        method: 'GET',
        url: `/api/v1/call-ins/${firstStatusToken}`,
      });
      assert.equal(status.statusCode, 200);
      assert.equal(status.headers['cache-control'], 'no-store');
      assert.equal(status.json().callIn.status, 'pending');
      assert.equal(status.json().callIn.contactProvided, true);
      assert.equal('contactEmail' in status.json().callIn, false);
      assert.equal('message' in status.json().callIn, false);
      assert.equal('organisationId' in status.json().callIn, false);

      const duplicate = await submitCallIn('duplicate');
      assert.equal(duplicate.statusCode, 409);
      assert.equal(duplicate.json().error.code, 'CALL_IN_ALREADY_PENDING');

      const approved = await app.inject({
        method: 'POST',
        url: `${managementBase}/call-ins/${firstId}/approve`,
        headers: { cookie: ownerCookie },
      });
      assert.equal(approved.statusCode, 200);
      assert.equal(approved.json().callIn.status, 'approved');

      const approvedStatus = await app.inject({
        method: 'GET',
        url: `/api/v1/call-ins/${firstStatusToken}`,
      });
      assert.equal(approvedStatus.statusCode, 200);
      assert.equal(approvedStatus.json().callIn.status, 'approved');
      assert.match(
        approvedStatus.json().callIn.guidance,
        /approved/i,
      );

      for (const label of ['two', 'three']) {
        const request = await submitCallIn(label);
        assert.equal(request.statusCode, 200);
        const rejected = await app.inject({
          method: 'POST',
          url: `${managementBase}/call-ins/${request.json().callIn.id}/reject`,
          headers: { cookie: ownerCookie },
        });
        assert.equal(rejected.statusCode, 200);
        assert.equal(rejected.json().callIn.status, 'rejected');
      }

      const limited = await submitCallIn('four');
      assert.equal(limited.statusCode, 429);
      assert.equal(limited.json().error.code, 'CALL_IN_RATE_LIMITED');
      assert.ok(Number(limited.headers['retry-after']) >= 1);
      assert.ok(limited.json().error.details.retryAfterSeconds >= 1);

      await database.pool.query(
        `UPDATE broadcast_call_in_requests
            SET status_token_expires_at = now() - interval '1 second'
          WHERE status_token_hash = $1`,
        [hashToken(firstStatusToken)],
      );
      const expired = await app.inject({
        method: 'GET',
        url: `/api/v1/call-ins/${firstStatusToken}`,
      });
      assert.equal(expired.statusCode, 410);
      assert.equal(expired.json().error.code, 'CALL_IN_STATUS_EXPIRED');
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
