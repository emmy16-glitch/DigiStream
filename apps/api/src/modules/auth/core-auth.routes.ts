import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { DatabaseContext } from '../../db/client.js';
import {
  clearSessionCookie,
  createSessionCookie,
  getSessionCookieName,
  readCookie,
} from '../../auth/cookies.js';
import { registerPlatformAdministrationRoutes } from '../administration/platform-administration.routes.js';
import {
  CoreAuthError,
  getCurrentUser,
  googleClientId,
  loginWithEmail,
  loginWithGoogle,
  logoutCurrentSession,
  registerWithEmail,
  type RequestMetadata,
} from './core-auth.service.js';

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

function databaseUnavailableReply() {
  return {
    error: {
      code: 'DATABASE_UNAVAILABLE',
      message: 'Authentication is temporarily unavailable.',
    },
  };
}

function metadataFromRequest(request: FastifyRequest): RequestMetadata {
  const userAgent = request.headers['user-agent'];
  return {
    userAgent: typeof userAgent === 'string' ? userAgent : null,
    ipAddress: request.ip || null,
  };
}

function sendCoreAuthError(reply: FastifyReply, error: CoreAuthError) {
  return reply.code(error.statusCode).send({
    error: {
      code: error.code,
      message: error.message,
    },
  });
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
    try {
      const result = await registerWithEmail(database, request.body ?? {}, metadataFromRequest(request));
      reply.header(
        'set-cookie',
        createSessionCookie(cookieName, result.token, result.expiresAt),
      );
      return reply.code(201).send({ user: result.user });
    } catch (error) {
      if (error instanceof CoreAuthError) return sendCoreAuthError(reply, error);
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
    try {
      const result = await loginWithEmail(database, request.body ?? {}, metadataFromRequest(request));
      reply.header(
        'set-cookie',
        createSessionCookie(cookieName, result.token, result.expiresAt),
      );
      return reply.send({ user: result.user });
    } catch (error) {
      if (error instanceof CoreAuthError) return sendCoreAuthError(reply, error);
      request.log.error({ error }, 'Email authentication failed');
      return reply.code(500).send({
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Sign-in is temporarily unavailable.',
        },
      });
    }
  });

  app.post<{ Body: GoogleLoginBody }>('/api/v1/auth/google', async (request, reply) => {
    if (!database) return reply.code(503).send(databaseUnavailableReply());
    try {
      const result = await loginWithGoogle(database, request.body ?? {}, metadataFromRequest(request));
      reply.header(
        'set-cookie',
        createSessionCookie(cookieName, result.token, result.expiresAt),
      );
      return reply.send({ user: result.user });
    } catch (error) {
      if (error instanceof CoreAuthError) {
        if (error.code === 'GOOGLE_IDENTITY_INVALID') {
          request.log.warn({ code: error.code }, 'Google authentication failed');
        }
        return sendCoreAuthError(reply, error);
      }
      request.log.error({ error }, 'Google authentication failed');
      return reply.code(500).send({
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Sign-in is temporarily unavailable.',
        },
      });
    }
  });

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

    const user = await getCurrentUser(database, token);
    if (!user) {
      reply.header('set-cookie', clearSessionCookie(cookieName));
      return reply.code(401).send({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Your session is invalid or has expired.',
        },
      });
    }
    return reply.send({ user });
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    if (!database) return reply.code(503).send(databaseUnavailableReply());
    const token = readCookie(request.headers.cookie, cookieName);
    await logoutCurrentSession(database, token);
    reply.header('set-cookie', clearSessionCookie(cookieName));
    return reply.code(204).send();
  });

  registerPlatformAdministrationRoutes(app, database);
}
