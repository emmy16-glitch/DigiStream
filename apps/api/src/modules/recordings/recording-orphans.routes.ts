import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { ObjectStorage } from '../storage/object-storage.js';
import {
  listRecordingOrphans,
  reconcileRecordingOrphans,
  type RecordingOrphanReconcileBody,
} from './recording-orphans.service.js';

export type RecordingOrphanRouteOptions = {
  objectStorage: ObjectStorage | null;
};

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Recording orphan reconciliation is temporarily unavailable.',
    );
  }
  return database;
}

function requireObjectStorage(objectStorage: ObjectStorage | null): ObjectStorage {
  if (!objectStorage) {
    throw new ApiError(
      503,
      'OBJECT_STORAGE_UNAVAILABLE',
      'Recording storage is not configured.',
    );
  }
  return objectStorage;
}

function secretMatches(actual: unknown, expected: string | undefined): boolean {
  if (typeof actual !== 'string' || !expected) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function requireMediaSecret(actual: unknown, expected: string | undefined): void {
  if (!secretMatches(actual, expected)) {
    throw new ApiError(
      401,
      'MEDIA_CONTROL_AUTHENTICATION_REQUIRED',
      'Valid media-control authentication is required.',
    );
  }
}

export function registerRecordingOrphanRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  mediaControlSecret: string | undefined,
  options: RecordingOrphanRouteOptions,
): void {
  app.post<{
    Headers: { 'x-digistream-media-secret'?: string };
    Body: RecordingOrphanReconcileBody;
  }>('/api/v1/internal/recording-orphans/reconcile', async (request) => {
    requireMediaSecret(
      request.headers['x-digistream-media-secret'],
      mediaControlSecret,
    );
    return reconcileRecordingOrphans(
      requireDatabase(database),
      requireObjectStorage(options.objectStorage),
      request.body ?? {},
    );
  });

  app.get<{
    Headers: { 'x-digistream-media-secret'?: string };
    Querystring: { limit?: string };
  }>('/api/v1/internal/recording-orphans', async (request) => {
    requireMediaSecret(
      request.headers['x-digistream-media-secret'],
      mediaControlSecret,
    );
    return {
      orphans: await listRecordingOrphans(
        requireDatabase(database),
        request.query.limit,
      ),
    };
  });
}
