import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { persistNotificationBeforeDelivery } from '../notifications/notifications.repository.js';
import type { RealtimeHub } from '../realtime/realtime-hub.js';
import { broadcastRoom, userRoom } from '../realtime/realtime-rooms.js';
import {
  reportBroadcastChatMessage,
  updateBroadcastChatSettings,
  updateBroadcastChatUserRestriction,
  type ReportChatMessageBody,
  type UpdateChatSettingsBody,
  type UpdateChatUserRestrictionBody,
} from './broadcast-chat-moderation.service.js';
import {
  resolveMemberBroadcastChat,
  resolvePublicBroadcastChat,
} from './broadcast-chat.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Live chat is temporarily unavailable.');
  }
  return database;
}

async function requireUser(request: FastifyRequest, database: DatabaseContext) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to use live chat.');
  }
  return user;
}

export function registerBroadcastChatModerationRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  publisher: Pick<RealtimeHub, 'publish'> | null,
): void {
  app.patch<{
    Params: { organisationId: string; broadcastId: string };
    Body: UpdateChatSettingsBody;
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/chat/moderation',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const result = await updateBroadcastChatSettings(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
        request.body ?? {},
      );
      const room = broadcastRoom(request.params.broadcastId);
      publisher?.publish(room.key, {
        type: 'chat.moderation.updated',
        room,
        settings: result.settings,
      });
      reply.header('cache-control', 'no-store');
      return result;
    },
  );

  app.put<{
    Params: { organisationId: string; broadcastId: string; userId: string };
    Body: UpdateChatUserRestrictionBody;
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/chat/moderation/users/:userId',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const result = await updateBroadcastChatUserRestriction(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
        request.params.userId,
        request.body ?? {},
      );
      const notification = await persistNotificationBeforeDelivery(context.db, {
        userId: request.params.userId,
        type: 'chat.moderation.updated',
        title: 'Live chat moderation updated',
        body: result.restriction.blocked
          ? 'Your access to this live chat has been restricted.'
          : result.restriction.mutedUntil
            ? 'You have been temporarily muted in this live chat.'
            : 'Your live chat moderation status has been updated.',
        metadata: {
          organisationId: request.params.organisationId,
          broadcastId: request.params.broadcastId,
          restriction: result.restriction,
        },
      });
      const room = userRoom(request.params.userId);
      publisher?.publish(room.key, {
        type: 'notification.created',
        room,
        notification,
      });
      publisher?.publish(room.key, {
        type: 'chat.user.moderation.updated',
        room,
        restriction: result.restriction,
      });
      reply.header('cache-control', 'no-store');
      return result;
    },
  );

  app.post<{
    Params: {
      organisationSlug: string;
      channelSlug: string;
      broadcastSlug: string;
      messageId: string;
    };
    Body: ReportChatMessageBody;
  }>(
    '/api/v1/broadcasts/:organisationSlug/:channelSlug/:broadcastSlug/chat/messages/:messageId/report',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const chat = await resolvePublicBroadcastChat(
        context.db,
        request.params.organisationSlug,
        request.params.channelSlug,
        request.params.broadcastSlug,
      );
      const result = await reportBroadcastChatMessage(
        context.db,
        chat,
        user.id,
        request.params.messageId,
        request.body ?? {},
      );
      reply.header('cache-control', 'no-store');
      return reply.code(result.replayed ? 200 : 201).send(result);
    },
  );

  app.post<{
    Params: { organisationId: string; broadcastId: string; messageId: string };
    Body: ReportChatMessageBody;
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/chat/messages/:messageId/report',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const chat = await resolveMemberBroadcastChat(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
      );
      const result = await reportBroadcastChatMessage(
        context.db,
        chat,
        user.id,
        request.params.messageId,
        request.body ?? {},
      );
      reply.header('cache-control', 'no-store');
      return reply.code(result.replayed ? 200 : 201).send(result);
    },
  );
}
