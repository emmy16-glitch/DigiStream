import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
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
  'Studio safe stop cancels a starting broadcast idempotently without inventing a live end',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'A-strong-test-password-123!';
    const app = buildApp({ database });
    let organisationId: string | undefined;
    let ownerId: string | undefined;

    try {
      const registered = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: `studio-safe-stop-${suffix}@example.test`,
          displayName: 'Studio Safe Stop Owner',
          password,
        },
      });
      assert.equal(registered.statusCode, 201);
      ownerId = registered.json().user.id as string;
      const cookie = responseCookie(registered);

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Studio Safe Stop Network',
          slug: `studio-safe-stop-${suffix}`,
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
          name: 'Studio Channel',
          slug: `studio-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: ownerId,
        })
        .returning();
      assert.ok(channel);

      const [starting, completed] = await database.db
        .insert(broadcastRecords)
        .values([
          {
            organisationId,
            channelId: channel.id,
            createdByUserId: ownerId,
            title: 'Starting but not live',
            slug: `starting-${suffix}`,
            status: 'starting',
            lifecycleVersion: 4,
            startRequestedAt: new Date(),
            contributionRoomName: `room-starting-${suffix}`,
            deliveryStreamName: `stream-starting-${suffix}`,
          },
          {
            organisationId,
            channelId: channel.id,
            createdByUserId: ownerId,
            title: 'Already completed',
            slug: `completed-${suffix}`,
            status: 'completed',
            lifecycleVersion: 8,
            endedAt: new Date(),
            contributionRoomName: `room-completed-${suffix}`,
            deliveryStreamName: `stream-completed-${suffix}`,
          },
        ])
        .returning();
      assert.ok(starting);
      assert.ok(completed);

      const idempotencyKey = `studio-safe-end-${suffix}`;
      const stopped = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${starting.id}/end`,
        headers: {
          cookie,
          'idempotency-key': idempotencyKey,
        },
        payload: { expectedVersion: 4 },
      });
      assert.equal(stopped.statusCode, 200);
      assert.equal(stopped.json().broadcast.status, 'cancelled');
      assert.equal(stopped.json().broadcast.lifecycleVersion, 5);
      assert.ok(stopped.json().broadcast.endedAt);
      assert.equal(stopped.json().broadcast.liveStartedAt, null);

      const replay = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${starting.id}/end`,
        headers: {
          cookie,
          'idempotency-key': idempotencyKey,
        },
        payload: { expectedVersion: 4 },
      });
      assert.equal(replay.statusCode, 200);
      assert.equal(replay.json().broadcast.status, 'cancelled');
      assert.equal(replay.json().broadcast.lifecycleVersion, 5);

      const terminalEnd = await app.inject({
        method: 'POST',
        url: `/api/v1/organisations/${organisationId}/broadcasts/${completed.id}/end`,
        headers: {
          cookie,
          'idempotency-key': `terminal-end-${suffix}`,
        },
        payload: { expectedVersion: 8 },
      });
      assert.equal(terminalEnd.statusCode, 409);
      assert.equal(
        terminalEnd.json().error.code,
        'INVALID_BROADCAST_STATUS_TRANSITION',
      );
    } finally {
      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }
      if (ownerId) await database.db.delete(users).where(eq(users.id, ownerId));
      await app.close();
      await database.close();
    }
  },
);
