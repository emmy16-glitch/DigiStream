import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import {
  ObjectStorageError,
  type ObjectStorage,
} from '../storage/object-storage.js';
import {
  claimDueRecordingPurges,
  completeRecordingPurge,
  failRecordingPurge,
  findRecordingRetentionRecord,
  mutateRecordingRetentionRecord,
  type RecordingRetentionRecord,
} from './recording-retention.repository.js';

export type RecordingRetentionBody = {
  action?: unknown;
  retentionUntil?: unknown;
  purgeAfter?: unknown;
  reason?: unknown;
};

export type RecordingRetentionReconcileBody = {
  limit?: unknown;
};

export type RecordingRetentionDto = {
  recordingId: string;
  organisationId: string;
  recordingStatus: string;
  retentionUntil: Date | null;
  deletionRequestedAt: Date | null;
  purgeAfter: Date | null;
  legalHold: { active: boolean; reason: string | null; setAt: Date | null };
  moderationHold: {
    active: boolean;
    reason: string | null;
    setAt: Date | null;
  };
  deletionBlocked: boolean;
  purgeInProgress: boolean;
  purgedAt: Date | null;
  purgeResult: 'deleted' | 'missing' | null;
  purgeAttemptCount: number;
  lastPurgeError: string | null;
  updatedAt: Date;
};

type RetentionAction =
  | 'set_retention'
  | 'request_deletion'
  | 'cancel_deletion'
  | 'set_legal_hold'
  | 'clear_legal_hold'
  | 'set_moderation_hold'
  | 'clear_moderation_hold';

const RETENTION_MANAGERS = new Set<OrganisationRole>(['owner', 'admin']);
const MODERATION_HOLD_MANAGERS = new Set<OrganisationRole>([
  'owner',
  'admin',
  'moderator',
]);
const DELETABLE_RECORDING_STATES = new Set([
  'ready',
  'published',
  'private',
  'archived',
  'failed',
]);

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function recordingNotFound(): never {
  throw new ApiError(
    404,
    'RECORDING_NOT_FOUND',
    'The requested recording was not found.',
  );
}

async function requireOrganisationRole(
  context: DatabaseContext,
  organisationId: string,
  userId: string,
): Promise<OrganisationRole> {
  if (!validUuid(organisationId)) return recordingNotFound();
  const role = await findOrganisationRole(context.db, organisationId, userId);
  return role ?? recordingNotFound();
}

function parseAction(value: unknown): RetentionAction | null {
  return value === 'set_retention' ||
    value === 'request_deletion' ||
    value === 'cancel_deletion' ||
    value === 'set_legal_hold' ||
    value === 'clear_legal_hold' ||
    value === 'set_moderation_hold' ||
    value === 'clear_moderation_hold'
    ? value
    : null;
}

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseReason(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const reason = value.trim();
  return reason.length > 0 && reason.length <= 500 ? reason : null;
}

function parseLimit(value: unknown): number {
  const parsed = value === undefined ? 25 : Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Limit must be between 1 and 100.',
    );
  }
  return parsed;
}

function toDto(record: RecordingRetentionRecord): RecordingRetentionDto {
  const legalHold = record.legalHoldAt !== null;
  const moderationHold = record.moderationHoldAt !== null;
  return {
    recordingId: record.recordingId,
    organisationId: record.organisationId,
    recordingStatus: record.status,
    retentionUntil: record.retentionUntil,
    deletionRequestedAt: record.deletionRequestedAt,
    purgeAfter: record.purgeAfter,
    legalHold: {
      active: legalHold,
      reason: record.legalHoldReason,
      setAt: record.legalHoldAt,
    },
    moderationHold: {
      active: moderationHold,
      reason: record.moderationHoldReason,
      setAt: record.moderationHoldAt,
    },
    deletionBlocked: legalHold || moderationHold,
    purgeInProgress: record.purgeStartedAt !== null && record.purgedAt === null,
    purgedAt: record.purgedAt,
    purgeResult: record.purgeResult,
    purgeAttemptCount: record.purgeAttemptCount,
    lastPurgeError: record.lastPurgeError,
    updatedAt: record.updatedAt,
  };
}

function requireRetentionManager(role: OrganisationRole): void {
  if (!RETENTION_MANAGERS.has(role)) {
    throw new ApiError(
      403,
      'RECORDING_RETENTION_MANAGEMENT_REQUIRED',
      'Owner or administrator permission is required.',
    );
  }
}

function validateRetentionUntil(value: unknown): Date | null {
  const date = parseDate(value);
  if (date === undefined) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'retentionUntil must be an ISO timestamp or null.',
    );
  }
  if (date !== null) {
    const now = Date.now();
    const maximum = now + 10 * 365 * 24 * 60 * 60 * 1000;
    if (date.getTime() <= now || date.getTime() > maximum) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'retentionUntil must be in the future and no more than ten years away.',
      );
    }
  }
  return date;
}

function validatePurgeAfter(value: unknown): Date {
  const now = Date.now();
  const parsed =
    value === undefined
      ? new Date(now + 7 * 24 * 60 * 60 * 1000)
      : parseDate(value);
  if (!(parsed instanceof Date)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'purgeAfter must be a valid ISO timestamp.',
    );
  }
  const minimum = now + 24 * 60 * 60 * 1000;
  const maximum = now + 365 * 24 * 60 * 60 * 1000;
  if (parsed.getTime() < minimum || parsed.getTime() > maximum) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'purgeAfter must be between 24 hours and 365 days from now.',
    );
  }
  return parsed;
}

function purgeMutationBlocked(
  current: RecordingRetentionRecord,
  action: RetentionAction,
): boolean {
  if (current.purgeStartedAt === null || current.purgedAt !== null) return false;
  return (
    action === 'set_retention' ||
    action === 'request_deletion' ||
    action === 'cancel_deletion' ||
    action === 'set_legal_hold' ||
    action === 'set_moderation_hold'
  );
}

function effectivePurgeAfter(
  requested: Date,
  retentionUntil: Date | null,
): Date {
  if (retentionUntil && retentionUntil.getTime() > requested.getTime()) {
    return retentionUntil;
  }
  return requested;
}

export async function getRecordingRetention(
  context: DatabaseContext,
  organisationId: string,
  recordingId: string,
  userId: string,
): Promise<RecordingRetentionDto> {
  await requireOrganisationRole(context, organisationId, userId);
  if (!validUuid(recordingId)) return recordingNotFound();
  const record = await findRecordingRetentionRecord(
    context.pool,
    organisationId,
    recordingId,
  );
  return record ? toDto(record) : recordingNotFound();
}

export async function manageRecordingRetention(
  context: DatabaseContext,
  organisationId: string,
  recordingId: string,
  userId: string,
  body: RecordingRetentionBody,
): Promise<RecordingRetentionDto> {
  const role = await requireOrganisationRole(context, organisationId, userId);
  if (!validUuid(recordingId)) return recordingNotFound();
  const action = parseAction(body.action);
  if (!action) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid recording retention action.',
    );
  }

  if (action === 'set_moderation_hold' || action === 'clear_moderation_hold') {
    if (!MODERATION_HOLD_MANAGERS.has(role)) {
      throw new ApiError(
        403,
        'RECORDING_MODERATION_HOLD_REQUIRED',
        'Owner, administrator or moderator permission is required.',
      );
    }
  } else {
    requireRetentionManager(role);
  }

  const changed = await mutateRecordingRetentionRecord(
    context.pool,
    organisationId,
    recordingId,
    async (client, current) => {
      if (
        current.purgedAt !== null &&
        action !== 'clear_legal_hold' &&
        action !== 'clear_moderation_hold'
      ) {
        throw new ApiError(
          409,
          'RECORDING_ALREADY_PURGED',
          'This recording has already been permanently removed.',
        );
      }

      if (purgeMutationBlocked(current, action)) {
        throw new ApiError(
          409,
          'RECORDING_PURGE_IN_PROGRESS',
          'Cleanup has already started. Retention, deletion cancellation and new holds cannot be changed until this attempt finishes.',
        );
      }

      if (action === 'set_retention') {
        const retentionUntil = validateRetentionUntil(body.retentionUntil);
        const purgeAfter =
          retentionUntil && current.purgeAfter
            ? effectivePurgeAfter(current.purgeAfter, retentionUntil)
            : current.purgeAfter;
        await client.query(
          `update recording_retention_controls
           set retention_until = $2,
               purge_after = $3,
               updated_at = now()
           where recording_id = $1`,
          [recordingId, retentionUntil, purgeAfter],
        );
        return;
      }

      if (action === 'request_deletion') {
        if (current.legalHoldAt || current.moderationHoldAt) {
          throw new ApiError(
            409,
            'RECORDING_DELETION_BLOCKED_BY_HOLD',
            'Remove active legal and moderation holds before requesting deletion.',
          );
        }
        if (!DELETABLE_RECORDING_STATES.has(current.status)) {
          throw new ApiError(
            409,
            'RECORDING_DELETION_NOT_ALLOWED',
            `A recording cannot be scheduled for deletion while it is ${current.status}.`,
          );
        }
        const requestedPurgeAfter = validatePurgeAfter(body.purgeAfter);
        const purgeAfter = effectivePurgeAfter(
          requestedPurgeAfter,
          current.retentionUntil,
        );
        await client.query(
          `update recording_retention_controls
           set deletion_requested_at = now(),
               purge_after = $2,
               purge_started_at = null,
               purged_at = null,
               purge_result = null,
               last_purge_error = null,
               updated_at = now()
           where recording_id = $1`,
          [recordingId, purgeAfter],
        );
        await client.query(
          `update recordings
           set status = 'archived',
               archived_at = coalesce(archived_at, now()),
               updated_at = now()
           where id = $1`,
          [recordingId],
        );
        return;
      }

      if (action === 'cancel_deletion') {
        await client.query(
          `update recording_retention_controls
           set deletion_requested_at = null,
               purge_after = null,
               purge_started_at = null,
               last_purge_error = null,
               updated_at = now()
           where recording_id = $1 and purged_at is null`,
          [recordingId],
        );
        return;
      }

      if (action === 'set_legal_hold') {
        const reason = parseReason(body.reason);
        if (!reason) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'A legal-hold reason between 1 and 500 characters is required.',
          );
        }
        await client.query(
          `update recording_retention_controls
           set legal_hold_at = coalesce(legal_hold_at, now()),
               legal_hold_reason = $2,
               updated_at = now()
           where recording_id = $1`,
          [recordingId, reason],
        );
        return;
      }

      if (action === 'clear_legal_hold') {
        await client.query(
          `update recording_retention_controls
           set legal_hold_at = null,
               legal_hold_reason = null,
               updated_at = now()
           where recording_id = $1`,
          [recordingId],
        );
        return;
      }

      if (action === 'set_moderation_hold') {
        const reason = parseReason(body.reason);
        if (!reason) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'A moderation-hold reason between 1 and 500 characters is required.',
          );
        }
        await client.query(
          `update recording_retention_controls
           set moderation_hold_at = coalesce(moderation_hold_at, now()),
               moderation_hold_reason = $2,
               updated_at = now()
           where recording_id = $1`,
          [recordingId, reason],
        );
        return;
      }

      await client.query(
        `update recording_retention_controls
         set moderation_hold_at = null,
             moderation_hold_reason = null,
             updated_at = now()
         where recording_id = $1`,
        [recordingId],
      );
    },
  );

  if (changed === null) return recordingNotFound();
  const updated = await findRecordingRetentionRecord(
    context.pool,
    organisationId,
    recordingId,
  );
  return updated ? toDto(updated) : recordingNotFound();
}

async function removeRecordingObject(
  objectStorage: ObjectStorage,
  candidate: RecordingRetentionRecord,
): Promise<'deleted' | 'missing'> {
  try {
    if (
      candidate.sizeBytes !== null &&
      candidate.sizeBytes > 0 &&
      candidate.checksumSha256 !== null
    ) {
      await objectStorage.verifyObject({
        key: candidate.storageKey,
        expectedChecksumSha256: candidate.checksumSha256,
        expectedSizeBytes: candidate.sizeBytes,
      });
      await objectStorage.deleteObject(candidate.storageKey);
      return 'deleted';
    }

    const stored = await objectStorage.getObject({
      key: candidate.storageKey,
      contentType: candidate.contentType ?? 'application/octet-stream',
    });
    stored.body.destroy();
    throw new ObjectStorageError(
      'invalid_response',
      'The recording object exists, but checksum and size metadata are incomplete. Cleanup was not performed.',
    );
  } catch (error) {
    if (error instanceof ObjectStorageError && error.code === 'not_found') {
      return 'missing';
    }
    throw error;
  }
}

export async function reconcileRecordingRetention(
  context: DatabaseContext,
  objectStorage: ObjectStorage,
  body: RecordingRetentionReconcileBody,
): Promise<{
  claimed: number;
  deleted: number;
  missing: number;
  failed: number;
  results: Array<{
    recordingId: string;
    result: 'deleted' | 'missing' | 'failed';
    error?: string;
  }>;
}> {
  const candidates = await claimDueRecordingPurges(
    context.pool,
    parseLimit(body.limit),
  );
  const results: Array<{
    recordingId: string;
    result: 'deleted' | 'missing' | 'failed';
    error?: string;
  }> = [];

  for (const candidate of candidates) {
    try {
      const result = await removeRecordingObject(objectStorage, candidate);
      await completeRecordingPurge(context.pool, candidate.recordingId, result);
      results.push({ recordingId: candidate.recordingId, result });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Recording cleanup failed for an unknown reason.';
      await failRecordingPurge(context.pool, candidate.recordingId, message);
      results.push({
        recordingId: candidate.recordingId,
        result: 'failed',
        error: message,
      });
    }
  }

  return {
    claimed: candidates.length,
    deleted: results.filter((result) => result.result === 'deleted').length,
    missing: results.filter((result) => result.result === 'missing').length,
    failed: results.filter((result) => result.result === 'failed').length,
    results,
  };
}
