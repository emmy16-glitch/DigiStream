import type { DatabaseContext } from '../../db/client.js';
import { authenticateSessionCookie } from '../../auth/session-auth.js';
import {
  findOwnedSession,
  listActiveSessions,
  revokeOwnedSession,
} from './session-management.repository.js';

export type SessionListItem = {
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  userAgent: string | null;
  current: boolean;
};

export type SessionServiceFailure =
  | { code: 'AUTHENTICATION_REQUIRED' }
  | { code: 'SESSION_NOT_FOUND' }
  | { code: 'CURRENT_SESSION_REQUIRES_LOGOUT' };

export type SessionListResult =
  | { ok: true; sessions: SessionListItem[] }
  | { ok: false; failure: SessionServiceFailure };

export type SessionRevokeResult =
  | { ok: true }
  | { ok: false; failure: SessionServiceFailure };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listUserSessions(
  database: DatabaseContext,
  cookieHeader: string | undefined,
  now = new Date(),
): Promise<SessionListResult> {
  const authenticated = await authenticateSessionCookie(database.db, cookieHeader);
  if (!authenticated) {
    return { ok: false, failure: { code: 'AUTHENTICATION_REQUIRED' } };
  }

  const sessions = await listActiveSessions(database.db, authenticated.userId, now);
  return {
    ok: true,
    sessions: sessions.map((session) => ({
      ...session,
      current: session.id === authenticated.sessionId,
    })),
  };
}

export async function revokeUserSession(
  database: DatabaseContext,
  cookieHeader: string | undefined,
  sessionId: string,
  now = new Date(),
): Promise<SessionRevokeResult> {
  const authenticated = await authenticateSessionCookie(database.db, cookieHeader);
  if (!authenticated) {
    return { ok: false, failure: { code: 'AUTHENTICATION_REQUIRED' } };
  }

  if (!UUID_PATTERN.test(sessionId)) {
    return { ok: false, failure: { code: 'SESSION_NOT_FOUND' } };
  }

  const ownedSession = await findOwnedSession(
    database.db,
    sessionId,
    authenticated.userId,
  );
  if (!ownedSession) {
    return { ok: false, failure: { code: 'SESSION_NOT_FOUND' } };
  }

  if (ownedSession.id === authenticated.sessionId) {
    return {
      ok: false,
      failure: { code: 'CURRENT_SESSION_REQUIRES_LOGOUT' },
    };
  }

  if (!ownedSession.revokedAt) {
    await revokeOwnedSession(database.db, ownedSession.id, authenticated.userId, now);
  }

  return { ok: true };
}
