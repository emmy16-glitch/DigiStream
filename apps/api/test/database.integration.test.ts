import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  broadcasts,
  channels,
  organisationMemberships,
  organisations,
  users,
} from '../src/db/schema.js';

const databaseUrl = process.env.DATABASE_URL;

test(
  'PostgreSQL migrations and core tenant relationships work',
  { skip: !databaseUrl },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);

    const firstMigrationRun = await runMigrations(database.pool);
    const secondMigrationRun = await runMigrations(database.pool);

    assert.ok(firstMigrationRun.length >= 0);
    assert.deepEqual(secondMigrationRun, []);

    const uniqueSuffix = randomUUID().replaceAll('-', '').slice(0, 12);
    let organisationId: string | undefined;
    let userId: string | undefined;

    try {
      const [user] = await database.db
        .insert(users)
        .values({
          email: `owner-${uniqueSuffix}@example.test`,
          displayName: 'Integration Test Owner',
          passwordHash: 'not-a-real-password-hash',
        })
        .returning();

      assert.ok(user);
      userId = user.id;

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Integration Test Organisation',
          slug: `integration-${uniqueSuffix}`,
          createdByUserId: user.id,
        })
        .returning();

      assert.ok(organisation);
      organisationId = organisation.id;

      await database.db.insert(organisationMemberships).values({
        organisationId: organisation.id,
        userId: user.id,
        role: 'owner',
      });

      await assert.rejects(
        database.db.insert(organisationMemberships).values({
          organisationId: organisation.id,
          userId: user.id,
          role: 'admin',
        }),
      );

      const [channel] = await database.db
        .insert(channels)
        .values({
          organisationId: organisation.id,
          name: 'Main Channel',
          slug: 'main',
        })
        .returning();

      assert.ok(channel);

      const [broadcast] = await database.db
        .insert(broadcasts)
        .values({
          organisationId: organisation.id,
          channelId: channel.id,
          createdByUserId: user.id,
          title: 'Foundation Broadcast',
          slug: `foundation-${uniqueSuffix}`,
          status: 'scheduled',
          scheduledStartAt: new Date(Date.now() + 60_000),
        })
        .returning();

      assert.ok(broadcast);

      const storedBroadcasts = await database.db
        .select()
        .from(broadcasts)
        .where(eq(broadcasts.id, broadcast.id));

      assert.equal(storedBroadcasts.length, 1);
      assert.equal(storedBroadcasts[0]?.organisationId, organisation.id);
      assert.equal(storedBroadcasts[0]?.channelId, channel.id);

      const app = buildApp({ database });
      const healthResponse = await app.inject({
        method: 'GET',
        url: '/health',
      });

      assert.equal(healthResponse.statusCode, 200);
      assert.equal(healthResponse.json().database.status, 'connected');
      assert.equal(typeof healthResponse.json().database.latencyMs, 'number');

      await app.close();
    } finally {
      if (organisationId) {
        await database.db
          .delete(organisations)
          .where(eq(organisations.id, organisationId));
      }

      if (userId) {
        await database.db.delete(users).where(eq(users.id, userId));
      }

      await database.close();
    }
  },
);
