import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { authSessions } from '../../db/schema.js';

export type ActiveSessionRecord = {
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  userAgent: string | null;
};

export type OwnedSessionRecord = {
  id: string;
  revokedAt: Date | null;
};

export async function listActiveSessions(
  db: DigiStreamDatabase,
  userId: string,
  now: Date,
): Promise<ActiveSessionRecord[]> {
  return db
    .select({
      id: authSessions.id,
      createdAt: authSessions.createdAt,
      lastUsedAt: authSessions.lastUsedAt,
      expiresAt: authSessions.expiresAt,
      userAgent: authSessions.userAgent,
    })
    .from(authSessions)
    .where(
      and(
        eq(authSessions.userId, userId),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, now),
      ),
    )
    .orderBy(desc(authSessions.lastUsedAt), desc(authSessions.createdAt));
}

export async function findOwnedSession(
  db: DigiStreamDatabase,
  sessionId: string,
  userId: string,
): Promise<OwnedSessionRecord | null> {
  const [session] = await db
    .select({
      id: authSessions.id,
      revokedAt: authSessions.revokedAt,
    })
    .from(authSessions)
    .where(
      and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)),
    )
    .limit(1);

  return session ?? null;
}

export async function revokeOwnedSession(
  db: DigiStreamDatabase,
  sessionId: string,
  userId: string,
  revokedAt: Date,
): Promise<void> {
  await db
    .update(authSessions)
    .set({ revokedAt })
    .where(
      and(
        eq(authSessions.id, sessionId),
        eq(authSessions.userId, userId),
        isNull(authSessions.revokedAt),
      ),
    );
}
