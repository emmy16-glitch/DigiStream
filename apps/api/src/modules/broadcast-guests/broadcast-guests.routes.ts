import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { BackstageProvider } from '../media/backstage-provider.js';
import type { ContributionProvider } from '../media/contribution-provider.js';
import {
  acceptGuestInvitation,
  admitGuestInvitation,
  createGuestInvitation,
  createPublicCallInRequest,
  decideCallInRequest,
  issueGuestContributionCredential,
  listBackstageParticipants,
  listCallInRequests,
  listGuestInvitations,
  muteBackstageGuest,
  removeBackstageGuest,
  revokeGuestInvitation,
  type AcceptGuestInvitationBody,
  type CreateCallInBody,
  type CreateGuestInvitationBody,
} from './broadcast-guests.service.js';
import type {
  CallInRequestDto,
  GuestInvitationDto,
} from './broadcast-guests.types.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Guest and backstage access is temporarily unavailable.',
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

function requireContributionProvider(
  provider: ContributionProvider | null,
): ContributionProvider {
  if (!provider) {
    throw new ApiError(
      503,
      'LIVEKIT_NOT_CONFIGURED',
      'Live guest contribution is not configured.',
    );
  }
  return provider;
}

function requireBackstageProvider(
  provider: BackstageProvider | null,
): BackstageProvider {
  if (!provider) {
    throw new ApiError(
      503,
      'LIVEKIT_NOT_CONFIGURED',
      'LiveKit backstage control is not configured.',
    );
  }
  return provider;
}

function serializeInvitation(invitation: GuestInvitationDto) {
  return {
    ...invitation,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    admittedAt: invitation.admittedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    sessionExpiresAt: invitation.sessionExpiresAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
  };
}

function serializeCallIn(callIn: CallInRequestDto) {
  return {
    ...callIn,
    decidedAt: callIn.decidedAt?.toISOString() ?? null,
    createdAt: callIn.createdAt.toISOString(),
    updatedAt: callIn.updatedAt.toISOString(),
  };
}

function noStore(reply: { header(name: string, value: string): unknown }): void {
  reply.header('cache-control', 'no-store');
  reply.header('pragma', 'no-cache');
}

export function registerBroadcastGuestRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  contributionProvider: ContributionProvider | null,
  backstageProvider: BackstageProvider | null,
): void {
  app.post<{
    Params: { organisationId: string; broadcastId: string };
    Body: CreateGuestInvitationBody;
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/guest-invitations',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const invitation = await createGuestInvitation(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
        request.body ?? {},
      );
      noStore(reply);
      return {
        invitation: {
          ...serializeInvitation(invitation),
          acceptanceToken: invitation.acceptanceToken,
        },
      };
    },
  );

  app.get<{
    Params: { organisationId: string; broadcastId: string };
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/guest-invitations',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const invitations = await listGuestInvitations(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
      );
      return { invitations: invitations.map(serializeInvitation) };
    },
  );

  app.post<{
    Params: { organisationId: string; broadcastId: string; invitationId: string };
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/guest-invitations/:invitationId/admit',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const invitation = await admitGuestInvitation(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        request.params.invitationId,
        user.id,
      );
      return { invitation: serializeInvitation(invitation) };
    },
  );

  app.delete<{
    Params: { organisationId: string; broadcastId: string; invitationId: string };
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/guest-invitations/:invitationId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const invitation = await revokeGuestInvitation(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        request.params.invitationId,
        user.id,
      );
      return { invitation: serializeInvitation(invitation) };
    },
  );

  app.post<{
    Params: { token: string };
    Body: AcceptGuestInvitationBody;
  }>('/api/v1/guest-invitations/:token/accept', async (request, reply) => {
    const context = requireDatabase(database);
    const session = await acceptGuestInvitation(
      context.db,
      request.params.token,
      request.body ?? {},
    );
    noStore(reply);
    return {
      guestSession: {
        ...session,
        expiresAt: session.expiresAt.toISOString(),
      },
    };
  });

  app.post('/api/v1/guest-contribution-token', async (request, reply) => {
    const context = requireDatabase(database);
    const header = request.headers['x-guest-session-token'];
    const rawSessionToken = Array.isArray(header) ? header[0] : header;
    if (!rawSessionToken) {
      throw new ApiError(
        401,
        'GUEST_SESSION_REQUIRED',
        'Provide the guest session token.',
      );
    }
    const credential = await issueGuestContributionCredential(
      context.db,
      requireContributionProvider(contributionProvider),
      rawSessionToken,
    );
    noStore(reply);
    return {
      credential: {
        ...credential,
        expiresAt: credential.expiresAt.toISOString(),
      },
    };
  });

  app.get<{
    Params: { organisationId: string; broadcastId: string };
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/backstage/participants',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const participants = await listBackstageParticipants(
        context.db,
        requireBackstageProvider(backstageProvider),
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
      );
      return { participants };
    },
  );

  app.post<{
    Params: {
      organisationId: string;
      broadcastId: string;
      participantIdentity: string;
    };
    Body: { muted?: unknown };
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/backstage/participants/:participantIdentity/mute',
    async (request) => {
      if (typeof request.body?.muted !== 'boolean') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'muted must be true or false.');
      }
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const participant = await muteBackstageGuest(
        context.db,
        requireBackstageProvider(backstageProvider),
        request.params.organisationId,
        request.params.broadcastId,
        request.params.participantIdentity,
        user.id,
        request.body.muted,
      );
      return { participant };
    },
  );

  app.delete<{
    Params: {
      organisationId: string;
      broadcastId: string;
      participantIdentity: string;
    };
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/backstage/participants/:participantIdentity',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      await removeBackstageGuest(
        context.db,
        requireBackstageProvider(backstageProvider),
        request.params.organisationId,
        request.params.broadcastId,
        request.params.participantIdentity,
        user.id,
      );
      return reply.code(204).send();
    },
  );

  app.post<{
    Params: {
      organisationSlug: string;
      channelSlug: string;
      broadcastSlug: string;
    };
    Body: CreateCallInBody;
  }>(
    '/api/v1/broadcasts/:organisationSlug/:channelSlug/:broadcastSlug/call-ins',
    async (request) => {
      const context = requireDatabase(database);
      const callIn = await createPublicCallInRequest(
        context.db,
        request.params.organisationSlug,
        request.params.channelSlug,
        request.params.broadcastSlug,
        request.body ?? {},
      );
      return { callIn: serializeCallIn(callIn) };
    },
  );

  app.get<{
    Params: { organisationId: string; broadcastId: string };
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/call-ins',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const callIns = await listCallInRequests(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
      );
      return { callIns: callIns.map(serializeCallIn) };
    },
  );

  for (const decision of ['approve', 'reject'] as const) {
    app.post<{
      Params: { organisationId: string; broadcastId: string; callInId: string };
    }>(
      `/api/v1/organisations/:organisationId/broadcasts/:broadcastId/call-ins/:callInId/${decision}`,
      async (request, reply) => {
        const context = requireDatabase(database);
        const user = await requireUser(request, context);
        const result = await decideCallInRequest(
          context.db,
          request.params.organisationId,
          request.params.broadcastId,
          request.params.callInId,
          user.id,
          decision === 'approve' ? 'approved' : 'rejected',
        );
        if (result.invitation) noStore(reply);
        return {
          callIn: serializeCallIn(result.callIn),
          invitation: result.invitation
            ? {
                ...serializeInvitation(result.invitation),
                acceptanceToken: result.invitation.acceptanceToken,
              }
            : null,
        };
      },
    );
  }
}
