import type { DatabaseContext } from '../db/client.js';

export type BootstrapPlatformAdminResult = {
  userId: string;
  email: string;
  status: 'granted' | 'already-configured';
};

export class PlatformAdminBootstrapError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_EMAIL'
      | 'USER_NOT_FOUND'
      | 'PLATFORM_ADMIN_ALREADY_CONFIGURED',
    message: string,
  ) {
    super(message);
    this.name = 'PlatformAdminBootstrapError';
  }
}

function normaliseEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new PlatformAdminBootstrapError(
      'INVALID_EMAIL',
      'Provide the email address of an existing active DigiStream user.',
    );
  }
  return email;
}

export async function bootstrapFirstPlatformAdmin(
  database: DatabaseContext,
  emailInput: string,
): Promise<BootstrapPlatformAdminResult> {
  const email = normaliseEmail(emailInput);
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('digistream:first-platform-admin-bootstrap'))",
    );

    const existingAdmin = await client.query<{
      user_id: string;
      email: string;
    }>(
      `SELECT capability.user_id, users.email
         FROM user_platform_capabilities capability
         JOIN users ON users.id = capability.user_id
        WHERE capability.capability = 'platform_admin'
          AND capability.revoked_at IS NULL
          AND users.status = 'active'
        ORDER BY capability.granted_at ASC
        LIMIT 1
        FOR UPDATE OF capability`,
    );

    const configured = existingAdmin.rows[0];
    if (configured) {
      if (configured.email === email) {
        await client.query('COMMIT');
        return {
          userId: configured.user_id,
          email: configured.email,
          status: 'already-configured',
        };
      }
      throw new PlatformAdminBootstrapError(
        'PLATFORM_ADMIN_ALREADY_CONFIGURED',
        'A platform administrator is already configured. Use the normal administrative authority path for later grants.',
      );
    }

    const target = await client.query<{ id: string; email: string }>(
      `SELECT id, email
         FROM users
        WHERE email = $1
          AND status = 'active'
        LIMIT 1
        FOR UPDATE`,
      [email],
    );
    const user = target.rows[0];
    if (!user) {
      throw new PlatformAdminBootstrapError(
        'USER_NOT_FOUND',
        'No active DigiStream user exists with that email address.',
      );
    }

    await client.query(
      `INSERT INTO user_platform_capabilities
         (user_id, capability, granted_by_user_id)
       VALUES ($1, 'platform_admin', $1)
       ON CONFLICT (user_id, capability)
       DO UPDATE SET revoked_at = NULL,
                     granted_by_user_id = EXCLUDED.granted_by_user_id,
                     granted_at = now()`,
      [user.id],
    );

    await client.query('COMMIT');
    return { userId: user.id, email: user.email, status: 'granted' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
