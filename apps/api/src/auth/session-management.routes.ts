import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { DatabaseContext } from '../db/client.js';
import { authSessions } from '../db/schema.js';
import { authenticateSessionCookie } from './session-auth.js';

type SessionParams = {
  sessionId: string;
};

function databaseUnavailableReply() {
  return {
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'Session management is temporarily unavailable.',
    },
  };
}

function authenticationRequiredReply() {
  return {
    error: {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Sign in to manage your sessions.',
    },
  };
}

function sessionNotFoundReply() {
  return {
    error: {
      code: 'SESSION_NOT_FOUND',
      message: 'That session is not available.',
    },
  };
}

export function registerSessionManagementRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.get('/api/v1/auth/sessions', async (request, reply) => {
    if (!database) return reply.code(503).send(databaseUnavailableReply());

    const authenticated = await authenticateSessionCookie(
      database.db,
      request.headers.cookie,
    );
    if (!authenticated) {
      return reply.code(401).send(authenticationRequiredReply());
    }

    const now = new Date();
    const sessions = await database.db
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
          eq(authSessions.userId, authenticated.userId),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
        ),
      )
      .orderBy(desc(authSessions.lastUsedAt), desc(authSessions.createdAt));

    reply.header('cache-control', 'no-store');
    return reply.send({
      sessions: sessions.map((session) => ({
        ...session,
        current: session.id === authenticated.sessionId,
      })),
    });
  });

  app.delete<{ Params: SessionParams }>(
    '/api/v1/auth/sessions/:sessionId',
    async (request, reply) => {
      if (!database) return reply.code(503).send(databaseUnavailableReply());

      const authenticated = await authenticateSessionCookie(
        database.db,
        request.headers.cookie,
      );
      if (!authenticated) {
        return reply.code(401).send(authenticationRequiredReply());
      }

      const sessionId = request.params.sessionId;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
        return reply.code(404).send(sessionNotFoundReply());
      }

      const [ownedSession] = await database.db
        .select({
          id: authSessions.id,
          revokedAt: authSessions.revokedAt,
        })
        .from(authSessions)
        .where(
          and(
            eq(authSessions.id, sessionId),
            eq(authSessions.userId, authenticated.userId),
          ),
        )
        .limit(1);

      if (!ownedSession) return reply.code(404).send(sessionNotFoundReply());

      if (ownedSession.id === authenticated.sessionId) {
        return reply.code(409).send({
          error: {
            code: 'CURRENT_SESSION_REQUIRES_LOGOUT',
            message: 'Use Sign out to end the session you are currently using.',
          },
        });
      }

      if (!ownedSession.revokedAt) {
        await database.db
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(authSessions.id, ownedSession.id),
              eq(authSessions.userId, authenticated.userId),
              isNull(authSessions.revokedAt),
            ),
          );
      }

      return reply.code(204).send();
    },
  );
}
