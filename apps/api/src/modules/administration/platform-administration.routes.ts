import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  listAdministrativeUsers,
  updateAdministrativeUserStatus,
} from './platform-administration.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Platform administration is temporarily unavailable.',
    );
  }
  return database;
}

async function requireUser(request: FastifyRequest, database: DatabaseContext) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.');
  }
  return user;
}

export function registerPlatformAdministrationRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.get<{
    Querystring: { cursor?: string; limit?: string; status?: string };
  }>('/api/v1/admin/users', async (request, reply) => {
    const context = requireDatabase(database);
    const user = await requireUser(request, context);
    const page = await listAdministrativeUsers(context, user.id, request.query ?? {});
    return reply.header('cache-control', 'no-store').send(page);
  });

  app.patch<{
    Params: { userId: string };
    Body: { status?: unknown };
  }>('/api/v1/admin/users/:userId/status', async (request, reply) => {
    const context = requireDatabase(database);
    const user = await requireUser(request, context);
    const administeredUser = await updateAdministrativeUserStatus(
      context,
      user.id,
      request.params.userId,
      request.body ?? {},
    );
    return reply.header('cache-control', 'no-store').send({ user: administeredUser });
  });
}
