import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  archiveInboxNotification,
  changeNotificationPreferences,
  listNotificationInbox,
  markInboxNotificationRead,
  readNotificationPreferences,
  type NotificationListQuery,
  type NotificationPreferenceBody,
} from './notifications.service.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Notifications are temporarily unavailable.',
    );
  }
  return database;
}

async function requireUser(request: FastifyRequest, database: DatabaseContext) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to manage your notifications.');
  }
  return user;
}

function noStore(reply: FastifyReply): void {
  reply.header('cache-control', 'no-store');
  reply.header('pragma', 'no-cache');
}

export function registerNotificationRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.get<{ Querystring: NotificationListQuery }>(
    '/api/v1/notifications',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      noStore(reply);
      return listNotificationInbox(context.db, user.id, request.query);
    },
  );

  app.put<{ Params: { notificationId: string } }>(
    '/api/v1/notifications/:notificationId/read',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      noStore(reply);
      return markInboxNotificationRead(
        context.db,
        user.id,
        request.params.notificationId,
      );
    },
  );

  app.delete<{ Params: { notificationId: string } }>(
    '/api/v1/notifications/:notificationId',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      noStore(reply);
      return archiveInboxNotification(
        context.db,
        user.id,
        request.params.notificationId,
      );
    },
  );

  app.get('/api/v1/notification-preferences', async (request, reply) => {
    const context = requireDatabase(database);
    const user = await requireUser(request, context);
    noStore(reply);
    return readNotificationPreferences(context.db, user.id);
  });

  app.patch<{ Body: NotificationPreferenceBody }>(
    '/api/v1/notification-preferences',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      noStore(reply);
      return changeNotificationPreferences(context.db, user.id, request.body ?? {});
    },
  );
}
