import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseContext } from '../../db/client.js';

export type PlaybackTelemetryProtocol = 'webrtc' | 'llhls';
export type PlaybackTelemetryEvent =
  | 'started'
  | 'heartbeat'
  | 'paused'
  | 'buffering'
  | 'source_changed'
  | 'error'
  | 'ended';

export type PlaybackTelemetryDescriptor = {
  sessionId: string;
  token: string;
  endpoint: string;
  heartbeatIntervalMs: number;
};

type AcceptedRow = { id: string };

const TELEMETRY_SESSION_TTL_HOURS = 24;
const TELEMETRY_RETENTION_DAYS = 90;
export const PLAYBACK_TELEMETRY_HEARTBEAT_MS = 15_000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createPlaybackTelemetrySession(
  database: DatabaseContext,
  broadcastId: string,
  userId: string | null,
): Promise<PlaybackTelemetryDescriptor> {
  const sessionId = randomUUID();
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);

  await database.pool.query(
    `insert into listener_playback_sessions (id, broadcast_id, user_id, token_hash)
     values ($1, $2, $3, $4)`,
    [sessionId, broadcastId, userId, tokenHash],
  );

  // Retention is deliberately opportunistic so the runtime cannot accumulate
  // anonymous playback telemetry forever even when a separate cleanup worker is absent.
  await database.pool
    .query(
      `delete from listener_playback_sessions
        where issued_at < now() - ($1::text || ' days')::interval`,
      [TELEMETRY_RETENTION_DAYS],
    )
    .catch(() => undefined);

  return {
    sessionId,
    token,
    endpoint: `/api/v1/playback-telemetry/${sessionId}`,
    heartbeatIntervalMs: PLAYBACK_TELEMETRY_HEARTBEAT_MS,
  };
}

function eventUpdateSql(event: PlaybackTelemetryEvent): string {
  const addElapsed = `active_seconds = active_seconds + case
      when last_heartbeat_at is null then 0
      else least(30, greatest(0, floor(extract(epoch from (now() - last_heartbeat_at)))::int))
    end`;

  if (event === 'started' || event === 'heartbeat') {
    return `${addElapsed},
      started_at = coalesce(started_at, now()),
      last_heartbeat_at = now(),
      last_protocol = coalesce($3, last_protocol),
      last_event_at = now()`;
  }
  if (event === 'paused') {
    return `${addElapsed}, last_heartbeat_at = null, last_event_at = now()`;
  }
  if (event === 'buffering') {
    return `${addElapsed},
      last_heartbeat_at = null,
      buffering_events = buffering_events + 1,
      last_event_at = now()`;
  }
  if (event === 'source_changed') {
    return `fallback_events = fallback_events + case
        when last_protocol = 'webrtc' and $3 = 'llhls' then 1 else 0 end,
      last_protocol = coalesce($3, last_protocol),
      last_event_at = now()`;
  }
  if (event === 'error') {
    return `media_errors = media_errors + 1, last_event_at = now()`;
  }
  return `${addElapsed},
    last_heartbeat_at = null,
    ended_at = coalesce(ended_at, now()),
    last_event_at = now()`;
}

export async function recordPlaybackTelemetryEvent(
  database: DatabaseContext,
  input: {
    sessionId: string;
    token: string;
    event: PlaybackTelemetryEvent;
    protocol: PlaybackTelemetryProtocol | null;
  },
): Promise<boolean> {
  const tokenHash = hashToken(input.token);
  const update = eventUpdateSql(input.event);
  const result = await database.pool.query<AcceptedRow>(
    `update listener_playback_sessions
        set ${update}
      where id = $1
        and token_hash = $2
        and issued_at > now() - ($4::text || ' hours')::interval
        and (ended_at is null or $5 = 'ended')
      returning id`,
    [input.sessionId, tokenHash, input.protocol, TELEMETRY_SESSION_TTL_HOURS, input.event],
  );
  return result.rowCount === 1;
}
