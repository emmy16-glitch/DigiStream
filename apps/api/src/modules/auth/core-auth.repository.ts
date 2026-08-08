import type { DatabaseContext } from '../../db/client.js';

export type AuthUserRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  status: 'active' | 'suspended' | 'deleted';
  email_verified_at: Date | null;
  created_at: Date;
};

export type PublicAuthUserRow = Omit<AuthUserRow, 'password_hash'>;

export type SessionMaterial = {
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
};

export type GoogleIdentityInput = {
  subject: string;
  email: string;
  displayName: string;
};

export type CurrentSessionUserRow = PublicAuthUserRow & {
  session_id: string;
};

export async function findUserByEmail(
  database: DatabaseContext,
  email: string,
): Promise<AuthUserRow | null> {
  const result = await database.pool.query<AuthUserRow>(
    `SELECT id, email, display_name, password_hash, status,
            email_verified_at, created_at
       FROM users
      WHERE email = $1
      LIMIT 1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function registerEmailUser(
  database: DatabaseContext,
  input: {
    email: string;
    displayName: string;
    passwordHash: string;
    session: SessionMaterial;
  },
): Promise<PublicAuthUserRow> {
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');
    const created = await client.query<PublicAuthUserRow>(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, display_name, status, email_verified_at, created_at`,
      [input.email, input.displayName, input.passwordHash],
    );
    const user = created.rows[0];
    if (!user) throw new Error('User insertion returned no row.');

    await client.query(
      `INSERT INTO user_platform_capabilities
         (user_id, capability, granted_by_user_id)
       VALUES ($1, 'broadcaster', $1)`,
      [user.id],
    );
    await client.query(
      `INSERT INTO auth_sessions
         (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        input.session.tokenHash,
        input.session.expiresAt,
        input.session.userAgent,
        input.session.ipAddress,
      ],
    );
    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createSession(
  database: DatabaseContext,
  userId: string,
  session: SessionMaterial,
): Promise<void> {
  await database.pool.query(
    `INSERT INTO auth_sessions
       (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, session.tokenHash, session.expiresAt, session.userAgent, session.ipAddress],
  );
}

export async function authenticateGoogleIdentity(
  database: DatabaseContext,
  identity: GoogleIdentityInput,
  placeholderPasswordHash: string,
  session: SessionMaterial,
): Promise<PublicAuthUserRow> {
  const client = await database.pool.connect();
  try {
    await client.query('BEGIN');

    const existingIdentity = await client.query<PublicAuthUserRow>(
      `SELECT u.id, u.email, u.display_name, u.status,
              u.email_verified_at, u.created_at
         FROM auth_identities identity
         JOIN users u ON u.id = identity.user_id
        WHERE identity.provider = 'google'
          AND identity.provider_subject = $1
        FOR UPDATE`,
      [identity.subject],
    );
    let user = existingIdentity.rows[0] ?? null;

    if (!user) {
      const existingEmail = await client.query<PublicAuthUserRow>(
        `SELECT id, email, display_name, status, email_verified_at, created_at
           FROM users
          WHERE email = $1
          FOR UPDATE`,
        [identity.email],
      );
      user = existingEmail.rows[0] ?? null;

      if (!user) {
        const created = await client.query<PublicAuthUserRow>(
          `INSERT INTO users
             (email, display_name, password_hash, email_verified_at)
           VALUES ($1, $2, $3, now())
           RETURNING id, email, display_name, status,
                     email_verified_at, created_at`,
          [identity.email, identity.displayName, placeholderPasswordHash],
        );
        user = created.rows[0] ?? null;
      } else if (user.status === 'active' && !user.email_verified_at) {
        const verified = await client.query<PublicAuthUserRow>(
          `UPDATE users
              SET email_verified_at = now(), updated_at = now()
            WHERE id = $1
            RETURNING id, email, display_name, status,
                      email_verified_at, created_at`,
          [user.id],
        );
        user = verified.rows[0] ?? user;
      }

      if (!user) throw new Error('Google user creation returned no row.');
      if (user.status !== 'active') {
        await client.query('ROLLBACK');
        return user;
      }

      const linked = await client.query<{ user_id: string }>(
        `INSERT INTO auth_identities
           (user_id, provider, provider_subject, provider_email)
         VALUES ($1, 'google', $2, $3)
         ON CONFLICT (provider, provider_subject)
         DO UPDATE SET provider_email = EXCLUDED.provider_email,
                       updated_at = now()
         RETURNING user_id`,
        [user.id, identity.subject, identity.email],
      );
      const linkedUserId = linked.rows[0]?.user_id;
      if (!linkedUserId) throw new Error('Google identity linking returned no user.');
      if (linkedUserId !== user.id) {
        const linkedUser = await client.query<PublicAuthUserRow>(
          `SELECT id, email, display_name, status, email_verified_at, created_at
             FROM users
            WHERE id = $1
            FOR UPDATE`,
          [linkedUserId],
        );
        user = linkedUser.rows[0] ?? null;
      }
    }

    if (!user) throw new Error('Google identity resolved to a missing user.');
    if (user.status !== 'active') {
      await client.query('ROLLBACK');
      return user;
    }

    await client.query(
      `INSERT INTO user_platform_capabilities
         (user_id, capability, granted_by_user_id)
       VALUES ($1, 'broadcaster', $1)
       ON CONFLICT (user_id, capability)
       DO UPDATE SET revoked_at = NULL`,
      [user.id],
    );
    await client.query(
      `INSERT INTO auth_sessions
         (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, session.tokenHash, session.expiresAt, session.userAgent, session.ipAddress],
    );

    await client.query('COMMIT');
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findCurrentSessionUser(
  database: DatabaseContext,
  tokenHash: string,
  now: Date,
): Promise<CurrentSessionUserRow | null> {
  const result = await database.pool.query<CurrentSessionUserRow>(
    `SELECT s.id AS session_id,
            u.id, u.email, u.display_name, u.status,
            u.email_verified_at, u.created_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > $2
        AND u.status = 'active'
      LIMIT 1`,
    [tokenHash, now],
  );
  return result.rows[0] ?? null;
}

export async function touchSession(
  database: DatabaseContext,
  sessionId: string,
  now: Date,
): Promise<void> {
  await database.pool.query(
    `UPDATE auth_sessions SET last_used_at = $2 WHERE id = $1`,
    [sessionId, now],
  );
}

export async function revokeSessionByTokenHash(
  database: DatabaseContext,
  tokenHash: string,
): Promise<void> {
  await database.pool.query(
    `UPDATE auth_sessions
        SET revoked_at = now()
      WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
}
