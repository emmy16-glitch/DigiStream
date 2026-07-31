import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import type { DatabaseContext } from '../db/client.js';
import {
  authSessions,
  userPlatformCapabilities,
  users,
  type User,
} from '../db/schema.js';
import {
  clearSessionCookie,
  createSessionCookie,
  getSessionCookieName,
  readCookie,
} from './cookies.js';
import { verifyGoogleIdentityToken } from './google-identity.js';
import { hashPassword, verifyPassword } from './password.js';

const DEFAULT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const DUMMY_PASSWORD_HASH =
  'scrypt$32768$8$3$ZGlnaXN0cmVhbS1kdW1teQ$l3AsXzOUIyW_cvzp5bUXEhf5i8zzn9iGBFkAvR6GppxoN83n3zZ-M6DPEUcOAzhYAutZme_ezgXib5vla621Dg';

type RegisterBody = {
  email?: unknown;
  displayName?: unknown;
  password?: unknown;
};

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

type GoogleLoginBody = {
  credential?: unknown;
  nonce?: unknown;
};

type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  status: User['status'];
  emailVerifiedAt: Date | null;
  createdAt: Date;
};

type GoogleUserRow = {
  id: string;
  email: string;
  display_name: string;
  status: User['status'];
  email_verified_at: Date | null;
  created_at: Date;
};

type AuthSessionMaterial = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
};

class GoogleAccountUnavailableError extends Error {}

function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
  };
}

function publicGoogleUser(user: GoogleUserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    status: user.status,
    emailVerifiedAt: user.email_verified_at,
    createdAt: user.created_at,
  };
}

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const email = value.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return email;
}

function normaliseDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const displayName = value.trim().replace(/\s+/g, ' ');
  if (displayName.length < 2 || displayName.length > 100) return null;
  return displayName;
}

function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128;
}

function validGoogleCredential(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 100 && value.length <= 10_000;
}

function validGoogleNonce(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 16 &&
    value.length <= 200 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

function googleClientId(): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  return clientId && clientId.length <= 500 ? clientId : null;
}

function sessionTtlSeconds(): number {
  const configured = Number(process.env.AUTH_SESSION_TTL_SECONDS);
  if (
    Number.isSafeInteger(configured) &&
    configured >= 300 &&
    configured <= 365 * 24 * 60 * 60
  ) {
    return configured;
  }
  return DEFAULT_SESSION_TTL_SECONDS;
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createSessionMaterial(request: FastifyRequest): AuthSessionMaterial {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionTtlSeconds() * 1000);
  const rawUserAgent = request.headers['user-agent'];

  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt,
    userAgent: typeof rawUserAgent === 'string' ? rawUserAgent.slice(0, 500) : null,
    ipAddress: request.ip || null,
  };
}

function databaseUnavailableReply() {
  return {
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'Authentication is temporarily unavailable.',
    },
  };
}

function invalidCredentialsReply() {
  return {
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'The email or password is incorrect.',
    },
  };
}

function accountExistsReply() {
  return {
    error: {
      code: 'ACCOUNT_EXISTS',
      message: 'An account with this email already exists.',
    },
  };
}

function accountUnavailableReply() {
  return {
    error: {
      code: 'ACCOUNT_UNAVAILABLE',
      message: 'This account is not currently available.',
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) return false;
    if ('code' in current && (current as { code?: unknown }).code === '23505') {
      return true;
    }
    if (!('cause' in current)) return false;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function selectGoogleIdentityUser(
  client: PoolClient,
  subject: string,
): Promise<GoogleUserRow | null> {
  const result = await client.query<GoogleUserRow>(
    `SELECT u.id, u.email, u.display_name, u.status,
            u.email_verified_at, u.created_at
       FROM auth_identities identity
       JOIN users u ON u.id = identity.user_id
      WHERE identity.provider = 'google'
        AND identity.provider_subject = $1
      FOR UPDATE`,
    [subject],
  );
  return result.rows[0] ?? null;
}

async function selectUserByEmail(
  client: PoolClient,
  email: string,
): Promise<GoogleUserRow | null> {
  const result = await client.query<GoogleUserRow>(
    `SELECT id, email, display_name, status, email_verified_at, created_at
       FROM users
      WHERE email = $1
      FOR UPDATE`,
    [email],
  );
  return result.rows[0] ?? null;
}

async function selectUserById(
  client: PoolClient,
  userId: string,
): Promise<GoogleUserRow> {
  const result = await client.query<GoogleUserRow>(
    `SELECT id, email, display_name, status, email_verified_at, created_at
       FROM users
      WHERE id = $1
      FOR UPDATE`,
    [userId],
  );
  const user = result.rows[0];
  if (!user) throw new Error('Google identity resolved to a missing user.');
  return user;
}

async function authenticateWithGoogle(
  database: DatabaseContext,
  request: FastifyRequest,
  credential: string,
  nonce: string,
  clientId: string,
): Promise<{ session: AuthSessionMaterial; user: GoogleUserRow }> {
  const identity = await verifyGoogleIdentityToken(credential, clientId, nonce);
  const placeholderPasswordHash = await hashPassword(
    randomBytes(48).toString('base64url'),
  );
  const session = createSessionMaterial(request);
  const client = await database.pool.connect();

  try {
    await client.query('BEGIN');
    let user = await selectGoogleIdentityUser(client, identity.subject);

    if (!user) {
      user = await selectUserByEmail(client, identity.email);
      if (!user) {
        const created = await client.query<GoogleUserRow>(
          `INSERT INTO users
             (email, display_name, password_hash, email_verified_at)
           VALUES ($1, $2, $3, now())
           RETURNING id, email, display_name, status,
                     email_verified_at, created_at`,
          [identity.email, identity.displayName, placeholderPasswordHash],
        );
        user = created.rows[0] ?? null;
      } else if (!user.email_verified_at) {
        const verified = await client.query<GoogleUserRow>(
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
      if (linkedUserId !== user.id) user = await selectUserById(client, linkedUserId);
    }

    if (user.status !== 'active') throw new GoogleAccountUnavailableError();

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
      [
        user.id,
        session.tokenHash,
        session.expiresAt,
        session.userAgent,
        session.ipAddress,
      ],
    );

    await client.query('COMMIT');
    return { session, user };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function registerAuthRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  const cookieName = getSessionCookieName();

  app.get('/api/v1/auth/providers', async (_request, reply) => {
    const clientId = googleClientId();
    reply.header('cache-control', 'no-store');
    return {
      providers: {
        email: { enabled: true },
        google: {
          enabled: Boolean(clientId),
          clientId,
        },
      },
    };
  });

  app.post<{ Body: RegisterBody }>('/api/v1/auth/register', async (request, reply) => {
    if (!database) return reply.code(503).send(databaseUnavailableReply());

    const email = normaliseEmail(request.body?.email);
    const displayName = normaliseDisplayName(request.body?.displayName);
    const password = request.body?.password;
    if (!email || !displayName || !validPassword(password)) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'Provide a valid email, a 2–100 character display name, and a 12–128 character password.',
        },
      });
    }

    const [existingUser] = await database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUser) return reply.code(409).send(accountExistsReply());

    const passwordHash = await hashPassword(password);
    const session = createSessionMaterial(request);

    try {
      const user = await database.db.transaction(async (transaction) => {
        const [createdUser] = await transaction
          .insert(users)
          .values({ email, displayName, passwordHash })
          .returning();
        if (!createdUser) throw new Error('User insertion returned no row.');

        await transaction.insert(userPlatformCapabilities).values({
          userId: createdUser.id,
          capability: 'broadcaster',
          grantedByUserId: createdUser.id,
        });
        await transaction.insert(authSessions).values({
          userId: createdUser.id,
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
        });
        return createdUser;
      });

      reply.header(
        'set-cookie',
        createSessionCookie(cookieName, session.token, session.expiresAt),
      );
      return reply.code(201).send({ user: publicUser(user) });
    } catch (error) {
      if (isUniqueViolation(error)) return reply.code(409).send(accountExistsReply());
      request.log.error({ error }, 'Failed to register user');
      return reply.code(500).send({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'The account could not be created.',
        },
      });
    }
  });

  app.post<{ Body: LoginBody }>('/api/v1/auth/login', async (request, reply) => {
    if (!database) return reply.code(503).send(databaseUnavailableReply());

    const email = normaliseEmail(request.body?.email);
    const password = request.body?.password;
    if (!email || !validPassword(password)) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Provide a valid email and password.',
        },
      });
    }

    const [user] = await database.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const passwordMatches = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches) return reply.code(401).send(invalidCredentialsReply());
    if (user.status !== 'active') return reply.code(403).send(accountUnavailableReply());

    const session = createSessionMaterial(request);
    await database.db.insert(authSessions).values({
      userId: user.id,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    });

    reply.header(
      'set-cookie',
      createSessionCookie(cookieName, session.token, session.expiresAt),
    );
    return reply.send({ user: publicUser(user) });
  });

  app.post<{ Body: GoogleLoginBody }>(
    '/api/v1/auth/google',
    async (request, reply) => {
      if (!database) return reply.code(503).send(databaseUnavailableReply());
      const clientId = googleClientId();
      if (!clientId) {
        return reply.code(503).send({
          error: {
            code: 'GOOGLE_AUTH_NOT_CONFIGURED',
            message: 'Google sign-in is not configured for this DigiStream environment.',
          },
        });
      }

      const credential = request.body?.credential;
      const nonce = request.body?.nonce;
      if (!validGoogleCredential(credential) || !validGoogleNonce(nonce)) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Provide a valid Google identity credential.',
          },
        });
      }

      try {
        const result = await authenticateWithGoogle(
          database,
          request,
          credential,
          nonce,
          clientId,
        );
        reply.header(
          'set-cookie',
          createSessionCookie(
            cookieName,
            result.session.token,
            result.session.expiresAt,
          ),
        );
        return reply.send({ user: publicGoogleUser(result.user) });
      } catch (error) {
        if (error instanceof GoogleAccountUnavailableError) {
          return reply.code(403).send(accountUnavailableReply());
        }
        request.log.warn({ error }, 'Google authentication failed');
        return reply.code(401).send({
          error: {
            code: 'GOOGLE_IDENTITY_INVALID',
            message: 'Google could not verify this sign-in. Please try again.',
          },
        });
      }
    },
  );

  app.get('/api/v1/auth/me', async (request, reply) => {
    if (!database) return reply.code(503).send(databaseUnavailableReply());

    const token = readCookie(request.headers.cookie, cookieName);
    if (!token || token.length > 200) {
      return reply.code(401).send({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Sign in to continue.',
        },
      });
    }

    const tokenHash = hashSessionToken(token);
    const [result] = await database.db
      .select({
        sessionId: authSessions.id,
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        passwordHash: users.passwordHash,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(authSessions)
      .innerJoin(users, eq(authSessions.userId, users.id))
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
          eq(users.status, 'active'),
        ),
      )
      .limit(1);

    if (!result) {
      reply.header('set-cookie', clearSessionCookie(cookieName));
      return reply.code(401).send({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Your session is invalid or has expired.',
        },
      });
    }

    await database.db
      .update(authSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(authSessions.id, result.sessionId));
    return reply.send({ user: publicUser(result) });
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    if (!database) return reply.code(503).send(databaseUnavailableReply());

    const token = readCookie(request.headers.cookie, cookieName);
    if (token && token.length <= 200) {
      await database.db
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(authSessions.tokenHash, hashSessionToken(token)),
            isNull(authSessions.revokedAt),
          ),
        );
    }

    reply.header('set-cookie', clearSessionCookie(cookieName));
    return reply.code(204).send();
  });
}
