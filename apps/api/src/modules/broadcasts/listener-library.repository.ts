import type { Pool, QueryResultRow } from 'pg';

export type ListenerLibraryBroadcast = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  scheduledStartAt: Date | null;
  liveStartedAt: Date | null;
  endedAt: Date | null;
  organisation: { id: string; name: string; slug: string };
  channel: { id: string; name: string; slug: string; category: string | null };
};

export type SavedBroadcastItem = ListenerLibraryBroadcast & { savedAt: Date };
export type ListeningHistoryItem = ListenerLibraryBroadcast & { lastListenedAt: Date };

type BroadcastRow = QueryResultRow & {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  scheduled_start_at: Date | null;
  live_started_at: Date | null;
  ended_at: Date | null;
  organisation_id: string;
  organisation_name: string;
  organisation_slug: string;
  channel_id: string;
  channel_name: string;
  channel_slug: string;
  channel_category: string | null;
};

type SavedRow = BroadcastRow & { saved_at: Date };
type HistoryRow = BroadcastRow & { last_listened_at: Date };

const broadcastColumns = `
  broadcasts.id,
  broadcasts.title,
  broadcasts.slug,
  broadcasts.description,
  broadcasts.status,
  broadcasts.scheduled_start_at,
  broadcasts.live_started_at,
  broadcasts.ended_at,
  organisations.id as organisation_id,
  organisations.name as organisation_name,
  organisations.slug as organisation_slug,
  channels.id as channel_id,
  channels.name as channel_name,
  channels.slug as channel_slug,
  channels.category as channel_category
`;

const accessibleConditions = `
  broadcasts.status in ('scheduled', 'starting', 'live', 'reconnecting', 'ending', 'completed')
  and channels.status = 'active'
  and channels.deleted_at is null
  and (
    channels.visibility in ('public', 'unlisted')
    or exists (
      select 1
      from organisation_memberships
      where organisation_memberships.organisation_id = broadcasts.organisation_id
        and organisation_memberships.user_id = $1
    )
  )
`;

function toBroadcast(row: BroadcastRow): ListenerLibraryBroadcast {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    scheduledStartAt: row.scheduled_start_at,
    liveStartedAt: row.live_started_at,
    endedAt: row.ended_at,
    organisation: {
      id: row.organisation_id,
      name: row.organisation_name,
      slug: row.organisation_slug,
    },
    channel: {
      id: row.channel_id,
      name: row.channel_name,
      slug: row.channel_slug,
      category: row.channel_category,
    },
  };
}

export async function canAccessListenerLibraryBroadcast(
  pool: Pool,
  userId: string,
  broadcastId: string,
): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    `select broadcasts.id
     from broadcasts
     inner join channels on channels.id = broadcasts.channel_id
     where broadcasts.id = $2
       and ${accessibleConditions}
     limit 1`,
    [userId, broadcastId],
  );
  return Boolean(result.rows[0]);
}

export async function saveBroadcast(
  pool: Pool,
  userId: string,
  broadcastId: string,
): Promise<Date> {
  const result = await pool.query<{ saved_at: Date }>(
    `insert into saved_broadcasts (user_id, broadcast_id)
     values ($1, $2)
     on conflict (user_id, broadcast_id)
     do update set saved_at = saved_broadcasts.saved_at
     returning saved_at`,
    [userId, broadcastId],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Saved broadcast write returned no row.');
  return row.saved_at;
}

export async function removeSavedBroadcast(
  pool: Pool,
  userId: string,
  broadcastId: string,
): Promise<void> {
  await pool.query(
    'delete from saved_broadcasts where user_id = $1 and broadcast_id = $2',
    [userId, broadcastId],
  );
}

export async function listSavedBroadcasts(
  pool: Pool,
  userId: string,
  limit: number,
): Promise<SavedBroadcastItem[]> {
  const result = await pool.query<SavedRow>(
    `select ${broadcastColumns}, saved_broadcasts.saved_at
     from saved_broadcasts
     inner join broadcasts on broadcasts.id = saved_broadcasts.broadcast_id
     inner join organisations on organisations.id = broadcasts.organisation_id
     inner join channels on channels.id = broadcasts.channel_id
     where saved_broadcasts.user_id = $1
       and ${accessibleConditions}
     order by saved_broadcasts.saved_at desc, broadcasts.id desc
     limit $2`,
    [userId, limit],
  );
  return result.rows.map((row) => ({ ...toBroadcast(row), savedAt: row.saved_at }));
}

export async function recordListeningHistory(
  pool: Pool,
  userId: string,
  broadcastId: string,
): Promise<Date> {
  const result = await pool.query<{ last_listened_at: Date }>(
    `insert into listening_history (user_id, broadcast_id)
     values ($1, $2)
     on conflict (user_id, broadcast_id)
     do update set last_listened_at = now()
     returning last_listened_at`,
    [userId, broadcastId],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Listening history write returned no row.');
  return row.last_listened_at;
}

export async function listListeningHistory(
  pool: Pool,
  userId: string,
  limit: number,
): Promise<ListeningHistoryItem[]> {
  const result = await pool.query<HistoryRow>(
    `select ${broadcastColumns}, listening_history.last_listened_at
     from listening_history
     inner join broadcasts on broadcasts.id = listening_history.broadcast_id
     inner join organisations on organisations.id = broadcasts.organisation_id
     inner join channels on channels.id = broadcasts.channel_id
     where listening_history.user_id = $1
       and ${accessibleConditions}
     order by listening_history.last_listened_at desc, broadcasts.id desc
     limit $2`,
    [userId, limit],
  );
  return result.rows.map((row) => ({
    ...toBroadcast(row),
    lastListenedAt: row.last_listened_at,
  }));
}

export async function clearListeningHistory(
  pool: Pool,
  userId: string,
): Promise<void> {
  await pool.query('delete from listening_history where user_id = $1', [userId]);
}
