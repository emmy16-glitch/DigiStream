import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  canAccessListenerLibraryBroadcast,
  clearListeningHistory,
  listListeningHistory,
  listSavedBroadcasts,
  recordListeningHistory,
  removeSavedBroadcast,
  saveBroadcast,
} from './listener-library.repository.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) throw new ApiError(503, 'DATABASE_NOT_CONFIGURED', 'Database is not configured.');
  return database;
}

async function requireUser(request: FastifyRequest, database: DatabaseContext) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
  return user;
}

function noStore(reply: FastifyReply): void {
  reply.header('cache-control', 'no-store');
}

function parseLimit(value: unknown): number {
  if (value === undefined) return 50;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ApiError(400, 'INVALID_LIMIT', 'limit must be an integer from 1 to 100.');
  }
  return parsed;
}

async function requireAccessibleBroadcast(
  database: DatabaseContext,
  userId: string,
  broadcastId: string,
): Promise<void> {
  if (!(await canAccessListenerLibraryBroadcast(database.pool, userId, broadcastId))) {
    throw new ApiError(404, 'BROADCAST_NOT_FOUND', 'Broadcast not found.');
  }
}

export function registerListenerLibraryRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.put<{ Params: { broadcastId: string } }>(
    '/api/v1/me/saved-broadcasts/:broadcastId',
    async (request, reply) => {
      const db = requireDatabase(database);
      const user = await requireUser(request, db);
      await requireAccessibleBroadcast(db, user.id, request.params.broadcastId);
      const savedAt = await saveBroadcast(db.pool, user.id, request.params.broadcastId);
      noStore(reply);
      return { saved: true, broadcastId: request.params.broadcastId, savedAt };
    },
  );

  app.delete<{ Params: { broadcastId: string } }>(
    '/api/v1/me/saved-broadcasts/:broadcastId',
    async (request, reply) => {
      const db = requireDatabase(database);
      const user = await requireUser(request, db);
      await removeSavedBroadcast(db.pool, user.id, request.params.broadcastId);
      noStore(reply);
      return { saved: false, broadcastId: request.params.broadcastId };
    },
  );

  app.get<{ Querystring: { limit?: string } }>(
    '/api/v1/me/saved-broadcasts',
    async (request, reply) => {
      const db = requireDatabase(database);
      const user = await requireUser(request, db);
      const items = await listSavedBroadcasts(db.pool, user.id, parseLimit(request.query.limit));
      noStore(reply);
      return { broadcasts: items };
    },
  );

  app.put<{ Params: { broadcastId: string } }>(
    '/api/v1/me/listening-history/:broadcastId',
    async (request, reply) => {
      const db = requireDatabase(database);
      const user = await requireUser(request, db);
      await requireAccessibleBroadcast(db, user.id, request.params.broadcastId);
      const lastListenedAt = await recordListeningHistory(db.pool, user.id, request.params.broadcastId);
      noStore(reply);
      return { broadcastId: request.params.broadcastId, lastListenedAt };
    },
  );

  app.get<{ Querystring: { limit?: string } }>(
    '/api/v1/me/listening-history',
    async (request, reply) => {
      const db = requireDatabase(database);
      const user = await requireUser(request, db);
      const items = await listListeningHistory(db.pool, user.id, parseLimit(request.query.limit));
      noStore(reply);
      return { broadcasts: items };
    },
  );

  app.delete('/api/v1/me/listening-history', async (request, reply) => {
    const db = requireDatabase(database);
    const user = await requireUser(request, db);
    await clearListeningHistory(db.pool, user.id);
    noStore(reply);
    return reply.code(204).send();
  });
}
