# Analytics truth model

DigiStream analytics must be derived from persisted product state or measured telemetry. Empty or unsupported measurements are not replaced with estimates, sample values or inferred reach.

## Implemented organisation analytics

`GET /api/v1/organisations/:organisationId/analytics` is authenticated and uses the existing organisation membership/private-not-found boundary. It reports persisted product counts and measured playback evidence separately.

Persisted product counts include:

- organisation channel totals and lifecycle status counts;
- organisation broadcast totals and lifecycle status counts;
- distinct signed-in users with durable listening-history entries;
- durable signed-in listening-history entries;
- durable saved-broadcast records and distinct users who saved;
- a per-channel breakdown of broadcast count, distinct registered listeners with durable history, listening-history entries and saved-broadcast records.

Per-channel and organisation listener-library counts are derived only from `listening_history` and `saved_broadcasts`. They are not play counts and do not include anonymous listeners.

Measured playback evidence includes:

- browser playback sessions that emitted a real OvenPlayer `playing` event;
- current measured playback sessions whose server-received heartbeat is no older than 30 seconds;
- server-counted listening intervals between valid playing heartbeats, capped at 30 seconds per interval;
- buffering events reported by the real player;
- measured WebRTC-to-LL-HLS fallback events;
- media errors reported by the real player.

Playback telemetry is created only after DigiStream has authorized and issued a valid playback descriptor. A random 256-bit session token is returned to that browser; only the token's SHA-256 hash is stored. Public playback sessions are deliberately anonymous so stale or invalid sign-in state can never block a public listener. Member/private playback sessions may retain the already-authorized user identifier. No IP address or user-agent is stored by this telemetry model.

Telemetry events are accepted only for the matching session token. Tokens expire after 24 hours. Telemetry records are retained for 90 days by the current bounded cleanup policy.

## Metric definitions

- **Registered listeners** — distinct signed-in users with at least one durable listening-history entry in the selected scope.
- **Listening-history entries** — durable signed-in user/broadcast pairs. This does not measure number of plays or listening duration.
- **Saved broadcasts** — durable saved-broadcast records in the selected scope. This does not measure playback or reach.
- **Users who saved** — distinct signed-in users with at least one saved broadcast in the selected organisation.
- **Measured playback sessions** — browser playback sessions with at least one server-accepted `playing` event. Sessions are not unique people.
- **Active measured sessions** — measured sessions with no accepted end event and a server-received playing heartbeat within the previous 30 seconds. This is measured playback concurrency, not chat presence, websocket presence or a media-provider connection estimate.
- **Measured listening time** — the sum of bounded server-side intervals between accepted playing heartbeats. Paused, buffering, offline and missing-heartbeat time is not counted.
- **Playback health events** — buffering, WebRTC-to-LL-HLS fallback and media-error events emitted by the actual browser player.

## Explicitly unavailable measurements

DigiStream still does not claim measurements it cannot identify authoritatively:

- unique anonymous listener reach remains `not_collected` because anonymous playback sessions cannot be truthfully deduplicated into people;
- bitrate remains unavailable unless the player or media provider exposes an authoritative sample;
- jitter remains unavailable unless the player or media provider exposes an authoritative sample;
- packet loss remains unavailable unless the player or media provider exposes an authoritative sample;
- end-to-end playback latency remains unavailable until an authoritative timestamp path is implemented.

Buffering, fallback and media-error observations must not be relabeled as bitrate, jitter, packet loss or unique reach. Media-provider connection counts, socket presence and signed-in listening history must not be substituted for measured browser playback sessions.

## Creator Stats behaviour

The Creator Stats surface uses the organisation analytics API and keeps persisted product counts visually and semantically separate from measured playback evidence. It has loading, empty, retryable failure, session-expiry and private-not-found/access-change states. Unsupported measurements remain explicitly unavailable rather than being filled with sample values or estimates.
