import type { Pool, QueryResultRow } from 'pg';
import type { ObjectStorageInventoryItem } from '../storage/object-storage.js';

export type RecordingOrphanStatus =
  | 'detected'
  | 'quarantining'
  | 'quarantined'
  | 'cleaning'
  | 'failed'
  | 'resolved';

export type RecordingOrphanResolution =
  | 'deleted'
  | 'restored'
  | 'missing'
  | 'recorded';

export type RecordingOrphanRecord = {
  originalKey: string;
  quarantineKey: string;
  status: RecordingOrphanStatus;
  sizeBytes: number;
  sourceEtag: string | null;
  sourceLastModified: Date | null;
  detectedAt: Date;
  quarantinedAt: Date | null;
  cleanupAfter: Date;
  resolvedAt: Date | null;
  resolution: RecordingOrphanResolution | null;
  attemptCount: number;
  lastError: string | null;
  updatedAt: Date;
};

type OrphanRow = QueryResultRow & {
  original_key: string;
  quarantine_key: string;
  status: RecordingOrphanStatus;
  size_bytes: string | number;
  source_etag: string | null;
  source_last_modified: Date | null;
  detected_at: Date;
  quarantined_at: Date | null;
  cleanup_after: Date;
  resolved_at: Date | null;
  resolution: RecordingOrphanResolution | null;
  attempt_count: number;
  last_error: string | null;
  updated_at: Date;
};

function safeInteger(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error('Recording orphan query returned an invalid object size.');
  }
  return parsed;
}

function toRecord(row: OrphanRow): RecordingOrphanRecord {
  return {
    originalKey: row.original_key,
    quarantineKey: row.quarantine_key,
    status: row.status,
    sizeBytes: safeInteger(row.size_bytes),
    sourceEtag: row.source_etag,
    sourceLastModified: row.source_last_modified,
    detectedAt: row.detected_at,
    quarantinedAt: row.quarantined_at,
    cleanupAfter: row.cleanup_after,
    resolvedAt: row.resolved_at,
    resolution: row.resolution,
    attemptCount: row.attempt_count,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  };
}

export async function findKnownRecordingStorageKeys(
  pool: Pool,
  keys: string[],
): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const result = await pool.query<{ storage_key: string }>(
    `select storage_key
     from recordings
     where storage_key = any($1::text[])`,
    [keys],
  );
  return new Set(result.rows.map((row) => row.storage_key));
}

export async function detectRecordingOrphan(
  pool: Pool,
  item: ObjectStorageInventoryItem,
  quarantineKey: string,
  cleanupAfter: Date,
): Promise<RecordingOrphanRecord> {
  const result = await pool.query<OrphanRow>(
    `insert into recording_orphan_quarantine (
       original_key,
       quarantine_key,
       size_bytes,
       source_etag,
       source_last_modified,
       cleanup_after
     ) values ($1, $2, $3, $4, $5, $6)
     on conflict (original_key) do update
       set size_bytes = excluded.size_bytes,
           source_etag = excluded.source_etag,
           source_last_modified = excluded.source_last_modified,
           updated_at = now()
     returning *`,
    [
      item.key,
      quarantineKey,
      item.sizeBytes,
      item.etag,
      item.lastModified,
      cleanupAfter,
    ],
  );
  return toRecord(result.rows[0] as OrphanRow);
}

export async function claimRecordingOrphanQuarantine(
  pool: Pool,
  originalKey: string,
): Promise<RecordingOrphanRecord | null> {
  const result = await pool.query<OrphanRow>(
    `update recording_orphan_quarantine
     set status = 'quarantining',
         attempt_count = attempt_count + 1,
         last_error = null,
         updated_at = now()
     where original_key = $1
       and quarantined_at is null
       and (
         status in ('detected', 'failed')
         or (status = 'quarantining' and updated_at < now() - interval '15 minutes')
       )
     returning *`,
    [originalKey],
  );
  return result.rows[0] ? toRecord(result.rows[0]) : null;
}

export async function completeRecordingOrphanQuarantine(
  pool: Pool,
  originalKey: string,
): Promise<void> {
  await pool.query(
    `update recording_orphan_quarantine
     set status = 'quarantined',
         quarantined_at = coalesce(quarantined_at, now()),
         last_error = null,
         updated_at = now()
     where original_key = $1`,
    [originalKey],
  );
}

export async function failRecordingOrphanAttempt(
  pool: Pool,
  originalKey: string,
  message: string,
): Promise<void> {
  await pool.query(
    `update recording_orphan_quarantine
     set status = 'failed',
         last_error = left($2, 1000),
         updated_at = now()
     where original_key = $1 and status <> 'resolved'`,
    [originalKey, message],
  );
}

export async function claimDueRecordingOrphanCleanup(
  pool: Pool,
  limit: number,
): Promise<RecordingOrphanRecord[]> {
  const result = await pool.query<OrphanRow>(
    `with candidates as (
       select original_key
       from recording_orphan_quarantine
       where quarantined_at is not null
         and cleanup_after <= now()
         and (
           status in ('quarantined', 'failed')
           or (status = 'cleaning' and updated_at < now() - interval '15 minutes')
         )
       order by cleanup_after, original_key
       for update skip locked
       limit $1
     )
     update recording_orphan_quarantine orphan
     set status = 'cleaning',
         attempt_count = attempt_count + 1,
         last_error = null,
         updated_at = now()
     from candidates
     where orphan.original_key = candidates.original_key
     returning orphan.*`,
    [limit],
  );
  return result.rows.map(toRecord);
}

export async function resolveRecordingOrphan(
  pool: Pool,
  originalKey: string,
  resolution: RecordingOrphanResolution,
): Promise<void> {
  await pool.query(
    `update recording_orphan_quarantine
     set status = 'resolved',
         resolved_at = now(),
         resolution = $2,
         last_error = null,
         updated_at = now()
     where original_key = $1`,
    [originalKey, resolution],
  );
}

export async function listRecordingOrphanRecords(
  pool: Pool,
  limit: number,
): Promise<RecordingOrphanRecord[]> {
  const result = await pool.query<OrphanRow>(
    `select *
     from recording_orphan_quarantine
     order by updated_at desc, original_key
     limit $1`,
    [limit],
  );
  return result.rows.map(toRecord);
}
