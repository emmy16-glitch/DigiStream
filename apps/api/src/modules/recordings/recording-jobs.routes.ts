import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { ObjectStorage } from '../storage/object-storage.js';
import {
  claimRecordingWork,
  failRecordingWork,
  heartbeatRecordingWork,
  reconcileRecordingWork,
  uploadClaimedRecordingArtifact,
  type RecordingJobClaimBody,
  type RecordingJobFailureBody,
  type RecordingJobLeaseBody,
  type RecordingJobReconcileBody,
} from './recording-jobs.service.js';

export type RecordingJobRouteOptions = {
  objectStorage: ObjectStorage | null;
  maxUploadBytes: number;
};

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Recording processing jobs are temporarily unavailable.',
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

export function registerRecordingJobRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  mediaControlSecret: string | undefined,
  options: RecordingJobRouteOptions,
): void {
  app.post<{
    Headers: { 'x-digistream-media-secret'?: string };
    Body: RecordingJobClaimBody;
  }>('/api/v1/internal/recording-jobs/claim', async (request) => {
    requireMediaSecret(
      request.headers['x-digistream-media-secret'],
      mediaControlSecret,
    );
    const context = requireDatabase(database);
    return claimRecordingWork(context.db, request.body ?? {});
  });

  app.post<{
    Headers: { 'x-digistream-media-secret'?: string };
    Body: RecordingJobReconcileBody;
  }>('/api/v1/internal/recording-jobs/reconcile', async (request) => {
    requireMediaSecret(
      request.headers['x-digistream-media-secret'],
      mediaControlSecret,
    );
    const context = requireDatabase(database);
    return reconcileRecordingWork(context.db, request.body ?? {});
  });

  app.post<{
    Params: { jobId: string };
    Headers: { 'x-digistream-media-secret'?: string };
    Body: RecordingJobLeaseBody;
  }>(
    '/api/v1/internal/recording-jobs/:jobId/heartbeat',
    async (request) => {
      requireMediaSecret(
        request.headers['x-digistream-media-secret'],
        mediaControlSecret,
      );
      const context = requireDatabase(database);
      return heartbeatRecordingWork(
        context.db,
        request.params.jobId,
        request.body ?? {},
      );
    },
  );

  app.post<{
    Params: { jobId: string };
    Headers: { 'x-digistream-media-secret'?: string };
    Body: RecordingJobFailureBody;
  }>('/api/v1/internal/recording-jobs/:jobId/fail', async (request) => {
    requireMediaSecret(
      request.headers['x-digistream-media-secret'],
      mediaControlSecret,
    );
    const context = requireDatabase(database);
    return failRecordingWork(
      context.db,
      request.params.jobId,
      request.body ?? {},
    );
  });

  app.put<{
    Params: { jobId: string };
    Headers: {
      'x-digistream-media-secret'?: string;
      'x-digistream-recording-worker'?: string;
      'x-digistream-recording-lease'?: string;
      'x-digistream-media-format'?: string;
      'x-digistream-duration-ms'?: string;
      'x-digistream-recording-provider'?: string;
      'x-digistream-provider-artifact-id'?: string;
    };
    Body: Buffer;
  }>('/api/v1/internal/recording-jobs/:jobId/artifact', async (request) => {
    requireMediaSecret(
      request.headers['x-digistream-media-secret'],
      mediaControlSecret,
    );
    const context = requireDatabase(database);
    return {
      recording: await uploadClaimedRecordingArtifact(
        context.db,
        requireObjectStorage(options.objectStorage),
        request.params.jobId,
        request.headers['x-digistream-recording-worker'],
        request.headers['x-digistream-recording-lease'],
        {
          body: request.body,
          contentType: request.headers['content-type'],
          mediaFormat: request.headers['x-digistream-media-format'],
          durationMs: request.headers['x-digistream-duration-ms'],
          provider: request.headers['x-digistream-recording-provider'],
          providerArtifactId:
            request.headers['x-digistream-provider-artifact-id'],
          maxUploadBytes: options.maxUploadBytes,
        },
      ),
    };
  });
}
