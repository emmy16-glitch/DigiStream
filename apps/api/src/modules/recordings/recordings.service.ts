import { randomUUID } from 'node:crypto';
import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import type { RecordingRecord } from './recordings.schema.js';
import {
  createRecordingRecord,
  findOrganisationRecordingRecord,
  findRecordingBroadcastContext,
  listOrganisationRecordingRecords,
  transitionRecordingRecord,
} from './recordings.repository.js';
import type {
  RecordingDto,
  RecordingManagementPatch,
  RecordingStatus,
  RecordingWorkerPatch,
} from './recordings.types.js';

export type RecordingManagementBody = {
  status?: unknown;
};

export type RecordingWorkerBody = {
  status?: unknown;
  provider?: unknown;
  providerArtifactId?: unknown;
  mediaFormat?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  durationMs?: unknown;
  checksumSha256?: unknown;
  processingError?: unknown;
};

const RECORDING_MANAGERS = new Set<OrganisationRole>([
  'owner',
  'admin',
  'broadcaster',
]);

const WORKER_TRANSITIONS: Record<
  Extract<RecordingStatus, 'recording' | 'uploading' | 'processing' | 'ready' | 'failed'>,
  readonly RecordingStatus[]
> = {
  recording: ['recording', 'uploading', 'processing', 'failed'],
  uploading: ['uploading', 'processing', 'failed'],
  processing: ['processing', 'ready', 'failed'],
  ready: ['ready'],
  failed: ['uploading', 'processing', 'failed'],
};

const MANAGEMENT_TRANSITIONS: Record<RecordingStatus, readonly RecordingStatus[]> = {
  recording: [],
  uploading: [],
  processing: [],
  ready: ['published', 'private', 'archived'],
  failed: [],
  published: ['private', 'archived'],
  private: ['published', 'archived'],
  archived: ['private'],
  deleted: [],
};

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function requireOrganisationRole(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
): Promise<OrganisationRole> {
  if (!validUuid(organisationId)) return recordingOrganisationNotFound();
  const role = await findOrganisationRole(db, organisationId, userId);
  return role ?? recordingOrganisationNotFound();
}

function recordingOrganisationNotFound(): never {
  throw new ApiError(
    404,
    'ORGANISATION_NOT_FOUND',
    'The requested organisation was not found.',
  );
}

function recordingNotFound(): never {
  throw new ApiError(
    404,
    'RECORDING_NOT_FOUND',
    'The requested recording was not found.',
  );
}

function parseLimit(value: unknown): number {
  const parsed = value === undefined ? 50 : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Limit must be between 1 and 100.');
  }
  return parsed;
}

function parseManagementStatus(value: unknown): RecordingManagementPatch['status'] | null {
  return value === 'published' || value === 'private' || value === 'archived'
    ? value
    : null;
}

function parseWorkerStatus(value: unknown): RecordingWorkerPatch['status'] | null {
  return value === 'recording' ||
    value === 'uploading' ||
    value === 'processing' ||
    value === 'ready' ||
    value === 'failed'
    ? value
    : null;
}

function optionalText(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length <= maxLength ? trimmed : undefined;
}

function optionalNonNegativeInteger(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    return undefined;
  }
  return value;
}

function optionalChecksum(value: unknown): string | null | undefined {
  const checksum = optionalText(value, 64);
  if (checksum === undefined || checksum === null) return checksum;
  const normalised = checksum.toLowerCase();
  return /^[0-9a-f]{64}$/.test(normalised) ? normalised : undefined;
}

function storageKey(organisationId: string, broadcastId: string): string {
  return `recordings/${organisationId}/${broadcastId}/${randomUUID()}`;
}

function applyWorkerState(
  current: RecordingRecord,
  patch: RecordingWorkerPatch,
): Partial<typeof import('./recordings.schema.js').recordingRecords.$inferInsert> | null {
  if (
    !['recording', 'uploading', 'processing', 'ready', 'failed'].includes(current.status)
  ) {
    return null;
  }
  const currentWorkerStatus = current.status as keyof typeof WORKER_TRANSITIONS;
  if (!WORKER_TRANSITIONS[currentWorkerStatus].includes(patch.status)) return null;

  const now = new Date();
  return {
    status: patch.status,
    ...(patch.provider !== undefined ? { provider: patch.provider } : {}),
    ...(patch.providerArtifactId !== undefined
      ? { providerArtifactId: patch.providerArtifactId }
      : {}),
    ...(patch.mediaFormat !== undefined ? { mediaFormat: patch.mediaFormat } : {}),
    ...(patch.contentType !== undefined ? { contentType: patch.contentType } : {}),
    ...(patch.sizeBytes !== undefined ? { sizeBytes: patch.sizeBytes } : {}),
    ...(patch.durationMs !== undefined ? { durationMs: patch.durationMs } : {}),
    ...(patch.checksumSha256 !== undefined
      ? { checksumSha256: patch.checksumSha256 }
      : {}),
    ...(patch.processingError !== undefined
      ? { processingError: patch.processingError }
      : {}),
    ...(patch.status === 'uploading' && current.uploadStartedAt === null
      ? { uploadStartedAt: now }
      : {}),
    ...(patch.status === 'processing' && current.processingStartedAt === null
      ? { processingStartedAt: now }
      : {}),
    ...(patch.status === 'ready'
      ? { readyAt: current.readyAt ?? now, processingError: null }
      : {}),
    ...(patch.status === 'failed'
      ? { retryCount: current.retryCount + 1 }
      : {}),
  };
}

export async function requestRecording(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  userId: string,
): Promise<{ recording: RecordingDto; replayed: boolean }> {
  const role = await requireOrganisationRole(db, organisationId, userId);
  if (!RECORDING_MANAGERS.has(role)) {
    throw new ApiError(
      403,
      'RECORDING_MANAGEMENT_REQUIRED',
      'Owner, administrator or broadcaster permission is required.',
    );
  }
  if (!validUuid(broadcastId)) {
    throw new ApiError(404, 'BROADCAST_NOT_FOUND', 'The requested broadcast was not found.');
  }

  const broadcast = await findRecordingBroadcastContext(db, organisationId, broadcastId);
  if (!broadcast) {
    throw new ApiError(404, 'BROADCAST_NOT_FOUND', 'The requested broadcast was not found.');
  }
  if (broadcast.status !== 'completed') {
    throw new ApiError(
      409,
      'BROADCAST_NOT_COMPLETED',
      'A recording can be prepared only after the broadcast is completed.',
    );
  }

  return createRecordingRecord(db, {
    organisationId,
    channelId: broadcast.channelId,
    broadcastId,
    requestedByUserId: userId,
    storageKey: storageKey(organisationId, broadcastId),
  });
}

export async function listRecordings(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
  rawLimit: unknown,
): Promise<RecordingDto[]> {
  await requireOrganisationRole(db, organisationId, userId);
  return listOrganisationRecordingRecords(db, organisationId, parseLimit(rawLimit));
}

export async function getRecording(
  db: DigiStreamDatabase,
  organisationId: string,
  recordingId: string,
  userId: string,
): Promise<RecordingDto> {
  await requireOrganisationRole(db, organisationId, userId);
  if (!validUuid(recordingId)) return recordingNotFound();
  return (
    (await findOrganisationRecordingRecord(db, organisationId, recordingId)) ??
    recordingNotFound()
  );
}

export async function manageRecording(
  db: DigiStreamDatabase,
  organisationId: string,
  recordingId: string,
  userId: string,
  body: RecordingManagementBody,
): Promise<RecordingDto> {
  const role = await requireOrganisationRole(db, organisationId, userId);
  if (!RECORDING_MANAGERS.has(role)) {
    throw new ApiError(
      403,
      'RECORDING_MANAGEMENT_REQUIRED',
      'Owner, administrator or broadcaster permission is required.',
    );
  }
  if (!validUuid(recordingId)) return recordingNotFound();
  const status = parseManagementStatus(body.status);
  if (!status) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Status must be published, private or archived.',
    );
  }

  const result = await transitionRecordingRecord(
    db,
    organisationId,
    recordingId,
    (current) => {
      if (current.status === status) return { status };
      if (!MANAGEMENT_TRANSITIONS[current.status].includes(status)) return null;
      const now = new Date();
      return {
        status,
        ...(status === 'published'
          ? { publishedAt: current.publishedAt ?? now, archivedAt: null }
          : {}),
        ...(status === 'private' ? { archivedAt: null } : {}),
        ...(status === 'archived' ? { archivedAt: now } : {}),
      };
    },
  );

  if (result.status === 'not_found') return recordingNotFound();
  if (result.status === 'invalid_state') {
    throw new ApiError(
      409,
      'INVALID_RECORDING_STATUS_TRANSITION',
      `A recording cannot move from ${result.currentStatus} to ${status}.`,
    );
  }
  return result.recording;
}

export async function updateRecordingFromWorker(
  db: DigiStreamDatabase,
  organisationId: string,
  recordingId: string,
  body: RecordingWorkerBody,
): Promise<RecordingDto> {
  if (!validUuid(organisationId) || !validUuid(recordingId)) return recordingNotFound();
  const status = parseWorkerStatus(body.status);
  const provider = optionalText(body.provider, 80);
  const providerArtifactId = optionalText(body.providerArtifactId, 255);
  const mediaFormat = optionalText(body.mediaFormat, 32);
  const contentType = optionalText(body.contentType, 100);
  const sizeBytes = optionalNonNegativeInteger(body.sizeBytes);
  const durationMs = optionalNonNegativeInteger(body.durationMs);
  const checksumSha256 = optionalChecksum(body.checksumSha256);
  const processingError = optionalText(body.processingError, 1000);

  if (
    !status ||
    provider === undefined ||
    providerArtifactId === undefined ||
    mediaFormat === undefined ||
    contentType === undefined ||
    sizeBytes === undefined ||
    durationMs === undefined ||
    checksumSha256 === undefined ||
    processingError === undefined ||
    (status === 'ready' &&
      (!mediaFormat || !contentType || sizeBytes === null || durationMs === null || !checksumSha256)) ||
    (status === 'failed' && !processingError)
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid recording state and artifact metadata.',
    );
  }

  const patch: RecordingWorkerPatch = {
    status,
    ...(provider !== undefined ? { provider } : {}),
    ...(providerArtifactId !== undefined ? { providerArtifactId } : {}),
    ...(mediaFormat !== undefined ? { mediaFormat } : {}),
    ...(contentType !== undefined ? { contentType } : {}),
    ...(sizeBytes !== undefined ? { sizeBytes } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(checksumSha256 !== undefined ? { checksumSha256 } : {}),
    ...(processingError !== undefined ? { processingError } : {}),
  };

  const result = await transitionRecordingRecord(
    db,
    organisationId,
    recordingId,
    (current) => applyWorkerState(current, patch),
  );
  if (result.status === 'not_found') return recordingNotFound();
  if (result.status === 'invalid_state') {
    throw new ApiError(
      409,
      'INVALID_RECORDING_STATUS_TRANSITION',
      `A recording worker cannot move ${result.currentStatus} to ${status}.`,
    );
  }
  return result.recording;
}
