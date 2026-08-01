import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { ObjectStorage } from '../storage/object-storage.js';
import {
  getRecordingRetention,
  manageRecordingRetention,
  reconcileRecordingRetention,
  type RecordingRetentionBody,
  type RecordingRetentionReconcileBody,
} from './recording-retention.service.js';

export type RecordingRetentionRouteOptions = {
  objectStorage: ObjectStorage | null;
};

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Recording retention controls are temporarily unavailable.',
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

async function requireUser(
  request: FastifyRequest,
  database: DatabaseContext,
) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.');
  }
  return user;
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

export function registerRecordingRetentionRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  mediaControlSecret: string | undefined,
  options: RecordingRetentionRouteOptions,
): void {
  app.get<{
    Params: { organisationId: string; recordingId: string };
  }>(
    '/api/v1/organisations/:organisationId/recordings/:recordingId/retention',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        retention: await getRecordingRetention(
          context,
          request.params.organisationId,
          request.params.recordingId,
          user.id,
        ),
      };
    },
  );

  app.patch<{
    Params: { organisationId: string; recordingId: string };
    Body: RecordingRetentionBody;
  }>(
    '/api/v1/organisations/:organisationId/recordings/:recordingId/retention',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        retention: await manageRecordingRetention(
          context,
          request.params.organisationId,
          request.params.recordingId,
          user.id,
          request.body ?? {},
        ),
      };
    },
  );

  app.post<{
    Headers: { 'x-digistream-media-secret'?: string };
    Body: RecordingRetentionReconcileBody;
  }>('/api/v1/internal/recording-retention/reconcile', async (request) => {
    requireMediaSecret(
      request.headers['x-digistream-media-secret'],
      mediaControlSecret,
    );
    const context = requireDatabase(database);
    return reconcileRecordingRetention(
      context,
      requireObjectStorage(options.objectStorage),
      request.body ?? {},
    );
  });
}
