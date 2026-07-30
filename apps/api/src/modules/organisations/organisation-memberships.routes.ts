import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  acceptOrganisationInvitation,
  createOrganisationInvitation,
  getOrganisationMembers,
  getPendingOrganisationInvitations,
  removeOrganisationMember,
  revokeOrganisationInvitation,
  updateOrganisationMemberRole,
  type CreateInvitationBody,
  type UpdateMemberRoleBody,
} from './organisation-memberships.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Organisation memberships are temporarily unavailable.',
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

export function registerOrganisationMembershipRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.get<{ Params: { organisationId: string } }>(
    '/api/v1/organisations/:organisationId/members',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        members: await getOrganisationMembers(
          context.db,
          user.id,
          request.params.organisationId,
        ),
      };
    },
  );

  app.post<{
    Params: { organisationId: string };
    Body: CreateInvitationBody;
  }>(
    '/api/v1/organisations/:organisationId/invitations',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const invitation = await createOrganisationInvitation(
        context.db,
        user.id,
        request.params.organisationId,
        request.body ?? {},
      );

      return reply.code(201).send({ invitation });
    },
  );

  app.get<{ Params: { organisationId: string } }>(
    '/api/v1/organisations/:organisationId/invitations',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        invitations: await getPendingOrganisationInvitations(
          context.db,
          user.id,
          request.params.organisationId,
        ),
      };
    },
  );

  app.delete<{
    Params: { organisationId: string; invitationId: string };
  }>(
    '/api/v1/organisations/:organisationId/invitations/:invitationId',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      await revokeOrganisationInvitation(
        context.db,
        user.id,
        request.params.organisationId,
        request.params.invitationId,
      );
      return reply.code(204).send();
    },
  );

  app.post<{ Params: { token: string } }>(
    '/api/v1/organisation-invitations/:token/accept',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        membership: await acceptOrganisationInvitation(
          context.db,
          user.id,
          user.email,
          request.params.token,
        ),
      };
    },
  );

  app.patch<{
    Params: { organisationId: string; userId: string };
    Body: UpdateMemberRoleBody;
  }>(
    '/api/v1/organisations/:organisationId/members/:userId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        member: await updateOrganisationMemberRole(
          context.db,
          user.id,
          request.params.organisationId,
          request.params.userId,
          request.body ?? {},
        ),
      };
    },
  );

  app.delete<{
    Params: { organisationId: string; userId: string };
  }>(
    '/api/v1/organisations/:organisationId/members/:userId',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      await removeOrganisationMember(
        context.db,
        user.id,
        request.params.organisationId,
        request.params.userId,
      );
      return reply.code(204).send();
    },
  );
}
