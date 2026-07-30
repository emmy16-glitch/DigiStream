import { createHash } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';
import type { DatabaseContext } from '../db/client.js';
import { authSessions, users, type User } from '../db/schema.js';
import { getSessionCookieName, readCookie } from './cookies.js';

export type AuthenticatedUser = User & {
  sessionId: string;
};

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function findAuthenticatedUser(
  request: FastifyRequest,
  database: DatabaseContext,
): Promise<AuthenticatedUser | null> {
  const token = readCookie(
    request.headers.cookie,
    getSessionCookieName(),
  );

  if (!token || token.length > 200) {
    return null;
  }

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
        eq(authSessions.tokenHash, hashSessionToken(token)),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, new Date()),
        eq(users.status, 'active'),
      ),
    )
    .limit(1);

  if (!result) {
    return null;
  }

  await database.db
    .update(authSessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(authSessions.id, result.sessionId));

  return result;
}
