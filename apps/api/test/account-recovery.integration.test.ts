import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { users } from '../src/db/schema.js';

const databaseUrl = process.env.DATABASE_URL;

function cookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'email verification and password reset use delivered single-use tokens and revoke sessions',
  { skip: !databaseUrl, timeout: 60_000 },
  async () => {
    const delivered: Array<Record<string, unknown>> = [];
    const server = createServer((request, response) => {
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        delivered.push(JSON.parse(body) as Record<string, unknown>);
        response.writeHead(204).end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
    const address = server.address();
    assert.ok(address && typeof address === 'object');

    const previousWebhook = process.env.AUTH_EMAIL_WEBHOOK_URL;
    process.env.AUTH_EMAIL_WEBHOOK_URL = `http://localhost:${address.port}`;

    const database = createDatabase(databaseUrl!);
    assert.ok(database);
    await runMigrations(database.pool);
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const email = `recovery-${suffix}@example.test`;
    const oldPassword = 'A-strong-original-password-123!';
    const newPassword = 'A-strong-replacement-password-456!';
    let userId: string | undefined;
    const app = buildApp({
      database,
      contributionProvider: null,
      backstageProvider: null,
      deliveryProvider: null,
      mediaRelayProvider: null,
      objectStorage: null,
      recordingAccessManager: null,
      realtime: false,
    });

    try {
      const registration = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, displayName: 'Recovery Test', password: oldPassword },
      });
      assert.equal(registration.statusCode, 201);
      const sessionCookie = cookie(registration);
      userId = registration.json().user.id;
      assert.equal(registration.json().user.emailVerifiedAt, null);

      const verificationRequest = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/email-verification/request',
        headers: { cookie: sessionCookie },
      });
      assert.equal(verificationRequest.statusCode, 202);
      assert.equal(delivered.length, 1);
      assert.equal(delivered[0]?.template, 'email_verification');
      assert.equal(delivered[0]?.recipient, email);
      assert.equal(typeof delivered[0]?.token, 'string');
      const verificationToken = String(delivered[0]?.token);

      const confirmVerification = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/email-verification/confirm',
        payload: { token: verificationToken },
      });
      assert.equal(confirmVerification.statusCode, 204);
      const confirmVerificationAgain = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/email-verification/confirm',
        payload: { token: verificationToken },
      });
      assert.equal(confirmVerificationAgain.statusCode, 204);

      const me = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: sessionCookie },
      });
      assert.equal(me.statusCode, 200);
      assert.ok(me.json().user.emailVerifiedAt);

      const resetUnknown = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password-reset/request',
        payload: { email: `missing-${suffix}@example.test` },
      });
      assert.equal(resetUnknown.statusCode, 202);
      assert.equal(delivered.length, 1);

      const resetRequest = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password-reset/request',
        payload: { email },
      });
      assert.equal(resetRequest.statusCode, 202);
      assert.equal(delivered.length, 2);
      assert.equal(delivered[1]?.template, 'password_reset');
      const resetToken = String(delivered[1]?.token);

      const resetConfirm = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password-reset/confirm',
        payload: { token: resetToken, password: newPassword },
      });
      assert.equal(resetConfirm.statusCode, 204);

      const resetReplay = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/password-reset/confirm',
        payload: { token: resetToken, password: newPassword },
      });
      assert.equal(resetReplay.statusCode, 400);
      assert.equal(resetReplay.json().error.code, 'RESET_TOKEN_INVALID');

      const revokedSession = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: sessionCookie },
      });
      assert.equal(revokedSession.statusCode, 401);

      const oldLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: oldPassword },
      });
      assert.equal(oldLogin.statusCode, 401);

      const newLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: newPassword },
      });
      assert.equal(newLogin.statusCode, 200);
    } finally {
      await app.close();
      if (userId) await database.db.delete(users).where(eq(users.id, userId));
      await database.close();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      if (previousWebhook === undefined) delete process.env.AUTH_EMAIL_WEBHOOK_URL;
      else process.env.AUTH_EMAIL_WEBHOOK_URL = previousWebhook;
    }
  },
);
