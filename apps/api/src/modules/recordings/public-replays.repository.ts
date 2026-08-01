import type { Pool, QueryResultRow } from 'pg';

export type ReplayVisibility = 'public' | 'unlisted' | 'private';

export type ReplayRecord = {
  recordingId: string;
  organisationId: string;
  channelId: string;
  broadcastId: string;
  title: string;
  broadcastSlug: string;
  description: string | null;
  endedAt: Date | null;
  publishedAt: Date | null;
  mediaFormat: string;
  contentType: string;
  sizeBytes: number;
  durationMs: number;
  organisationName: string;
  organisationSlug: string;
  channelName: string;
  channelSlug: string;
  channelCategory: string | null;
  channelVisibility: ReplayVisibility;
  updatedAt: Date;
};

type ReplayRow = QueryResultRow & {
  recording_id: string;
  organisation_id: string;
  channel_id: string;
  broadcast_id: string;
  title: string;
  broadcast_slug: string;
  description: string | null;
  ended_at: Date | null;
  published_at: Date | null;
  media_format: string;
  content_type: string;
  size_bytes: string | number;
  duration_ms: string | number;
  organisation_name: string;
  organisation_slug: string;
  channel_name: string;
  channel_slug: string;
  channel_category: string | null;
  channel_visibility: ReplayVisibility;
  updated_at: Date;
};

const replaySelection = `
  select
    recordings.id as recording_id,
    recordings.organisation_id,
    recordings.channel_id,
    recordings.broadcast_id,
    broadcasts.title,
    broadcasts.slug as broadcast_slug,
    broadcasts.description,
    broadcasts.ended_at,
    recordings.published_at,
    recordings.media_format,
    recordings.content_type,
    recordings.size_bytes,
    recordings.duration_ms,
    organisations.name as organisation_name,
    organisations.slug as organisation_slug,
    channels.name as channel_name,
    channels.slug as channel_slug,
    channels.category as channel_category,
    channels.visibility as channel_visibility,
    recordings.updated_at
  from recordings
  inner join broadcasts on broadcasts.id = recordings.broadcast_id
  inner join channels on channels.id = recordings.channel_id
  inner join organisations on organisations.id = recordings.organisation_id
  inner join recording_retention_controls controls
    on controls.recording_id = recordings.id
`;

const playableConditions = `
  recordings.ready_at is not null
  and recordings.media_format is not null
  and recordings.content_type is not null
  and recordings.size_bytes is not null
  and recordings.size_bytes > 0
  and recordings.duration_ms is not null
  and recordings.duration_ms > 0
  and recordings.checksum_sha256 is not null
  and broadcasts.status = 'completed'
  and channels.status = 'active'
  and controls.deletion_requested_at is null
  and controls.purge_started_at is null
  and controls.purged_at is null
  and controls.legal_hold_at is null
  and controls.moderation_hold_at is null
`;

function numberValue(value: string | number, field: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Replay query returned an invalid ${field}.`);
  }
  return parsed;
}

function toReplayRecord(row: ReplayRow): ReplayRecord {
  return {
    recordingId: row.recording_id,
    organisationId: row.organisation_id,
    channelId: row.channel_id,
    broadcastId: row.broadcast_id,
    title: row.title,
    broadcastSlug: row.broadcast_slug,
    description: row.description,
    endedAt: row.ended_at,
    publishedAt: row.published_at,
    mediaFormat: row.media_format,
    contentType: row.content_type,
    sizeBytes: numberValue(row.size_bytes, 'size'),
    durationMs: numberValue(row.duration_ms, 'duration'),
    organisationName: row.organisation_name,
    organisationSlug: row.organisation_slug,
    channelName: row.channel_name,
    channelSlug: row.channel_slug,
    channelCategory: row.channel_category,
    channelVisibility: row.channel_visibility,
    updatedAt: row.updated_at,
  };
}

export async function listPublicReplayRecords(
  pool: Pool,
  limit: number,
): Promise<ReplayRecord[]> {
  const result = await pool.query<ReplayRow>(
    `${replaySelection}
     where recordings.status = 'published'
       and channels.visibility = 'public'
       and ${playableConditions}
     order by coalesce(recordings.published_at, recordings.ready_at) desc,
              recordings.id desc
     limit $1`,
    [limit],
  );
  return result.rows.map(toReplayRecord);
}

export async function findPublicReplayRecord(
  pool: Pool,
  organisationSlug: string,
  channelSlug: string,
  broadcastSlug: string,
): Promise<ReplayRecord | null> {
  const result = await pool.query<ReplayRow>(
    `${replaySelection}
     where organisations.slug = $1
       and channels.slug = $2
       and broadcasts.slug = $3
       and recordings.status = 'published'
       and channels.visibility in ('public', 'unlisted')
       and ${playableConditions}
     limit 1`,
    [organisationSlug, channelSlug, broadcastSlug],
  );
  return result.rows[0] ? toReplayRecord(result.rows[0]) : null;
}

export async function findMemberReplayRecord(
  pool: Pool,
  organisationId: string,
  recordingId: string,
): Promise<ReplayRecord | null> {
  const result = await pool.query<ReplayRow>(
    `${replaySelection}
     where recordings.organisation_id = $1
       and recordings.id = $2
       and recordings.status in ('published', 'private')
       and ${playableConditions}
     limit 1`,
    [organisationId, recordingId],
  );
  return result.rows[0] ? toReplayRecord(result.rows[0]) : null;
}
