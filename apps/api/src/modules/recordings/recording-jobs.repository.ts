import { createHash, randomBytes } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { recordingProcessingJobs } from './recording-jobs.schema.js';

export type ClaimedRecordingJob = {
  jobId: string;
  recordingId: string;
  organisationId: string;
  broadcastId: string;
  attemptCount: number;
  maxAttempts: number;
  leaseToken: string;
  leaseExpiresAt: Date;
};

export type RecordingJobLease = {
  jobId: string;
  recordingId: string;
  organisationId: string;
  broadcastId: string;
  workerId: string;
  attemptCount: number;
  maxAttempts: number;
  leaseExpiresAt: Date;
};

export type RecordingJobFailureResult = {
  state: 'pending' | 'dead';
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: Date | null;
};

export type RecordingJobReconciliationSummary = {
  completed: number;
  rescheduled: number;
  exhausted: number;
};

type ClaimCandidate = {
  job_id: string;
  recording_id: string;
  organisation_id: string;
  broadcast_id: string;
  attempt_count: number;
  max_attempts: number;
};

type LeaseRow = ClaimCandidate & {
  lease_owner: string;
  lease_expires_at: Date;
};

type ExpiredLeaseRow = {
  job_id: string;
  attempt_count: number;
  max_attempts: number;
};

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function retryDelayMs(attemptCount: number): number {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 8));
  return Math.min(3_600_000, 30_000 * 2 ** exponent);
}

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

async function normaliseCompletedJobs(
  db: DigiStreamDatabase,
): Promise<number> {
  const result = await db.execute(sql`
    UPDATE recording_processing_jobs AS jobs
    SET
      state = 'completed',
      completed_at = COALESCE(jobs.completed_at, recordings.ready_at, recordings.updated_at),
      lease_owner = NULL,
      lease_token_hash = NULL,
      lease_expires_at = NULL,
      updated_at = now()
    FROM recordings
    WHERE jobs.recording_id = recordings.id
      AND jobs.state <> 'completed'
      AND recordings.status IN ('ready', 'published', 'private', 'archived', 'deleted')
    RETURNING jobs.id
  `);
  return rowsOf<{ id: string }>(result).length;
}

export async function claimRecordingProcessingJobs(
  db: DigiStreamDatabase,
  options: {
    workerId: string;
    limit: number;
    leaseSeconds: number;
  },
): Promise<ClaimedRecordingJob[]> {
  return db.transaction(async (transaction) => {
    await normaliseCompletedJobs(transaction as DigiStreamDatabase);

    const selected = await transaction.execute(sql<ClaimCandidate>`
      SELECT
        jobs.id AS job_id,
        jobs.recording_id,
        recordings.organisation_id,
        recordings.broadcast_id,
        jobs.attempt_count,
        jobs.max_attempts
      FROM recording_processing_jobs AS jobs
      INNER JOIN recordings ON recordings.id = jobs.recording_id
      WHERE recordings.status IN ('recording', 'failed')
        AND jobs.attempt_count < jobs.max_attempts
        AND (
          (jobs.state = 'pending' AND jobs.next_attempt_at <= now())
          OR
          (jobs.state = 'leased' AND jobs.lease_expires_at <= now())
        )
      ORDER BY jobs.next_attempt_at ASC, jobs.created_at ASC, jobs.id ASC
      FOR UPDATE OF jobs SKIP LOCKED
      LIMIT ${options.limit}
    `);

    const now = Date.now();
    const leaseExpiresAt = new Date(now + options.leaseSeconds * 1_000);
    const claims: ClaimedRecordingJob[] = [];

    for (const candidate of rowsOf<ClaimCandidate>(selected)) {
      const leaseToken = randomBytes(32).toString('base64url');
      const attemptCount = candidate.attempt_count + 1;
      await transaction
        .update(recordingProcessingJobs)
        .set({
          state: 'leased',
          attemptCount,
          leaseOwner: options.workerId,
          leaseTokenHash: tokenHash(leaseToken),
          leaseExpiresAt,
          lastHeartbeatAt: new Date(now),
          nextAttemptAt: new Date(now),
          lastFailureCode: null,
          lastFailureMessage: null,
          updatedAt: new Date(now),
        })
        .where(eq(recordingProcessingJobs.id, candidate.job_id));

      claims.push({
        jobId: candidate.job_id,
        recordingId: candidate.recording_id,
        organisationId: candidate.organisation_id,
        broadcastId: candidate.broadcast_id,
        attemptCount,
        maxAttempts: candidate.max_attempts,
        leaseToken,
        leaseExpiresAt,
      });
    }

    return claims;
  });
}

export async function findActiveRecordingJobLease(
  db: DigiStreamDatabase,
  options: {
    jobId: string;
    workerId: string;
    leaseToken: string;
  },
): Promise<RecordingJobLease | null> {
  const result = await db.execute(sql<LeaseRow>`
    SELECT
      jobs.id AS job_id,
      jobs.recording_id,
      recordings.organisation_id,
      recordings.broadcast_id,
      jobs.attempt_count,
      jobs.max_attempts,
      jobs.lease_owner,
      jobs.lease_expires_at
    FROM recording_processing_jobs AS jobs
    INNER JOIN recordings ON recordings.id = jobs.recording_id
    WHERE jobs.id = ${options.jobId}
      AND jobs.state = 'leased'
      AND jobs.lease_owner = ${options.workerId}
      AND jobs.lease_token_hash = ${tokenHash(options.leaseToken)}
      AND jobs.lease_expires_at > now()
    LIMIT 1
  `);
  const row = rowsOf<LeaseRow>(result)[0];
  if (!row) return null;
  return {
    jobId: row.job_id,
    recordingId: row.recording_id,
    organisationId: row.organisation_id,
    broadcastId: row.broadcast_id,
    workerId: row.lease_owner,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    leaseExpiresAt: row.lease_expires_at,
  };
}

export async function heartbeatRecordingProcessingJob(
  db: DigiStreamDatabase,
  options: {
    jobId: string;
    workerId: string;
    leaseToken: string;
    extendSeconds: number;
  },
): Promise<Date | null> {
  const leaseExpiresAt = new Date(Date.now() + options.extendSeconds * 1_000);
  const result = await db.execute(sql<{ lease_expires_at: Date }>`
    UPDATE recording_processing_jobs
    SET
      lease_expires_at = ${leaseExpiresAt},
      last_heartbeat_at = now(),
      updated_at = now()
    WHERE id = ${options.jobId}
      AND state = 'leased'
      AND lease_owner = ${options.workerId}
      AND lease_token_hash = ${tokenHash(options.leaseToken)}
      AND lease_expires_at > now()
    RETURNING lease_expires_at
  `);
  return rowsOf<{ lease_expires_at: Date }>(result)[0]?.lease_expires_at ?? null;
}

export async function completeRecordingProcessingJob(
  db: DigiStreamDatabase,
  options: {
    jobId: string;
    workerId: string;
    leaseToken: string;
  },
): Promise<boolean> {
  const result = await db.execute(sql<{ id: string }>`
    UPDATE recording_processing_jobs
    SET
      state = 'completed',
      completed_at = now(),
      lease_owner = NULL,
      lease_token_hash = NULL,
      lease_expires_at = NULL,
      last_failure_code = NULL,
      last_failure_message = NULL,
      updated_at = now()
    WHERE id = ${options.jobId}
      AND state = 'leased'
      AND lease_owner = ${options.workerId}
      AND lease_token_hash = ${tokenHash(options.leaseToken)}
      AND lease_expires_at > now()
    RETURNING id
  `);
  return rowsOf<{ id: string }>(result).length === 1;
}

export async function failRecordingProcessingJob(
  db: DigiStreamDatabase,
  options: {
    jobId: string;
    workerId: string;
    leaseToken: string;
    failureCode: string;
    failureMessage: string;
  },
): Promise<RecordingJobFailureResult | null> {
  return db.transaction(async (transaction) => {
    const locked = await transaction.execute(sql<{
      attempt_count: number;
      max_attempts: number;
    }>`
      SELECT attempt_count, max_attempts
      FROM recording_processing_jobs
      WHERE id = ${options.jobId}
        AND state = 'leased'
        AND lease_owner = ${options.workerId}
        AND lease_token_hash = ${tokenHash(options.leaseToken)}
        AND lease_expires_at > now()
      FOR UPDATE
    `);
    const current = rowsOf<{
      attempt_count: number;
      max_attempts: number;
    }>(locked)[0];
    if (!current) return null;

    const exhausted = current.attempt_count >= current.max_attempts;
    const nextAttemptAt = exhausted
      ? null
      : new Date(Date.now() + retryDelayMs(current.attempt_count));

    await transaction
      .update(recordingProcessingJobs)
      .set({
        state: exhausted ? 'dead' : 'pending',
        nextAttemptAt: nextAttemptAt ?? new Date(),
        leaseOwner: null,
        leaseTokenHash: null,
        leaseExpiresAt: null,
        lastFailureCode: options.failureCode,
        lastFailureMessage: options.failureMessage,
        updatedAt: new Date(),
      })
      .where(eq(recordingProcessingJobs.id, options.jobId));

    return {
      state: exhausted ? 'dead' : 'pending',
      attemptCount: current.attempt_count,
      maxAttempts: current.max_attempts,
      nextAttemptAt,
    };
  });
}

export async function reconcileRecordingProcessingJobs(
  db: DigiStreamDatabase,
  limit: number,
): Promise<RecordingJobReconciliationSummary> {
  return db.transaction(async (transaction) => {
    const completed = await normaliseCompletedJobs(
      transaction as DigiStreamDatabase,
    );
    const expired = await transaction.execute(sql<ExpiredLeaseRow>`
      SELECT
        id AS job_id,
        attempt_count,
        max_attempts
      FROM recording_processing_jobs
      WHERE state = 'leased'
        AND lease_expires_at <= now()
      ORDER BY lease_expires_at ASC, id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    `);

    let rescheduled = 0;
    let exhausted = 0;
    for (const job of rowsOf<ExpiredLeaseRow>(expired)) {
      const isExhausted = job.attempt_count >= job.max_attempts;
      const nextAttemptAt = isExhausted
        ? new Date()
        : new Date(Date.now() + retryDelayMs(job.attempt_count));
      await transaction
        .update(recordingProcessingJobs)
        .set({
          state: isExhausted ? 'dead' : 'pending',
          nextAttemptAt,
          leaseOwner: null,
          leaseTokenHash: null,
          leaseExpiresAt: null,
          lastFailureCode: 'worker_lease_expired',
          lastFailureMessage:
            'The recording worker stopped heartbeating before the lease expired.',
          updatedAt: new Date(),
        })
        .where(eq(recordingProcessingJobs.id, job.job_id));
      if (isExhausted) exhausted += 1;
      else rescheduled += 1;
    }

    return { completed, rescheduled, exhausted };
  });
}
