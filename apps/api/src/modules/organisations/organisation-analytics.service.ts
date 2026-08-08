import type { DatabaseContext } from '../../db/client.js';

export type OrganisationAnalytics = {
  organisationId: string;
  channels: {
    total: number;
    byStatus: Record<string, number>;
    breakdown: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      visibility: string;
      broadcasts: number;
      registeredListeners: number;
      listeningHistoryEntries: number;
      savedBroadcasts: number;
    }>;
  };
  broadcasts: {
    total: number;
    byStatus: Record<string, number>;
  };
  audience: {
    registeredListeners: number;
    listeningHistoryEntries: number;
    savedBroadcasts: number;
    usersWhoSaved: number;
  };
  playback: {
    measuredSessions: number;
    anonymousSessions: number;
    signedInSessions: number;
    activeSessions: number;
    measuredListeningSeconds: number;
    bufferingEvents: number;
    fallbackEvents: number;
    mediaErrors: number;
    sessionsWithBuffering: number;
  };
  definitions: {
    registeredListeners: string;
    listeningHistoryEntries: string;
    savedBroadcasts: string;
    usersWhoSaved: string;
    channelBreakdown: string;
    measuredSessions: string;
    activeSessions: string;
    measuredListeningSeconds: string;
    streamQualityEvents: string;
  };
  coverage: {
    anonymousListenerReach: 'not_collected';
    concurrentAudience: 'measured_active_playback_sessions';
    listeningDuration: 'measured_server_heartbeat_intervals';
    streamQuality: 'measured_client_playback_events';
  };
};

type CountRow = { count: string | number };
type StatusCountRow = { status: string; count: string | number };
type ChannelAnalyticsRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  visibility: string;
  broadcasts: string | number;
  registered_listeners: string | number;
  listening_history_entries: string | number;
  saved_broadcasts: string | number;
};
type PlaybackAnalyticsRow = {
  measured_sessions: string | number;
  anonymous_sessions: string | number;
  signed_in_sessions: string | number;
  active_sessions: string | number;
  measured_listening_seconds: string | number;
  buffering_events: string | number;
  fallback_events: string | number;
  media_errors: string | number;
  sessions_with_buffering: string | number;
};

function count(value: string | number | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function byStatus(rows: StatusCountRow[]): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.status, count(row.count)]));
}

export async function getOrganisationAnalytics(
  database: DatabaseContext,
  organisationId: string,
): Promise<OrganisationAnalytics> {
  const [
    channels,
    channelBreakdown,
    broadcasts,
    registeredListeners,
    historyEntries,
    savedBroadcasts,
    usersWhoSaved,
    playbackTelemetry,
  ] = await Promise.all([
    database.pool.query<StatusCountRow>(
      `select status::text as status, count(*)::int as count
         from channels
        where organisation_id = $1
          and deleted_at is null
        group by status
        order by status`,
      [organisationId],
    ),
    database.pool.query<ChannelAnalyticsRow>(
      `select channel.id,
              channel.name,
              channel.slug,
              channel.status::text as status,
              channel.visibility::text as visibility,
              (select count(*)::int
                 from broadcasts broadcast
                where broadcast.channel_id = channel.id) as broadcasts,
              (select count(distinct history.user_id)::int
                 from listening_history history
                 join broadcasts broadcast on broadcast.id = history.broadcast_id
                where broadcast.channel_id = channel.id) as registered_listeners,
              (select count(*)::int
                 from listening_history history
                 join broadcasts broadcast on broadcast.id = history.broadcast_id
                where broadcast.channel_id = channel.id) as listening_history_entries,
              (select count(*)::int
                 from saved_broadcasts saved
                 join broadcasts broadcast on broadcast.id = saved.broadcast_id
                where broadcast.channel_id = channel.id) as saved_broadcasts
         from channels channel
        where channel.organisation_id = $1
          and channel.deleted_at is null
        order by channel.created_at desc, channel.id desc`,
      [organisationId],
    ),
    database.pool.query<StatusCountRow>(
      `select status::text as status, count(*)::int as count
         from broadcasts
        where organisation_id = $1
        group by status
        order by status`,
      [organisationId],
    ),
    database.pool.query<CountRow>(
      `select count(distinct history.user_id)::int as count
         from listening_history history
         join broadcasts broadcast on broadcast.id = history.broadcast_id
        where broadcast.organisation_id = $1`,
      [organisationId],
    ),
    database.pool.query<CountRow>(
      `select count(*)::int as count
         from listening_history history
         join broadcasts broadcast on broadcast.id = history.broadcast_id
        where broadcast.organisation_id = $1`,
      [organisationId],
    ),
    database.pool.query<CountRow>(
      `select count(*)::int as count
         from saved_broadcasts saved
         join broadcasts broadcast on broadcast.id = saved.broadcast_id
        where broadcast.organisation_id = $1`,
      [organisationId],
    ),
    database.pool.query<CountRow>(
      `select count(distinct saved.user_id)::int as count
         from saved_broadcasts saved
         join broadcasts broadcast on broadcast.id = saved.broadcast_id
        where broadcast.organisation_id = $1`,
      [organisationId],
    ),
    database.pool.query<PlaybackAnalyticsRow>(
      `select count(*) filter (where session.started_at is not null)::int as measured_sessions,
              count(*) filter (where session.started_at is not null and session.user_id is null)::int as anonymous_sessions,
              count(*) filter (where session.started_at is not null and session.user_id is not null)::int as signed_in_sessions,
              count(*) filter (
                where session.started_at is not null
                  and session.ended_at is null
                  and session.last_heartbeat_at > now() - interval '30 seconds'
              )::int as active_sessions,
              coalesce(sum(session.active_seconds) filter (where session.started_at is not null), 0)::bigint as measured_listening_seconds,
              coalesce(sum(session.buffering_events) filter (where session.started_at is not null), 0)::bigint as buffering_events,
              coalesce(sum(session.fallback_events) filter (where session.started_at is not null), 0)::bigint as fallback_events,
              coalesce(sum(session.media_errors) filter (where session.started_at is not null), 0)::bigint as media_errors,
              count(*) filter (where session.started_at is not null and session.buffering_events > 0)::int as sessions_with_buffering
         from listener_playback_sessions session
         join broadcasts broadcast on broadcast.id = session.broadcast_id
        where broadcast.organisation_id = $1`,
      [organisationId],
    ),
  ]);

  const channelCounts = byStatus(channels.rows);
  const broadcastCounts = byStatus(broadcasts.rows);
  const measured = playbackTelemetry.rows[0];

  return {
    organisationId,
    channels: {
      total: Object.values(channelCounts).reduce((sum, value) => sum + value, 0),
      byStatus: channelCounts,
      breakdown: channelBreakdown.rows.map((channel) => ({
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        status: channel.status,
        visibility: channel.visibility,
        broadcasts: count(channel.broadcasts),
        registeredListeners: count(channel.registered_listeners),
        listeningHistoryEntries: count(channel.listening_history_entries),
        savedBroadcasts: count(channel.saved_broadcasts),
      })),
    },
    broadcasts: {
      total: Object.values(broadcastCounts).reduce((sum, value) => sum + value, 0),
      byStatus: broadcastCounts,
    },
    audience: {
      registeredListeners: count(registeredListeners.rows[0]?.count),
      listeningHistoryEntries: count(historyEntries.rows[0]?.count),
      savedBroadcasts: count(savedBroadcasts.rows[0]?.count),
      usersWhoSaved: count(usersWhoSaved.rows[0]?.count),
    },
    playback: {
      measuredSessions: count(measured?.measured_sessions),
      anonymousSessions: count(measured?.anonymous_sessions),
      signedInSessions: count(measured?.signed_in_sessions),
      activeSessions: count(measured?.active_sessions),
      measuredListeningSeconds: count(measured?.measured_listening_seconds),
      bufferingEvents: count(measured?.buffering_events),
      fallbackEvents: count(measured?.fallback_events),
      mediaErrors: count(measured?.media_errors),
      sessionsWithBuffering: count(measured?.sessions_with_buffering),
    },
    definitions: {
      registeredListeners:
        'Distinct signed-in users with a durable listening-history entry for an organisation broadcast.',
      listeningHistoryEntries:
        'Durable signed-in user and broadcast pairs recorded in listening history. This is not play count or listening duration.',
      savedBroadcasts:
        'Durable saved-broadcast records for organisation broadcasts. This is not a playback or reach metric.',
      usersWhoSaved:
        'Distinct signed-in users with at least one saved broadcast for the organisation.',
      channelBreakdown:
        'Per-channel counts use the same persisted signed-in listener, listening-history and saved-broadcast records. They do not represent anonymous reach, plays, duration or concurrency.',
      measuredSessions:
        'Browser playback sessions that emitted at least one real playing event after receiving a valid short-lived DigiStream playback descriptor. Sessions are not unique people.',
      activeSessions:
        'Measured playback sessions with a server-received playing heartbeat in the last 30 seconds. This is current measured playback concurrency, not socket or chat presence.',
      measuredListeningSeconds:
        'Server-counted playing intervals between valid playback heartbeats, capped at 30 seconds per interval. Paused, buffering, offline and missing-heartbeat time is not counted.',
      streamQualityEvents:
        'Buffering, WebRTC-to-LL-HLS fallback and media-error counts emitted by the real browser player. Bitrate, jitter and packet loss are not inferred when the player does not report them.',
    },
    coverage: {
      anonymousListenerReach: 'not_collected',
      concurrentAudience: 'measured_active_playback_sessions',
      listeningDuration: 'measured_server_heartbeat_intervals',
      streamQuality: 'measured_client_playback_events',
    },
  };
}
