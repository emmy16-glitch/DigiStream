import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import type { ObjectStorage } from '../storage/object-storage.js';
import {
  claimRecordingProcessingJobs,
  completeRecordingProcessingJob,
  failRecordingProcessingJob,
  findActiveRecordingJobLease,
  heartbeatRecordingProcessingJob,
  reconcileRecordingProcessingJobs,
} from './recording-jobs.repository.js';
import {
  updateRecordingFromWorker,
  uploadRecordingArtifact,
  type RecordingArtifactUploadInput,
} from './recordings.service.js';
import type { RecordingDto } from './recordings.types.js';

export type RecordingJobClaimBody = {
  workerId?: unknown;
  limit?: unknown;
  leaseSeconds?: unknown;
};

export type RecordingJobLeaseBody = {
  workerId?: unknown;
  leaseToken?: unknown;
  extendSeconds?: unknown;
};

export type RecordingJobFailureBody = RecordingJobLeaseBody & {
  failureCode?: unknown;
  failureMessage?: unknown;
};

export type RecordingJobReconcileBody = {
  limit?: unknown;
};

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function requiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number | null {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function requireWorkerId(value: unknown): string {
  const workerId = requiredText(value, 100);
  if (!workerId || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(workerId)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid recording worker identifier.',
    );
  }
  return workerId;
}

function requireLeaseToken(value: unknown): string {
  const leaseToken = requiredText(value, 200);
  if (!leaseToken || leaseToken.length < 32) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid recording job lease token.',
    );
  }
  return leaseToken;
}

async function requireLease(
  db: DigiStreamDatabase,
  jobId: string,
  workerId: string,
  leaseToken: string,
) {
  if (!validUuid(jobId)) {
    throw new ApiError(404, 'RECORDING_JOB_NOT_FOUND', 'The recording job was not found.');
  }
  const lease = await findActiveRecordingJobLease(db, {
    jobId,
    workerId,
    leaseToken,
  });
  if (!lease) {
    throw new ApiError(
      409,
      'RECORDING_JOB_LEASE_INVALID',
      'This recording job lease is missing, expired or belongs to another worker.',
    );
  }
  return lease;
}

export async function claimRecordingWork(
  db: DigiStreamDatabase,
  body: RecordingJobClaimBody,
) {
  const workerId = requireWorkerId(body.workerId);
  const limit = boundedInteger(body.limit, 1, 1, 20);
  const leaseSeconds = boundedInteger(body.leaseSeconds, 120, 30, 900);
  if (limit === null || leaseSeconds === null) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Limit must be 1 to 20 and leaseSeconds must be 30 to 900.',
    );
  }

  const jobs = await claimRecordingProcessingJobs(db, {
    workerId,
    limit,
    leaseSeconds,
  });
  return {
    jobs: jobs.map((job) => ({
      id: job.jobId,
      recordingId: job.recordingId,
      organisationId: job.organisationId,
      broadcastId: job.broadcastId,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      leaseToken: job.leaseToken,
      leaseExpiresAt: job.leaseExpiresAt,
      heartbeatUrl: `/api/v1/internal/recording-jobs/${job.jobId}/heartbeat`,
      artifactUploadUrl: `/api/v1/internal/recording-jobs/${job.jobId}/artifact`,
      failureUrl: `/api/v1/internal/recording-jobs/${job.jobId}/fail`,
    })),
  };
}

export async function heartbeatRecordingWork(
  db: DigiStreamDatabase,
  jobId: string,
  body: RecordingJobLeaseBody,
) {
  const workerId = requireWorkerId(body.workerId);
  const leaseToken = requireLeaseToken(body.leaseToken);
  const extendSeconds = boundedInteger(body.extendSeconds, 120, 30, 900);
  if (extendSeconds === null) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'extendSeconds must be between 30 and 900.',
    );
  }
  await requireLease(db, jobId, workerId, leaseToken);
  const leaseExpiresAt = await heartbeatRecordingProcessingJob(db, {
    jobId,
    workerId,
    leaseToken,
    extendSeconds,
  });
  if (!leaseExpiresAt) {
    throw new ApiError(
      409,
      'RECORDING_JOB_LEASE_INVALID',
      'The recording job lease expired before it could be renewed.',
    );
  }
  return { leaseExpiresAt };
}

export async function failRecordingWork(
  db: DigiStreamDatabase,
  jobId: string,
  body: RecordingJobFailureBody,
) {
  const workerId = requireWorkerId(body.workerId);
  const leaseToken = requireLeaseToken(body.leaseToken);
  const failureCode = requiredText(body.failureCode, 100);
  const failureMessage = requiredText(body.failureMessage, 1000);
  if (!failureCode || !/^[a-z0-9][a-z0-9._-]*$/i.test(failureCode) || !failureMessage) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid failure code and failure message.',
    );
  }
  const lease = await requireLease(db, jobId, workerId, leaseToken);
  await updateRecordingFromWorker(
    db,
    lease.organisationId,
    lease.recordingId,
    {
      status: 'failed',
      provider: 'recording-job-worker',
      providerArtifactId: null,
      mediaFormat: null,
      contentType: null,
      sizeBytes: null,
      durationMs: null,
      checksumSha256: null,
      processingError: failureMessage,
    },
  );
  const result = await failRecordingProcessingJob(db, {
    jobId,
    workerId,
    leaseToken,
    failureCode,
    failureMessage,
  });
  if (!result) {
    throw new ApiError(
      409,
      'RECORDING_JOB_LEASE_INVALID',
      'The recording job lease expired before the failure was recorded.',
    );
  }
  return { job: result };
}

export async function uploadClaimedRecordingArtifact(
  db: DigiStreamDatabase,
  objectStorage: ObjectStorage,
  jobId: string,
  workerIdValue: unknown,
  leaseTokenValue: unknown,
  input: RecordingArtifactUploadInput,
): Promise<RecordingDto> {
  const workerId = requireWorkerId(workerIdValue);
  const leaseToken = requireLeaseToken(leaseTokenValue);
  const lease = await requireLease(db, jobId, workerId, leaseToken);

  try {
    const recording = await uploadRecordingArtifact(
      db,
      objectStorage,
      lease.organisationId,
      lease.recordingId,
      input,
    );
    await completeRecordingProcessingJob(db, {
      jobId,
      workerId,
      leaseToken,
    });
    return recording;
  } catch (error) {
    await failRecordingProcessingJob(db, {
      jobId,
      workerId,
      leaseToken,
      failureCode: 'artifact_upload_failed',
      failureMessage: 'The claimed recording artifact could not be stored and verified.',
    }).catch(() => null);
    throw error;
  }
}

export async function reconcileRecordingWork(
  db: DigiStreamDatabase,
  body: RecordingJobReconcileBody,
) {
  const limit = boundedInteger(body.limit, 100, 1, 500);
  if (limit === null) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Limit must be between 1 and 500.');
  }
  return {
    reconciliation: await reconcileRecordingProcessingJobs(db, limit),
  };
}
