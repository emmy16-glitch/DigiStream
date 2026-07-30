import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  getOwnProfile,
  getPublicProfile,
  grantCapability,
  parsePlatformCapability,
  revokeCapability,
  updateOwnProfile,
  type SaveProfileBody,
} from './profiles.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Profiles are temporarily unavailable.',
    );
  }

  return database;
}

async function requireUser(
  request: FastifyRequest,
  database: DatabaseContext,
) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) {
    throw new ApiError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Sign in to continue.',
    );
  }

  return user;
}

export function registerProfileRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.get('/api/v1/profile', async (request) => {
    const context = requireDatabase(database);
    const user = await requireUser(request, context);
    return { profile: await getOwnProfile(context.db, user.id) };
  });

  app.put<{ Body: SaveProfileBody }>(
    '/api/v1/profile',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        profile: await updateOwnProfile(
          context.db,
          user.id,
          request.body ?? {},
        ),
      };
    },
  );

  app.get<{ Params: { username: string } }>(
    '/api/v1/profiles/:username',
    async (request) => {
      const context = requireDatabase(database);
      return {
        profile: await getPublicProfile(
          context.db,
          request.params.username,
        ),
      };
    },
  );

  app.put<{
    Params: { userId: string; capability: string };
  }>(
    '/api/v1/admin/users/:userId/capabilities/:capability',
    async (request) => {
      const context = requireDatabase(database);
      const actor = await requireUser(request, context);
      const capability = parsePlatformCapability(request.params.capability);

      if (!capability) {
        throw new ApiError(
          400,
          'INVALID_CAPABILITY',
          'The platform capability is not supported.',
        );
      }

      return {
        capability: await grantCapability(
          context.db,
          actor.id,
          request.params.userId,
          capability,
        ),
      };
    },
  );

  app.delete<{
    Params: { userId: string; capability: string };
  }>(
    '/api/v1/admin/users/:userId/capabilities/:capability',
    async (request) => {
      const context = requireDatabase(database);
      const actor = await requireUser(request, context);
      const capability = parsePlatformCapability(request.params.capability);

      if (!capability) {
        throw new ApiError(
          400,
          'INVALID_CAPABILITY',
          'The platform capability is not supported.',
        );
      }

      return {
        capability: await revokeCapability(
          context.db,
          actor.id,
          request.params.userId,
          capability,
        ),
      };
    },
  );
}
