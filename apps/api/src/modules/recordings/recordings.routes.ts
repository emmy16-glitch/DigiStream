import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  getRecording,
  listRecordings,
  manageRecording,
  requestRecording,
  updateRecordingFromWorker,
  type RecordingManagementBody,
  type RecordingWorkerBody,
} from './recordings.service.js';

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

export function registerRecordingRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  mediaControlSecret = process.env.MEDIA_CONTROL_SECRET,
): void {
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
    Headers: { 'x-digistream-media-secret'?: string };
    Body: RecordingWorkerBody;
  }>(
    '/api/v1/internal/organisations/:organisationId/recordings/:recordingId/state',
    async (request) => {
      if (
        !secretMatches(
          request.headers['x-digistream-media-secret'],
          mediaControlSecret,
        )
      ) {
        throw new ApiError(
          401,
          'MEDIA_CONTROL_AUTHENTICATION_REQUIRED',
          'Valid media-control authentication is required.',
        );
      }
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
}
