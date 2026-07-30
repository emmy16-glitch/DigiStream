import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { ContributionProvider } from '../media/contribution-provider.js';
import {
  confirmBroadcastContributionReady,
  issueBroadcastContributionCredential,
  type ContributionCredentialBody,
  type ContributionReadyBody,
} from './broadcast-contribution.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Live contribution access is temporarily unavailable.',
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

function requireProvider(provider: ContributionProvider | null): ContributionProvider {
  if (!provider) {
    throw new ApiError(
      503,
      'LIVEKIT_NOT_CONFIGURED',
      'Live contribution access is not configured.',
    );
  }
  return provider;
}

export function registerBroadcastContributionRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  provider: ContributionProvider | null,
): void {
  app.post<{
    Params: { organisationId: string; broadcastId: string };
    Body: ContributionCredentialBody;
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/contribution-token',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const credential = await issueBroadcastContributionCredential(
        context.db,
        requireProvider(provider),
        request.params.organisationId,
        request.params.broadcastId,
        user,
        request.body ?? {},
      );

      reply.header('cache-control', 'no-store');
      reply.header('pragma', 'no-cache');
      return {
        credential: {
          ...credential,
          expiresAt: credential.expiresAt.toISOString(),
        },
      };
    },
  );

  app.post<{
    Params: { organisationId: string; broadcastId: string };
    Body: ContributionReadyBody;
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/contribution/ready',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const contribution = await confirmBroadcastContributionReady(
        context.db,
        requireProvider(provider),
        request.params.organisationId,
        request.params.broadcastId,
        user,
        request.body ?? {},
      );

      reply.header('cache-control', 'no-store');
      return {
        contribution: {
          ...contribution,
          broadcast: {
            ...contribution.broadcast,
            contributionReadyAt:
              contribution.broadcast.contributionReadyAt?.toISOString() ?? null,
          },
        },
      };
    },
  );
}
