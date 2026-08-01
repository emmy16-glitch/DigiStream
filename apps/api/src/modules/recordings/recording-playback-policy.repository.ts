import type { Pool, QueryResultRow } from 'pg';

export type RecordingPlaybackPolicy = {
  exists: boolean;
  allowed: boolean;
};

type PolicyRow = QueryResultRow & {
  recording_status: string;
  ready_at: Date | null;
  content_type: string | null;
  media_format: string | null;
  size_bytes: string | number | null;
  checksum_sha256: string | null;
  broadcast_status: string;
  channel_status: string;
  deletion_requested_at: Date | null;
  purge_started_at: Date | null;
  purged_at: Date | null;
  legal_hold_at: Date | null;
  moderation_hold_at: Date | null;
};

export async function findRecordingPlaybackPolicy(
  pool: Pool,
  organisationId: string,
  recordingId: string,
): Promise<RecordingPlaybackPolicy> {
  const result = await pool.query<PolicyRow>(
    `select
       recordings.status as recording_status,
       recordings.ready_at,
       recordings.content_type,
       recordings.media_format,
       recordings.size_bytes,
       recordings.checksum_sha256,
       broadcasts.status as broadcast_status,
       channels.status as channel_status,
       controls.deletion_requested_at,
       controls.purge_started_at,
       controls.purged_at,
       controls.legal_hold_at,
       controls.moderation_hold_at
     from recordings
     inner join broadcasts on broadcasts.id = recordings.broadcast_id
     inner join channels on channels.id = recordings.channel_id
     inner join recording_retention_controls controls
       on controls.recording_id = recordings.id
     where recordings.organisation_id = $1
       and recordings.id = $2
     limit 1`,
    [organisationId, recordingId],
  );

  const row = result.rows[0];
  if (!row) return { exists: false, allowed: false };
  const sizeBytes =
    row.size_bytes === null
      ? null
      : typeof row.size_bytes === 'number'
        ? row.size_bytes
        : Number(row.size_bytes);

  return {
    exists: true,
    allowed:
      (row.recording_status === 'published' ||
        row.recording_status === 'private') &&
      row.ready_at !== null &&
      typeof row.content_type === 'string' &&
      typeof row.media_format === 'string' &&
      Number.isSafeInteger(sizeBytes) &&
      (sizeBytes ?? 0) > 0 &&
      typeof row.checksum_sha256 === 'string' &&
      row.broadcast_status === 'completed' &&
      row.channel_status === 'active' &&
      row.deletion_requested_at === null &&
      row.purge_started_at === null &&
      row.purged_at === null &&
      row.legal_hold_at === null &&
      row.moderation_hold_at === null,
  };
}
