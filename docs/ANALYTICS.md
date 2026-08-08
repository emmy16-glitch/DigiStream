# Analytics truth model

DigiStream analytics must be derived from persisted product state or measured telemetry. Empty or unsupported measurements are not replaced with estimates, sample values or inferred reach.

## Implemented organisation analytics

`GET /api/v1/organisations/:organisationId/analytics` is authenticated and uses the existing organisation membership/private-not-found boundary. It currently reports:

- organisation channel totals and lifecycle status counts;
- organisation broadcast totals and lifecycle status counts;
- distinct signed-in users with durable listening-history entries;
- durable signed-in listening-history entries;
- durable saved-broadcast records and distinct users who saved;
- a per-channel breakdown of broadcast count, distinct registered listeners with durable history, listening-history entries and saved-broadcast records.

Per-channel and organisation audience counts are derived only from `listening_history` and `saved_broadcasts`. They are not play counts and do not include anonymous listeners.

## Metric definitions

- **Registered listeners** — distinct signed-in users with at least one durable listening-history entry in the selected scope.
- **Listening-history entries** — durable signed-in user/broadcast pairs. This does not measure number of plays or listening duration.
- **Saved broadcasts** — durable saved-broadcast records in the selected scope. This does not measure playback or reach.
- **Users who saved** — distinct signed-in users with at least one saved broadcast in the selected organisation.

## Explicitly unavailable measurements

The analytics API returns `not_collected` for measurements DigiStream does not yet truthfully collect:

- anonymous listener reach;
- concurrent audience;
- listening duration;
- stream quality.

These fields must remain unavailable until an authoritative collection path, retention policy, aggregation definition and automated verification exist. Media listener counts, socket presence and signed-in listening history must not be substituted for one another.

## Remaining Phase 9 scope

Before Stats navigation can be considered complete, the Creator UI still needs loading, empty, failure and authorization states backed by the analytics API. Audience and stream-quality telemetry require measured collection rather than database inference. Administrative reporting and moderation queues remain separate runtime work.
