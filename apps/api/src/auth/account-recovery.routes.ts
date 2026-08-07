import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { DatabaseContext } from '../db/client.js';
import { authenticateSessionCookie } from './session-auth.js';
import { hashPassword } from './password.js';
import type { AccountTokenDelivery } from './account-token-delivery.js';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

type PasswordResetRequestBody = { email?: unknown };
type PasswordResetConfirmBody = { token?: unknown; password?: unknown };
type VerifyConfirmBody = { token?: unknown };

type AccountRow = {
  id: string;
  email: string;
  display_name: string;
  email_verified_at: Date | null;
  status: string;
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function makeToken(): string {
  return randomBytes(32).toString('base64url');
}

function validToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 32 && value.length <= 200;
}

function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128;
}

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

async function issueToken(
  database: DatabaseContext,
  user: AccountRow,
  purpose: 'email_verification' | 'password_reset',
  expiresAt: Date,
  delivery: AccountTokenDelivery,
): Promise<void> {
  const token = makeToken();
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE auth_account_tokens
          SET consumed_at = now()
        WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
      [user.id, purpose],
    );
    await client.query(
      `INSERT INTO auth_account_tokens (user_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, purpose, hashToken(token), expiresAt],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  try {
    const message = { email: user.email, displayName: user.display_name, token, expiresAt };
    if (purpose === 'email_verification') await delivery.sendEmailVerification(message);
    else await delivery.sendPasswordReset(message);
  } catch (error) {
    await database.pool.query(
      `UPDATE auth_account_tokens
          SET consumed_at = now()
        WHERE token_hash = $1 AND consumed_at IS NULL`,
      [hashToken(token)],
    );
    throw error;
  }
}

export function registerAccountRecoveryRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  delivery: AccountTokenDelivery | null,
): void {
  app.post('/api/v1/auth/email-verification/request', async (request, reply) => {
    if (!database) return reply.code(503).send({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Account verification is temporarily unavailable.' } });
    const session = await authenticateSessionCookie(database.db, request.headers.cookie);
    if (!session) return reply.code(401).send({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } });

    const result = await database.pool.query<AccountRow>(
      `SELECT id, email, display_name, email_verified_at, status FROM users WHERE id = $1`,
      [session.userId],
    );
    const user = result.rows[0];
    if (!user || user.status !== 'active') return reply.code(401).send({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } });
    if (user.email_verified_at) return reply.code(204).send();
    if (!delivery) return reply.code(503).send({ error: { code: 'EMAIL_DELIVERY_UNAVAILABLE', message: 'Verification email is temporarily unavailable.' } });

    try {
      await issueToken(database, user, 'email_verification', new Date(Date.now() + VERIFY_TTL_MS), delivery);
      return reply.code(202).send({ status: 'verification_sent' });
    } catch (error) {
      request.log.error({ error }, 'Failed to deliver email verification');
      return reply.code(503).send({ error: { code: 'EMAIL_DELIVERY_UNAVAILABLE', message: 'Verification email is temporarily unavailable.' } });
    }
  });

  app.post<{ Body: VerifyConfirmBody }>('/api/v1/auth/email-verification/confirm', async (request, reply) => {
    if (!database) return reply.code(503).send({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Account verification is temporarily unavailable.' } });
    const token = request.body?.token;
    if (!validToken(token)) return reply.code(400).send({ error: { code: 'VERIFICATION_TOKEN_INVALID', message: 'This verification link is invalid or expired.' } });

    const client = await database.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{ id: string; user_id: string; expires_at: Date; consumed_at: Date | null; email_verified_at: Date | null }>(
        `SELECT t.id, t.user_id, t.expires_at, t.consumed_at, u.email_verified_at
           FROM auth_account_tokens t JOIN users u ON u.id = t.user_id
          WHERE t.token_hash = $1 AND t.purpose = 'email_verification'
          FOR UPDATE`,
        [hashToken(token)],
      );
      const row = result.rows[0];
      if (!row || row.expires_at <= new Date()) {
        await client.query('ROLLBACK');
        return reply.code(400).send({ error: { code: 'VERIFICATION_TOKEN_INVALID', message: 'This verification link is invalid or expired.' } });
      }
      if (!row.email_verified_at) {
        await client.query(`UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1`, [row.user_id]);
      }
      if (!row.consumed_at) await client.query(`UPDATE auth_account_tokens SET consumed_at = now() WHERE id = $1`, [row.id]);
      await client.query('COMMIT');
      return reply.code(204).send();
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post<{ Body: PasswordResetRequestBody }>('/api/v1/auth/password-reset/request', async (request, reply) => {
    if (!database) return reply.code(503).send({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Password recovery is temporarily unavailable.' } });
    const email = normaliseEmail(request.body?.email);
    if (!email) return reply.code(202).send({ status: 'accepted' });
    const result = await database.pool.query<AccountRow>(
      `SELECT id, email, display_name, email_verified_at, status FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    const user = result.rows[0];
    if (user?.status === 'active' && delivery) {
      try {
        await issueToken(database, user, 'password_reset', new Date(Date.now() + RESET_TTL_MS), delivery);
      } catch (error) {
        request.log.error({ error }, 'Failed to deliver password reset');
      }
    }
    return reply.code(202).send({ status: 'accepted' });
  });

  app.post<{ Body: PasswordResetConfirmBody }>('/api/v1/auth/password-reset/confirm', async (request, reply) => {
    if (!database) return reply.code(503).send({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Password recovery is temporarily unavailable.' } });
    const token = request.body?.token;
    const password = request.body?.password;
    if (!validToken(token) || !validPassword(password)) {
      return reply.code(400).send({ error: { code: 'RESET_TOKEN_INVALID', message: 'This password reset link is invalid or expired.' } });
    }
    const passwordHash = await hashPassword(password);
    const client = await database.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{ id: string; user_id: string; expires_at: Date; consumed_at: Date | null }>(
        `SELECT id, user_id, expires_at, consumed_at FROM auth_account_tokens
          WHERE token_hash = $1 AND purpose = 'password_reset' FOR UPDATE`,
        [hashToken(token)],
      );
      const row = result.rows[0];
      if (!row || row.consumed_at || row.expires_at <= new Date()) {
        await client.query('ROLLBACK');
        return reply.code(400).send({ error: { code: 'RESET_TOKEN_INVALID', message: 'This password reset link is invalid or expired.' } });
      }
      await client.query(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2 AND status = 'active'`, [passwordHash, row.user_id]);
      await client.query(`UPDATE auth_account_tokens SET consumed_at = now() WHERE id = $1`, [row.id]);
      await client.query(`UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, [row.user_id]);
      await client.query('COMMIT');
      return reply.code(204).send();
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}
