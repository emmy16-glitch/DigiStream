import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { DatabaseContext } from '../db/client.js';
import { authSessions, users, type User } from '../db/schema.js';
import {
  clearSessionCookie,
  createSessionCookie,
  getSessionCookieName,
  readCookie,
} from './cookies.js';
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

type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  status: User['status'];
  emailVerifiedAt: Date | null;
  createdAt: Date;
};

type AuthSessionMaterial = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
};

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

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

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
  if (typeof value !== 'string') {
    return null;
  }

  const displayName = value.trim().replace(/\s+/g, ' ');
  if (displayName.length < 2 || displayName.length > 100) {
    return null;
  }

  return displayName;
}

function validPassword(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length >= 12 && value.length <= 128
  );
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

function createSessionMaterial(
  request: FastifyRequest,
): AuthSessionMaterial {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionTtlSeconds() * 1000);
  const rawUserAgent = request.headers['user-agent'];

  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt,
    userAgent:
      typeof rawUserAgent === 'string' ? rawUserAgent.slice(0, 500) : null,
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

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

export function registerAuthRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  const cookieName = getSessionCookieName();

  app.post<{ Body: RegisterBody }>('/api/v1/auth/register', async (request, reply) => {
    if (!database) {
      return reply.code(503).send(databaseUnavailableReply());
    }

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

    const passwordHash = await hashPassword(password);
    const session = createSessionMaterial(request);

    try {
      const user = await database.db.transaction(async (transaction) => {
        const [createdUser] = await transaction
          .insert(users)
          .values({
            email,
            displayName,
            passwordHash,
          })
          .returning();

        if (!createdUser) {
          throw new Error('User insertion returned no row.');
        }

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
      if (isUniqueViolation(error)) {
        return reply.code(409).send({
          error: {
            code: 'ACCOUNT_EXISTS',
            message: 'An account with this email already exists.',
          },
        });
      }

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
    if (!database) {
      return reply.code(503).send(databaseUnavailableReply());
    }

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

    if (!user || !passwordMatches) {
      return reply.code(401).send(invalidCredentialsReply());
    }

    if (user.status !== 'active') {
      return reply.code(403).send({
        error: {
          code: 'ACCOUNT_UNAVAILABLE',
          message: 'This account is not currently available.',
        },
      });
    }

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

  app.get('/api/v1/auth/me', async (request, reply) => {
    if (!database) {
      return reply.code(503).send(databaseUnavailableReply());
    }

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
    if (!database) {
      return reply.code(503).send(databaseUnavailableReply());
    }

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
