import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';

const databaseUrl = process.env.DATABASE_URL;

test(
  'login abuse controls rate limit repeated failures and persist privacy-bounded audit evidence',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);

    const previousEmailLimit = process.env.AUTH_LOGIN_EMAIL_FAILURE_LIMIT;
    const previousIpLimit = process.env.AUTH_LOGIN_IP_FAILURE_LIMIT;
    process.env.AUTH_LOGIN_EMAIL_FAILURE_LIMIT = '2';
    process.env.AUTH_LOGIN_IP_FAILURE_LIMIT = '50';

    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const email = `abuse-${suffix}@example.test`;
    const password = 'A-strong-test-password-123!';
    const app = buildApp({ database, realtime: false });

    try {
      const registration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, displayName: 'Abuse Test', password },
      });
      assert.equal(registration.statusCode, 201);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const failure = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email, password: 'This-password-is-wrong-123!' },
        });
        assert.equal(failure.statusCode, 401);
        assert.equal(failure.json().error.code, 'INVALID_CREDENTIALS');
      }

      const blocked = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password },
      });
      assert.equal(blocked.statusCode, 429);
      assert.equal(blocked.json().error.code, 'LOGIN_RATE_LIMITED');
      assert.match(String(blocked.headers['retry-after']), /^\d+$/);

      const audit = await database.pool.query<{
        email_hash: string;
        ip_hash: string;
        outcome: string;
        request_id: string | null;
      }>(
        `SELECT email_hash, ip_hash, outcome, request_id
           FROM auth_login_attempts
          ORDER BY created_at ASC`,
      );
      assert.equal(audit.rows.length, 3);
      assert.deepEqual(
        audit.rows.map((row) => row.outcome),
        ['invalid_credentials', 'invalid_credentials', 'rate_limited'],
      );
      for (const row of audit.rows) {
        assert.match(row.email_hash, /^[a-f0-9]{64}$/);
        assert.match(row.ip_hash, /^[a-f0-9]{64}$/);
        assert.notEqual(row.email_hash, email);
        assert.ok(row.request_id);
      }
    } finally {
      await app.close();
      await database.pool.query('DELETE FROM users WHERE email = $1', [email]);
      await database.pool.query(
        `DELETE FROM auth_login_attempts
          WHERE created_at >= now() - interval '5 minutes'`,
      );
      await database.close();
      if (previousEmailLimit === undefined) delete process.env.AUTH_LOGIN_EMAIL_FAILURE_LIMIT;
      else process.env.AUTH_LOGIN_EMAIL_FAILURE_LIMIT = previousEmailLimit;
      if (previousIpLimit === undefined) delete process.env.AUTH_LOGIN_IP_FAILURE_LIMIT;
      else process.env.AUTH_LOGIN_IP_FAILURE_LIMIT = previousIpLimit;
    }
  },
);
