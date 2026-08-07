import type { PoolClient } from 'pg';
import type { DatabaseContext } from '../../db/client.js';

export type AccountRow = {
  id: string;
  email: string;
  display_name: string;
  email_verified_at: Date | null;
  status: string;
};

export type AccountTokenPurpose = 'email_verification' | 'password_reset';

export async function findAccountById(
  database: DatabaseContext,
  userId: string,
): Promise<AccountRow | null> {
  const result = await database.pool.query<AccountRow>(
    `SELECT id, email, display_name, email_verified_at, status
       FROM users
      WHERE id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function findAccountByEmail(
  database: DatabaseContext,
  email: string,
): Promise<AccountRow | null> {
  const result = await database.pool.query<AccountRow>(
    `SELECT id, email, display_name, email_verified_at, status
       FROM users
      WHERE email = $1
      LIMIT 1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function persistAccountToken(
  database: DatabaseContext,
  userId: string,
  purpose: AccountTokenPurpose,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE auth_account_tokens
          SET consumed_at = now()
        WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
      [userId, purpose],
    );
    await client.query(
      `INSERT INTO auth_account_tokens (user_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, purpose, tokenHash, expiresAt],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function consumeTokenByHash(
  database: DatabaseContext,
  tokenHash: string,
): Promise<void> {
  await database.pool.query(
    `UPDATE auth_account_tokens
        SET consumed_at = now()
      WHERE token_hash = $1 AND consumed_at IS NULL`,
    [tokenHash],
  );
}

async function rollback(client: PoolClient): Promise<void> {
  await client.query('ROLLBACK');
}

export async function confirmEmailVerification(
  database: DatabaseContext,
  tokenHash: string,
  now: Date,
): Promise<'confirmed' | 'invalid'> {
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<{
      id: string;
      user_id: string;
      expires_at: Date;
      consumed_at: Date | null;
      email_verified_at: Date | null;
    }>(
      `SELECT t.id, t.user_id, t.expires_at, t.consumed_at, u.email_verified_at
         FROM auth_account_tokens t
         JOIN users u ON u.id = t.user_id
        WHERE t.token_hash = $1 AND t.purpose = 'email_verification'
        FOR UPDATE`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row || row.expires_at <= now) {
      await rollback(client);
      return 'invalid';
    }
    if (!row.email_verified_at) {
      await client.query(
        `UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1`,
        [row.user_id],
      );
    }
    if (!row.consumed_at) {
      await client.query(
        `UPDATE auth_account_tokens SET consumed_at = now() WHERE id = $1`,
        [row.id],
      );
    }
    await client.query('COMMIT');
    return 'confirmed';
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

export async function confirmPasswordReset(
  database: DatabaseContext,
  tokenHash: string,
  passwordHash: string,
  now: Date,
): Promise<'confirmed' | 'invalid'> {
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<{
      id: string;
      user_id: string;
      expires_at: Date;
      consumed_at: Date | null;
    }>(
      `SELECT id, user_id, expires_at, consumed_at
         FROM auth_account_tokens
        WHERE token_hash = $1 AND purpose = 'password_reset'
        FOR UPDATE`,
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row || row.consumed_at || row.expires_at <= now) {
      await rollback(client);
      return 'invalid';
    }
    await client.query(
      `UPDATE users
          SET password_hash = $1, updated_at = now()
        WHERE id = $2 AND status = 'active'`,
      [passwordHash, row.user_id],
    );
    await client.query(
      `UPDATE auth_account_tokens SET consumed_at = now() WHERE id = $1`,
      [row.id],
    );
    await client.query(
      `UPDATE auth_sessions SET revoked_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [row.user_id],
    );
    await client.query('COMMIT');
    return 'confirmed';
  } catch (error) {
    await rollback(client);
    throw error;
  } finally {
    client.release();
  }
}
