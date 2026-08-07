import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq, isNull } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { userPlatformCapabilities, users } from '../src/db/schema.js';
import {
  bootstrapFirstPlatformAdmin,
  PlatformAdminBootstrapError,
} from '../src/operator/bootstrap-platform-admin.js';

const databaseUrl = process.env.DATABASE_URL;

test(
  'first platform admin bootstrap is idempotent for the same user and closed after first authority grant',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const firstEmail = `bootstrap-first-${suffix}@example.test`;
    const secondEmail = `bootstrap-second-${suffix}@example.test`;
    const password = 'A-strong-test-password-123!';
    const app = buildApp({ database });
    let firstUserId: string | undefined;
    let secondUserId: string | undefined;

    try {
      const firstRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: firstEmail,
          displayName: 'First Operator',
          password,
        },
      });
      assert.equal(firstRegistration.statusCode, 201);
      firstUserId = firstRegistration.json().user.id;

      const secondRegistration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: secondEmail,
          displayName: 'Second Operator',
          password,
        },
      });
      assert.equal(secondRegistration.statusCode, 201);
      secondUserId = secondRegistration.json().user.id;

      const firstGrant = await bootstrapFirstPlatformAdmin(database, `  ${firstEmail.toUpperCase()} `);
      assert.equal(firstGrant.status, 'granted');
      assert.equal(firstGrant.userId, firstUserId);
      assert.equal(firstGrant.email, firstEmail);

      const repeated = await bootstrapFirstPlatformAdmin(database, firstEmail);
      assert.equal(repeated.status, 'already-configured');
      assert.equal(repeated.userId, firstUserId);

      const activeAdmins = await database.db
        .select({ userId: userPlatformCapabilities.userId })
        .from(userPlatformCapabilities)
        .where(
          and(
            eq(userPlatformCapabilities.capability, 'platform_admin'),
            isNull(userPlatformCapabilities.revokedAt),
          ),
        );
      assert.equal(activeAdmins.length, 1);
      assert.equal(activeAdmins[0]?.userId, firstUserId);

      await assert.rejects(
        () => bootstrapFirstPlatformAdmin(database, secondEmail),
        (error: unknown) => {
          assert.ok(error instanceof PlatformAdminBootstrapError);
          assert.equal(error.code, 'PLATFORM_ADMIN_ALREADY_CONFIGURED');
          return true;
        },
      );

      await assert.rejects(
        () => bootstrapFirstPlatformAdmin(database, `missing-${suffix}@example.test`),
        (error: unknown) => {
          assert.ok(error instanceof PlatformAdminBootstrapError);
          assert.equal(error.code, 'PLATFORM_ADMIN_ALREADY_CONFIGURED');
          return true;
        },
      );
    } finally {
      await app.close();
      if (firstUserId) await database.db.delete(users).where(eq(users.id, firstUserId));
      if (secondUserId) await database.db.delete(users).where(eq(users.id, secondUserId));
      await database.close();
    }
  },
);

test(
  'bootstrap refuses missing or invalid target before any administrator exists',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    try {
      const existingAdmins = await database.db
        .select({ userId: userPlatformCapabilities.userId })
        .from(userPlatformCapabilities)
        .where(
          and(
            eq(userPlatformCapabilities.capability, 'platform_admin'),
            isNull(userPlatformCapabilities.revokedAt),
          ),
        );
      if (existingAdmins.length > 0) return;

      await assert.rejects(
        () => bootstrapFirstPlatformAdmin(database, 'not-an-email'),
        (error: unknown) => {
          assert.ok(error instanceof PlatformAdminBootstrapError);
          assert.equal(error.code, 'INVALID_EMAIL');
          return true;
        },
      );

      await assert.rejects(
        () => bootstrapFirstPlatformAdmin(database, 'missing@example.test'),
        (error: unknown) => {
          assert.ok(error instanceof PlatformAdminBootstrapError);
          assert.equal(error.code, 'USER_NOT_FOUND');
          return true;
        },
      );
    } finally {
      await database.close();
    }
  },
);
