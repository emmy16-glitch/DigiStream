import { createHash } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../db/client.js';
import { authSessions, users } from '../db/schema.js';
import { getSessionCookieName, readCookie } from './cookies.js';

export type AuthenticatedSession = {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string;
  expiresAt: Date;
};

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function authenticateSessionCookie(
  db: DigiStreamDatabase,
  cookieHeader: string | undefined,
  options: { touch?: boolean; now?: Date } = {},
): Promise<AuthenticatedSession | null> {
  const token = readCookie(cookieHeader, getSessionCookieName());
  if (!token || token.length > 200) return null;

  const now = options.now ?? new Date();
  const [result] = await db
    .select({
      sessionId: authSessions.id,
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      expiresAt: authSessions.expiresAt,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.tokenHash, hashSessionToken(token)),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, now),
        eq(users.status, 'active'),
      ),
    )
    .limit(1);

  if (!result) return null;

  if (options.touch !== false) {
    await db
      .update(authSessions)
      .set({ lastUsedAt: now })
      .where(eq(authSessions.id, result.sessionId));
  }

  return result;
}

export async function sessionRemainsActive(
  db: DigiStreamDatabase,
  sessionId: string,
  userId: string,
  now = new Date(),
): Promise<boolean> {
  const [result] = await db
    .select({ sessionId: authSessions.id })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.id, sessionId),
        eq(authSessions.userId, userId),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, now),
        eq(users.status, 'active'),
      ),
    )
    .limit(1);

  return Boolean(result);
}
