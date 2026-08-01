import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { ObjectStorage } from '../storage/object-storage.js';
import type {
  RecordingAccessManager,
  RecordingAccessScope,
} from './recording-access.js';
import { findRecordingPlaybackPolicy } from './recording-playback-policy.repository.js';
import {
  createRecordingAccess,
  getRecording,
  listRecordings,
  manageRecording,
  requestRecording,
  resolveRecordingMedia,
  updateRecordingFromWorker,
  uploadRecordingArtifact,
  type RecordingAccessBody,
  type RecordingManagementBody,
  type RecordingWorkerBody,
} from './recordings.service.js';

export type RecordingRouteOptions = {
  objectStorage: ObjectStorage | null;
  accessManager: RecordingAccessManager | null;
  maxUploadBytes: number;
};

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Recordings are temporarily unavailable.',
    );
  }
  return database;
}

function requireObjectStorage(
  objectStorage: ObjectStorage | null,
): ObjectStorage {
  if (!objectStorage) {
    throw new ApiError(
      503,
      'OBJECT_STORAGE_UNAVAILABLE',
      'Recording storage is not configured.',
    );
  }
  return objectStorage;
}

function requireAccessManager(
  accessManager: RecordingAccessManager | null,
): RecordingAccessManager {
  if (!accessManager) {
    throw new ApiError(
      503,
      'RECORDING_ACCESS_UNAVAILABLE',
      'Recording access is not configured.',
    );
  }
  return accessManager;
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

function safeFilename(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return safe || 'digistream-recording';
}

async function requirePlaybackAllowed(
  context: DatabaseContext,
  organisationId: string,
  recordingId: string,
  scope: RecordingAccessScope,
): Promise<void> {
  const policy = await findRecordingPlaybackPolicy(
    context.pool,
    organisationId,
    recordingId,
    scope,
  );
  if (!policy.allowed) {
    throw new ApiError(
      404,
      'RECORDING_MEDIA_NOT_FOUND',
      'The requested recording media was not found.',
    );
  }
}

export function registerRecordingRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  mediaControlSecret: string | undefined,
  options: RecordingRouteOptions,
): void {
  app.addContentTypeParser(
    /^audio\/[a-z0-9][a-z0-9.+-]*$/i,
    { parseAs: 'buffer', bodyLimit: options.maxUploadBytes },
    (_request, body, done) => done(null, body),
  );

  app.post<{
    Params: { organisationId: string; broadcastId: string };
  }>(
    '/api/v1/organisations/:organisationId/broadcasts/:broadcastId/recording',
    async (request, reply) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const result = await requestRecording(
        context.db,
        request.params.organisationId,
        request.params.broadcastId,
        user.id,
      );
      return reply.code(result.replayed ? 200 : 201).send(result);
    },
  );

  app.get<{
    Params: { organisationId: string };
    Querystring: { limit?: string };
  }>(
    '/api/v1/organisations/:organisationId/recordings',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        recordings: await listRecordings(
          context.db,
          request.params.organisationId,
          user.id,
          request.query.limit,
        ),
      };
    },
  );

  app.get<{
    Params: { organisationId: string; recordingId: string };
  }>(
    '/api/v1/organisations/:organisationId/recordings/:recordingId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        recording: await getRecording(
          context.db,
          request.params.organisationId,
          request.params.recordingId,
          user.id,
        ),
      };
    },
  );

  app.patch<{
    Params: { organisationId: string; recordingId: string };
    Body: RecordingManagementBody;
  }>(
    '/api/v1/organisations/:organisationId/recordings/:recordingId',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      return {
        recording: await manageRecording(
          context.db,
          request.params.organisationId,
          request.params.recordingId,
          user.id,
          request.body ?? {},
        ),
      };
    },
  );

  app.post<{
    Params: { organisationId: string; recordingId: string };
    Body: RecordingAccessBody;
  }>(
    '/api/v1/organisations/:organisationId/recordings/:recordingId/access',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      requireObjectStorage(options.objectStorage);
      await requirePlaybackAllowed(
        context,
        request.params.organisationId,
        request.params.recordingId,
        'member',
      );
      return createRecordingAccess(
        context.db,
        requireAccessManager(options.accessManager),
        request.params.organisationId,
        request.params.recordingId,
        user.id,
        request.body ?? {},
      );
    },
  );

  app.post<{
    Params: { organisationId: string; recordingId: string };
    Headers: { 'x-digistream-media-secret'?: string };
    Body: RecordingWorkerBody;
  }>(
    '/api/v1/internal/organisations/:organisationId/recordings/:recordingId/state',
    async (request) => {
      requireMediaSecret(
        request.headers['x-digistream-media-secret'],
        mediaControlSecret,
      );
      const context = requireDatabase(database);
      return {
        recording: await updateRecordingFromWorker(
          context.db,
          request.params.organisationId,
          request.params.recordingId,
          request.body ?? {},
        ),
      };
    },
  );

  app.put<{
    Params: { organisationId: string; recordingId: string };
    Headers: {
      'x-digistream-media-secret'?: string;
      'x-digistream-media-format'?: string;
      'x-digistream-duration-ms'?: string;
      'x-digistream-recording-provider'?: string;
      'x-digistream-provider-artifact-id'?: string;
    };
    Body: Buffer;
  }>(
    '/api/v1/internal/organisations/:organisationId/recordings/:recordingId/artifact',
    async (request) => {
      requireMediaSecret(
        request.headers['x-digistream-media-secret'],
        mediaControlSecret,
      );
      const context = requireDatabase(database);
      return {
        recording: await uploadRecordingArtifact(
          context.db,
          requireObjectStorage(options.objectStorage),
          request.params.organisationId,
          request.params.recordingId,
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
    },
  );

  app.get<{
    Querystring: { token?: string };
    Headers: { range?: string };
  }>('/api/v1/recording-media', async (request, reply) => {
    if (typeof request.query.token !== 'string' || request.query.token.length === 0) {
      throw new ApiError(
        401,
        'RECORDING_ACCESS_INVALID',
        'Valid recording access is required.',
      );
    }
    const context = requireDatabase(database);
    const accessManager = requireAccessManager(options.accessManager);
    const verification = accessManager.verify(request.query.token);
    if (verification.status === 'valid') {
      await requirePlaybackAllowed(
        context,
        verification.grant.organisationId,
        verification.grant.recordingId,
        verification.grant.scope,
      );
    }
    const result = await resolveRecordingMedia(
      context.db,
      requireObjectStorage(options.objectStorage),
      accessManager,
      request.query.token,
      request.headers.range,
    );
    reply.header('accept-ranges', 'bytes');
    reply.header('cache-control', 'private, no-store');
    reply.header('cross-origin-resource-policy', 'same-origin');
    reply.header('x-content-type-options', 'nosniff');

    if (result.kind === 'range_not_satisfiable') {
      reply.header('content-range', `bytes */${result.totalSize}`);
      throw new ApiError(
        416,
        'RECORDING_RANGE_NOT_SATISFIABLE',
        'The requested recording byte range is not available.',
      );
    }

    const filename = safeFilename(result.filename);
    reply.header(
      'content-disposition',
      `${result.mode === 'download' ? 'attachment' : 'inline'}; filename="${filename}"`,
    );
    reply.header('content-length', result.contentLength);
    if (result.contentRange) {
      reply.header('content-range', result.contentRange);
    }
    reply.type(result.contentType);
    return reply.code(result.partial ? 206 : 200).send(result.body);
  });
}
