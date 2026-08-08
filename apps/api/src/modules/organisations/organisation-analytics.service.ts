import type { DatabaseContext } from '../../db/client.js';

export type OrganisationAnalytics = {
  organisationId: string;
  channels: {
    total: number;
    byStatus: Record<string, number>;
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
  definitions: {
    registeredListeners: string;
    listeningHistoryEntries: string;
    savedBroadcasts: string;
    usersWhoSaved: string;
  };
  coverage: {
    anonymousListenerReach: 'not_collected';
    concurrentAudience: 'not_collected';
    listeningDuration: 'not_collected';
    streamQuality: 'not_collected';
  };
};

type CountRow = { count: string | number };
type StatusCountRow = { status: string; count: string | number };

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
  const [channels, broadcasts, registeredListeners, historyEntries, savedBroadcasts, usersWhoSaved] =
    await Promise.all([
      database.pool.query<StatusCountRow>(
        `select status::text as status, count(*)::int as count
           from channels
          where organisation_id = $1
            and deleted_at is null
          group by status
          order by status`,
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
    ]);

  const channelCounts = byStatus(channels.rows);
  const broadcastCounts = byStatus(broadcasts.rows);

  return {
    organisationId,
    channels: {
      total: Object.values(channelCounts).reduce((sum, value) => sum + value, 0),
      byStatus: channelCounts,
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
    definitions: {
      registeredListeners:
        'Distinct signed-in users with a durable listening-history entry for an organisation broadcast.',
      listeningHistoryEntries:
        'Durable signed-in user and broadcast pairs recorded in listening history. This is not play count or listening duration.',
      savedBroadcasts:
        'Durable saved-broadcast records for organisation broadcasts. This is not a playback or reach metric.',
      usersWhoSaved:
        'Distinct signed-in users with at least one saved broadcast for the organisation.',
    },
    coverage: {
      anonymousListenerReach: 'not_collected',
      concurrentAudience: 'not_collected',
      listeningDuration: 'not_collected',
      streamQuality: 'not_collected',
    },
  };
}
