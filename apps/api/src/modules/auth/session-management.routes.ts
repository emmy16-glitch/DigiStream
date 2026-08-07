import type { FastifyInstance, FastifyReply } from 'fastify';
import type { DatabaseContext } from '../../db/client.js';
import {
  listUserSessions,
  revokeUserSession,
  type SessionServiceFailure,
} from './session-management.service.js';

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

function sendFailure(reply: FastifyReply, failure: SessionServiceFailure) {
  if (failure.code === 'AUTHENTICATION_REQUIRED') {
    return reply.code(401).send({
      error: {
        code: failure.code,
        message: 'Sign in to manage your sessions.',
      },
    });
  }
  if (failure.code === 'CURRENT_SESSION_REQUIRES_LOGOUT') {
    return reply.code(409).send({
      error: {
        code: failure.code,
        message: 'Use Sign out to end the session you are currently using.',
      },
    });
  }
  return reply.code(404).send({
    error: {
      code: failure.code,
      message: 'That session is not available.',
    },
  });
}

export function registerSessionManagementRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.get('/api/v1/auth/sessions', async (request, reply) => {
    if (!database) return reply.code(503).send(databaseUnavailableReply());

    const result = await listUserSessions(database, request.headers.cookie);
    if (!result.ok) return sendFailure(reply, result.failure);

    reply.header('cache-control', 'no-store');
    return reply.send({ sessions: result.sessions });
  });

  app.delete<{ Params: SessionParams }>(
    '/api/v1/auth/sessions/:sessionId',
    async (request, reply) => {
      if (!database) return reply.code(503).send(databaseUnavailableReply());

      const result = await revokeUserSession(
        database,
        request.headers.cookie,
        request.params.sessionId,
      );
      if (!result.ok) return sendFailure(reply, result.failure);

      return reply.code(204).send();
    },
  );
}
