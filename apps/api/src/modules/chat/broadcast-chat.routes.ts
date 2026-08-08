import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { RealtimeHub } from '../realtime/realtime-hub.js';
import { broadcastRoom } from '../realtime/realtime-rooms.js';
import { registerBroadcastChatModerationRoutes } from './broadcast-chat-moderation.routes.js';
import {
  createBroadcastChatMessage,
  listBroadcastChatMessages,
  resolveMemberBroadcastChat,
  resolvePublicBroadcastChat,
  type CreateBroadcastChatMessageBody,
} from './broadcast-chat.service.js';

export type BroadcastChatPublisher = Pick<RealtimeHub, 'publish'>;

type HistoryQuery = {
  before?: string;
  limit?: string;
};

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Live chat is temporarily unavailable.',
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
      'Sign in to use live chat.',
    );
  }
  return user;
}

function noStore(reply: FastifyReply): void {
  reply.header('cache-control', 'no-store');
  reply.header('pragma', 'no-cache');
}

export function registerBroadcastChatRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  publisher: BroadcastChatPublisher | null,
): void {
  app.get<{
    Params: {
      organisationSlug: string;
      channelSlug: string;
      broadcastSlug: string;
    };
    Querystring: HistoryQuery;
  }>(
    '/api/v1/broadcasts/:organisationSlug/:channelSlug/:broadcastSlug/chat/messages',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const chat = await resolvePublicBroadcastChat(
        context.db,
        request.params.organisationSlug,
        request.params.channelSlug,
        request.params.broadcastSlug,
      );
      noStore(reply);
      return listBroadcastChatMessages(
        context.db,
        chat,
        user.id,
        request.query.before,
        request.query.limit,
      );
    },
  );

  app.post<{
    Params: {
      organisationSlug: string;
      channelSlug: string;
      broadcastSlug: string;
    };
    Body: CreateBroadcastChatMessageBody;
  }>(
    '/api/v1/broadcasts/:organisationSlug/:channelSlug/:broadcastSlug/chat/messages',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const chat = await resolvePublicBroadcastChat(
        context.db,
        request.params.organisationSlug,
        request.params.channelSlug,
        request.params.broadcastSlug,
      );
      const created = await createBroadcastChatMessage(
        context.db,
        chat,
        { id: user.id, displayName: user.displayName },
        request.body ?? {},
      );

      if (!created.replayed) {
        const room = broadcastRoom(chat.broadcastId);
        publisher?.publish(room.key, {
          type: 'chat.message.created',
          room,
          message: created.message,
        });
      }

      noStore(reply);
      return reply.code(created.replayed ? 200 : 201).send(created);
    },
  );

  app.get<{
    Params: { organisationId: string; broadcastId: string };
    Querystring: HistoryQuery;
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/chat/messages',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const chat = await resolveMemberBroadcastChat(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
      );
      noStore(reply);
      return listBroadcastChatMessages(
        context.db,
        chat,
        user.id,
        request.query.before,
        request.query.limit,
      );
    },
  );

  app.post<{
    Params: { organisationId: string; broadcastId: string };
    Body: CreateBroadcastChatMessageBody;
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/chat/messages',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const chat = await resolveMemberBroadcastChat(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
      );
      const created = await createBroadcastChatMessage(
        context.db,
        chat,
        { id: user.id, displayName: user.displayName },
        request.body ?? {},
      );

      if (!created.replayed) {
        const room = broadcastRoom(chat.broadcastId);
        publisher?.publish(room.key, {
          type: 'chat.message.created',
          room,
          message: created.message,
        });
      }

      noStore(reply);
      return reply.code(created.replayed ? 200 : 201).send(created);
    },
  );

  registerBroadcastChatModerationRoutes(app, database, publisher);
}
