import type { Pool, PoolClient, QueryResultRow } from 'pg';

export type RecordingRetentionRecord = {
  recordingId: string;
  organisationId: string;
  status: string;
  storageKey: string;
  contentType: string | null;
  sizeBytes: number | null;
  checksumSha256: string | null;
  retentionUntil: Date | null;
  deletionRequestedAt: Date | null;
  purgeAfter: Date | null;
  legalHoldAt: Date | null;
  legalHoldReason: string | null;
  moderationHoldAt: Date | null;
  moderationHoldReason: string | null;
  purgeStartedAt: Date | null;
  purgedAt: Date | null;
  purgeResult: 'deleted' | 'missing' | null;
  purgeAttemptCount: number;
  lastPurgeError: string | null;
  updatedAt: Date;
};

type RetentionRow = QueryResultRow & {
  recording_id: string;
  organisation_id: string;
  status: string;
  storage_key: string;
  content_type: string | null;
  size_bytes: string | number | null;
  checksum_sha256: string | null;
  retention_until: Date | null;
  deletion_requested_at: Date | null;
  purge_after: Date | null;
  legal_hold_at: Date | null;
  legal_hold_reason: string | null;
  moderation_hold_at: Date | null;
  moderation_hold_reason: string | null;
  purge_started_at: Date | null;
  purged_at: Date | null;
  purge_result: 'deleted' | 'missing' | null;
  purge_attempt_count: number;
  last_purge_error: string | null;
  updated_at: Date;
};

function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function toRecord(row: RetentionRow): RecordingRetentionRecord {
  return {
    recordingId: row.recording_id,
    organisationId: row.organisation_id,
    status: row.status,
    storageKey: row.storage_key,
    contentType: row.content_type,
    sizeBytes: toNumber(row.size_bytes),
    checksumSha256: row.checksum_sha256,
    retentionUntil: row.retention_until,
    deletionRequestedAt: row.deletion_requested_at,
    purgeAfter: row.purge_after,
    legalHoldAt: row.legal_hold_at,
    legalHoldReason: row.legal_hold_reason,
    moderationHoldAt: row.moderation_hold_at,
    moderationHoldReason: row.moderation_hold_reason,
    purgeStartedAt: row.purge_started_at,
    purgedAt: row.purged_at,
    purgeResult: row.purge_result,
    purgeAttemptCount: row.purge_attempt_count,
    lastPurgeError: row.last_purge_error,
    updatedAt: row.updated_at,
  };
}

const retentionSelection = `
  select
    controls.recording_id,
    recordings.organisation_id,
    recordings.status,
    recordings.storage_key,
    recordings.content_type,
    recordings.size_bytes,
    recordings.checksum_sha256,
    controls.retention_until,
    controls.deletion_requested_at,
    controls.purge_after,
    controls.legal_hold_at,
    controls.legal_hold_reason,
    controls.moderation_hold_at,
    controls.moderation_hold_reason,
    controls.purge_started_at,
    controls.purged_at,
    controls.purge_result,
    controls.purge_attempt_count,
    controls.last_purge_error,
    controls.updated_at
  from recording_retention_controls controls
  inner join recordings on recordings.id = controls.recording_id
`;

async function loadRecord(
  client: Pool | PoolClient,
  organisationId: string,
  recordingId: string,
  lock: boolean,
): Promise<RecordingRetentionRecord | null> {
  const result = await client.query<RetentionRow>(
    `${retentionSelection}
     where recordings.organisation_id = $1 and recordings.id = $2
     ${lock ? 'for update of controls, recordings' : ''}`,
    [organisationId, recordingId],
  );
  return result.rows[0] ? toRecord(result.rows[0]) : null;
}

export async function findRecordingRetentionRecord(
  pool: Pool,
  organisationId: string,
  recordingId: string,
): Promise<RecordingRetentionRecord | null> {
  return loadRecord(pool, organisationId, recordingId, false);
}

export async function mutateRecordingRetentionRecord<T>(
  pool: Pool,
  organisationId: string,
  recordingId: string,
  mutate: (
    client: PoolClient,
    current: RecordingRetentionRecord,
  ) => Promise<T>,
): Promise<T | null> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const current = await loadRecord(client, organisationId, recordingId, true);
    if (!current) {
      await client.query('rollback');
      return null;
    }
    const result = await mutate(client, current);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function claimDueRecordingPurges(
  pool: Pool,
  limit: number,
): Promise<RecordingRetentionRecord[]> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const candidates = await client.query<RetentionRow>(
      `${retentionSelection}
       where controls.deletion_requested_at is not null
         and controls.purge_after <= now()
         and controls.purged_at is null
         and controls.legal_hold_at is null
         and controls.moderation_hold_at is null
         and (
           controls.purge_started_at is null
           or controls.purge_started_at < now() - interval '15 minutes'
         )
         and recordings.status <> 'deleted'
       order by controls.purge_after, controls.recording_id
       for update of controls skip locked
       limit $1`,
      [limit],
    );

    const claimed: RecordingRetentionRecord[] = [];
    for (const row of candidates.rows) {
      const updated = await client.query<RetentionRow>(
        `${retentionSelection}
         where controls.recording_id = $1
         for update of controls`,
        [row.recording_id],
      );
      await client.query(
        `update recording_retention_controls
         set purge_started_at = now(),
             purge_attempt_count = purge_attempt_count + 1,
             last_purge_error = null,
             updated_at = now()
         where recording_id = $1`,
        [row.recording_id],
      );
      if (updated.rows[0]) {
        const record = toRecord(updated.rows[0]);
        claimed.push({
          ...record,
          purgeStartedAt: new Date(),
          purgeAttemptCount: record.purgeAttemptCount + 1,
          lastPurgeError: null,
        });
      }
    }

    await client.query('commit');
    return claimed;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function completeRecordingPurge(
  pool: Pool,
  recordingId: string,
  result: 'deleted' | 'missing',
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(
      `update recording_retention_controls
       set purged_at = now(),
           purge_result = $2,
           purge_started_at = null,
           last_purge_error = null,
           updated_at = now()
       where recording_id = $1`,
      [recordingId, result],
    );
    await client.query(
      `update recordings
       set status = 'deleted', deleted_at = coalesce(deleted_at, now()), updated_at = now()
       where id = $1`,
      [recordingId],
    );
    await client.query(
      `update recording_processing_jobs
       set state = 'completed',
           lease_owner = null,
           lease_token_hash = null,
           lease_expires_at = null,
           completed_at = coalesce(completed_at, now()),
           updated_at = now()
       where recording_id = $1`,
      [recordingId],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function failRecordingPurge(
  pool: Pool,
  recordingId: string,
  errorMessage: string,
): Promise<void> {
  await pool.query(
    `update recording_retention_controls
     set purge_started_at = null,
         last_purge_error = $2,
         updated_at = now()
     where recording_id = $1 and purged_at is null`,
    [recordingId, errorMessage.slice(0, 1000)],
  );
}
