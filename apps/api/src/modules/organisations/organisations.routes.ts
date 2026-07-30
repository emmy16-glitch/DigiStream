import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  createOrganisation,
  getOrganisation,
  listOrganisations,
  updateOrganisation,
  type CreateOrganisationBody,
  type UpdateOrganisationBody,
} from './organisations.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Organisations are temporarily unavailable.',
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

export function registerOrganisationRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.post<{ Body: CreateOrganisationBody }>(
    '/api/v1/organisations',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const organisation = await createOrganisation(
        context.db,
        user.id,
        request.body ?? {},
      );

      return reply.code(201).send({ organisation });
    },
  );

  app.get('/api/v1/organisations', async (request) => {
    const context = requireDatabase(database);
    const user = await requireUser(request, context);
    return {
      organisations: await listOrganisations(context.db, user.id),
    };
  });

  app.get<{ Params: { organisationId: string } }>(
    '/api/v1/organisations/:organisationId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        organisation: await getOrganisation(
          context.db,
          user.id,
          request.params.organisationId,
        ),
      };
    },
  );

  app.patch<{
    Params: { organisationId: string };
    Body: UpdateOrganisationBody;
  }>(
    '/api/v1/organisations/:organisationId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        organisation: await updateOrganisation(
          context.db,
          user.id,
          request.params.organisationId,
          request.body ?? {},
        ),
      };
    },
  );
}
