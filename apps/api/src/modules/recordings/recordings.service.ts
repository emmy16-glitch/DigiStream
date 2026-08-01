import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  ObjectStorageError,
  type ObjectStorage,
  type ObjectStorageRange,
} from '../storage/object-storage.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import {
  RecordingAccessManager,
  type RecordingAccessMode,
} from './recording-access.js';
import type {
  NewRecordingRecord,
  RecordingRecord,
} from './recordings.schema.js';
import {
  createRecordingRecord,
  findOrganisationRecordingRecord,
  findRecordingArtifactRecord,
  findRecordingBroadcastContext,
  listOrganisationRecordingRecords,
  transitionRecordingRecord,
  type RecordingArtifactRecord,
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

export type RecordingAccessBody = {
  mode?: unknown;
};

export type RecordingArtifactUploadInput = {
  body: unknown;
  contentType: unknown;
  mediaFormat: unknown;
  durationMs: unknown;
  provider: unknown;
  providerArtifactId: unknown;
  maxUploadBytes: number;
};

export type RecordingMediaResolution =
  | {
      kind: 'ok';
      mode: RecordingAccessMode;
      body: Readable;
      contentType: string;
      contentLength: number;
      contentRange: string | null;
      totalSize: number;
      filename: string;
      partial: boolean;
    }
  | {
      kind: 'range_not_satisfiable';
      totalSize: number;
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

function recordingMediaNotFound(): never {
  throw new ApiError(
    404,
    'RECORDING_MEDIA_NOT_FOUND',
    'The requested recording media was not found.',
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

function parseAccessMode(value: unknown): RecordingAccessMode | null {
  return value === 'playback' || value === 'download' ? value : null;
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
): Partial<NewRecordingRecord> | null {
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
    ...(patch.status === 'uploading'
      ? {
          uploadStartedAt: current.uploadStartedAt ?? now,
          capturedAt: current.capturedAt ?? now,
        }
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

async function applyWorkerTransition(
  db: DigiStreamDatabase,
  organisationId: string,
  recordingId: string,
  patch: RecordingWorkerPatch,
): Promise<RecordingDto> {
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
      `A recording worker cannot move ${result.currentStatus} to ${patch.status}.`,
    );
  }
  return result.recording;
}

function uploadText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function uploadContentType(value: unknown): string | null {
  const text = uploadText(value, 100)?.split(';', 1)[0]?.trim().toLowerCase();
  return text && /^audio\/[a-z0-9][a-z0-9.+-]*$/.test(text) ? text : null;
}

function uploadMediaFormat(value: unknown): string | null {
  const text = uploadText(value, 32)?.toLowerCase();
  return text && /^[a-z0-9][a-z0-9._+-]{0,31}$/.test(text) ? text : null;
}

function uploadDuration(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 86_400_000
    ? parsed
    : null;
}

function uploadProvider(value: unknown, fallback: string): string | null {
  if (value === undefined || value === null || value === '') return fallback;
  return uploadText(value, 80);
}

function uploadProviderArtifactId(value: unknown, fallback: string): string | null {
  if (value === undefined || value === null || value === '') return fallback;
  return uploadText(value, 255);
}

type ParsedRange =
  | { kind: 'full' }
  | { kind: 'range'; range: ObjectStorageRange }
  | { kind: 'invalid' };

function parseRange(value: unknown, totalSize: number): ParsedRange {
  if (value === undefined) return { kind: 'full' };
  if (typeof value !== 'string' || value.includes(',')) return { kind: 'invalid' };
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return { kind: 'invalid' };
  const startText = match[1] ?? '';
  const endText = match[2] ?? '';
  if (!startText && !endText) return { kind: 'invalid' };

  if (!startText) {
    const suffixLength = Number.parseInt(endText, 10);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return { kind: 'invalid' };
    }
    const start = Math.max(0, totalSize - suffixLength);
    return { kind: 'range', range: { start, end: totalSize - 1 } };
  }

  const start = Number.parseInt(startText, 10);
  if (!Number.isSafeInteger(start) || start < 0 || start >= totalSize) {
    return { kind: 'invalid' };
  }
  const requestedEnd = endText
    ? Number.parseInt(endText, 10)
    : totalSize - 1;
  if (!Number.isSafeInteger(requestedEnd) || requestedEnd < start) {
    return { kind: 'invalid' };
  }
  return {
    kind: 'range',
    range: { start, end: Math.min(requestedEnd, totalSize - 1) },
  };
}

function artifactIsDeliverable(recording: RecordingArtifactRecord): boolean {
  return (
    (recording.status === 'published' || recording.status === 'private') &&
    recording.readyAt !== null &&
    typeof recording.contentType === 'string' &&
    typeof recording.mediaFormat === 'string' &&
    typeof recording.sizeBytes === 'number' &&
    recording.sizeBytes > 0 &&
    typeof recording.checksumSha256 === 'string'
  );
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
  if (status === 'ready') {
    throw new ApiError(
      409,
      'RECORDING_ARTIFACT_UPLOAD_REQUIRED',
      'Upload and verify the recording artifact before marking it ready.',
    );
  }
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
    provider === null ||
    providerArtifactId === undefined ||
    mediaFormat === undefined ||
    contentType === undefined ||
    sizeBytes === undefined ||
    durationMs === undefined ||
    checksumSha256 === undefined ||
    processingError === undefined ||
    (status === 'failed' && !processingError)
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid recording state and artifact metadata.',
    );
  }

  return applyWorkerTransition(db, organisationId, recordingId, {
    status,
    provider,
    ...(providerArtifactId !== undefined ? { providerArtifactId } : {}),
    ...(mediaFormat !== undefined ? { mediaFormat } : {}),
    ...(contentType !== undefined ? { contentType } : {}),
    ...(sizeBytes !== undefined ? { sizeBytes } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(checksumSha256 !== undefined ? { checksumSha256 } : {}),
    ...(processingError !== undefined ? { processingError } : {}),
  });
}

export async function uploadRecordingArtifact(
  db: DigiStreamDatabase,
  objectStorage: ObjectStorage,
  organisationId: string,
  recordingId: string,
  input: RecordingArtifactUploadInput,
): Promise<RecordingDto> {
  if (!validUuid(organisationId) || !validUuid(recordingId)) return recordingNotFound();
  const recording =
    (await findRecordingArtifactRecord(db, organisationId, recordingId)) ??
    recordingNotFound();
  if (!Buffer.isBuffer(input.body) || input.body.byteLength === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Provide a non-empty audio artifact.');
  }
  if (input.body.byteLength > input.maxUploadBytes) {
    throw new ApiError(413, 'RECORDING_ARTIFACT_TOO_LARGE', 'The audio artifact is too large.');
  }

  const contentType = uploadContentType(input.contentType);
  const mediaFormat = uploadMediaFormat(input.mediaFormat);
  const durationMs = uploadDuration(input.durationMs);
  const provider = uploadProvider(
    input.provider,
    `object-storage-${objectStorage.provider}`,
  );
  const providerArtifactId = uploadProviderArtifactId(
    input.providerArtifactId,
    `recording-${recording.id}`,
  );
  if (!contentType || !mediaFormat || durationMs === null || !provider || !providerArtifactId) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid audio content type, media format, duration and provider metadata.',
    );
  }

  if (!['recording', 'uploading', 'processing', 'failed'].includes(recording.status)) {
    throw new ApiError(
      409,
      'INVALID_RECORDING_STATUS_TRANSITION',
      `A recording artifact cannot be uploaded while the recording is ${recording.status}.`,
    );
  }

  await applyWorkerTransition(db, organisationId, recordingId, {
    status: 'uploading',
    provider,
    providerArtifactId,
    processingError: null,
  });

  let uploaded = false;
  try {
    const stored = await objectStorage.putObject({
      key: recording.storageKey,
      body: input.body,
      contentType,
    });
    uploaded = true;

    await applyWorkerTransition(db, organisationId, recordingId, {
      status: 'processing',
      provider,
      providerArtifactId,
      mediaFormat,
      contentType,
      sizeBytes: stored.sizeBytes,
      durationMs,
      checksumSha256: stored.checksumSha256,
      processingError: null,
    });

    const verified = await objectStorage.verifyObject({
      key: recording.storageKey,
      expectedChecksumSha256: stored.checksumSha256,
      expectedSizeBytes: stored.sizeBytes,
    });

    return applyWorkerTransition(db, organisationId, recordingId, {
      status: 'ready',
      provider,
      providerArtifactId,
      mediaFormat,
      contentType,
      sizeBytes: verified.sizeBytes,
      durationMs,
      checksumSha256: verified.checksumSha256,
      processingError: null,
    });
  } catch (error) {
    if (uploaded) {
      try {
        await objectStorage.deleteObject(recording.storageKey);
      } catch {
        // Reconciliation and orphan cleanup are a later Phase 8 slice.
      }
    }
    try {
      await applyWorkerTransition(db, organisationId, recordingId, {
        status: 'failed',
        provider,
        providerArtifactId,
        processingError: 'Object storage upload or checksum verification failed.',
      });
    } catch {
      // Preserve the original storage or transition failure.
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      'RECORDING_ARTIFACT_UPLOAD_FAILED',
      'The recording artifact could not be stored and verified.',
    );
  }
}

export async function createRecordingAccess(
  db: DigiStreamDatabase,
  accessManager: RecordingAccessManager,
  organisationId: string,
  recordingId: string,
  userId: string,
  body: RecordingAccessBody,
): Promise<{
  access: {
    mode: RecordingAccessMode;
    url: string;
    expiresAt: Date;
  };
}> {
  await requireOrganisationRole(db, organisationId, userId);
  if (!validUuid(recordingId)) return recordingNotFound();
  const mode = parseAccessMode(body.mode);
  if (!mode) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Access mode must be playback or download.',
    );
  }
  const recording =
    (await findRecordingArtifactRecord(db, organisationId, recordingId)) ??
    recordingNotFound();
  if (!artifactIsDeliverable(recording)) {
    throw new ApiError(
      409,
      'RECORDING_ARTIFACT_NOT_READY',
      'This recording does not have an authorised playable artifact yet.',
    );
  }

  const minted = accessManager.mint({
    organisationId,
    recordingId,
    mode,
  });
  return {
    access: {
      mode,
      url: `/api/v1/recording-media?token=${encodeURIComponent(minted.token)}`,
      expiresAt: minted.grant.expiresAt,
    },
  };
}

export async function resolveRecordingMedia(
  db: DigiStreamDatabase,
  objectStorage: ObjectStorage,
  accessManager: RecordingAccessManager,
  token: string,
  rangeHeader: unknown,
): Promise<RecordingMediaResolution> {
  const verification = accessManager.verify(token);
  if (verification.status === 'expired') {
    throw new ApiError(
      410,
      'RECORDING_ACCESS_EXPIRED',
      'This recording access link has expired.',
    );
  }
  if (verification.status !== 'valid') {
    throw new ApiError(
      401,
      'RECORDING_ACCESS_INVALID',
      'Valid recording access is required.',
    );
  }

  const recording = await findRecordingArtifactRecord(
    db,
    verification.grant.organisationId,
    verification.grant.recordingId,
  );
  if (!recording || !artifactIsDeliverable(recording)) {
    return recordingMediaNotFound();
  }

  const totalSize = recording.sizeBytes as number;
  const parsedRange = parseRange(rangeHeader, totalSize);
  if (parsedRange.kind === 'invalid') {
    return { kind: 'range_not_satisfiable', totalSize };
  }

  try {
    const stored = await objectStorage.getObject({
      key: recording.storageKey,
      contentType: recording.contentType as string,
      ...(parsedRange.kind === 'range' ? { range: parsedRange.range } : {}),
    });
    const partial = parsedRange.kind === 'range';
    const expectedLength = partial
      ? parsedRange.range.end - parsedRange.range.start + 1
      : totalSize;
    if (stored.contentLength !== expectedLength) {
      throw new ObjectStorageError(
        'invalid_response',
        'Object storage returned an unexpected response length.',
      );
    }
    return {
      kind: 'ok',
      mode: verification.grant.mode,
      body: stored.body,
      contentType: recording.contentType as string,
      contentLength: stored.contentLength,
      contentRange: partial
        ? stored.contentRange ??
          `bytes ${parsedRange.range.start}-${parsedRange.range.end}/${totalSize}`
        : null,
      totalSize,
      filename: `${recording.broadcastSlug}.${recording.mediaFormat}`,
      partial,
    };
  } catch (error) {
    if (error instanceof ObjectStorageError && error.code === 'not_found') {
      throw new ApiError(
        503,
        'RECORDING_ARTIFACT_MISSING',
        'The recording metadata exists, but its audio artifact is unavailable.',
      );
    }
    throw new ApiError(
      503,
      'OBJECT_STORAGE_UNAVAILABLE',
      'Recording storage is temporarily unavailable.',
    );
  }
}
