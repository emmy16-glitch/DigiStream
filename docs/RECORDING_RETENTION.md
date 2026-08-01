# Recording retention, holds and protected cleanup

This Phase 8 slice adds explicit retention controls and a safe deletion path for stored recordings. It builds on verified object storage, authorised delivery and durable recording-job reconciliation.

## Retention control

Every recording receives one `recording_retention_controls` row through a PostgreSQL trigger. Existing recordings are backfilled during migration.

The control records:

- optional retention deadline;
- deletion request and purge deadline;
- legal hold and reason;
- moderation hold and reason;
- purge attempts, outcome and last error;
- timestamps for cleanup start and completion.

No default destructive retention period is imposed. A recording is retained indefinitely until an owner or administrator explicitly schedules deletion.

A retention deadline is authoritative. When deletion is requested before that deadline, DigiStream automatically moves the effective purge time to the retention deadline instead of allowing the shorter deletion schedule to bypass it. Extending retention on an already scheduled recording also extends its purge deadline.

## Permissions

Authenticated organisation members may read retention state.

Owners and administrators may:

- set or clear the retention deadline;
- schedule deletion with a minimum 24-hour grace period;
- cancel an uncompleted deletion request;
- set or clear a legal hold;
- set or clear a moderation hold.

Moderators may set or clear only the moderation hold. Broadcasters and analysts cannot schedule deletion or manage legal holds.

Cross-tenant access preserves the existing private not-found behaviour.

## Holds and deletion safety

A legal or moderation hold blocks cleanup even when the purge deadline has passed. New deletion requests are rejected while either hold is active.

Scheduling deletion immediately archives the recording. This revokes new playback and download grants before the object is permanently removed. Cancelling deletion does not automatically republish the recording; visibility must be restored through the existing explicit recording-management flow.

Cleanup claims and retention mutations lock the same database row. After cleanup has claimed a recording, cancellation, retention changes and new holds are rejected until that cleanup attempt finishes. This prevents a hold or cancellation request from appearing successful while a destructive object-store operation is already underway.

## Cleanup reconciliation

The protected internal endpoint is:

`POST /api/v1/internal/recording-retention/reconcile`

It requires the existing `x-digistream-media-secret` header and accepts a bounded `limit` from 1 to 100.

Eligible rows are claimed with `FOR UPDATE SKIP LOCKED`. A 15-minute stale-claim window prevents duplicate concurrent deletion while allowing recovery after a crashed cleanup worker.

Before deletion, DigiStream verifies the stored object against the server-owned checksum and size metadata:

- a verified object is deleted and recorded as `deleted`;
- an already missing object is recorded honestly as `missing`;
- checksum mismatch or storage unavailability records a failed attempt and leaves the recording recoverable for a later retry;
- an existing object with incomplete checksum or size metadata is not deleted and is recorded as a failed cleanup attempt.

Successful cleanup changes the recording status to `deleted`, completes any processing job and makes repeated reconciliation idempotent.

## API surface

Organisation-member routes:

- `GET /api/v1/organisations/:organisationId/recordings/:recordingId/retention`
- `PATCH /api/v1/organisations/:organisationId/recordings/:recordingId/retention`

Supported management actions:

- `set_retention`
- `request_deletion`
- `cancel_deletion`
- `set_legal_hold`
- `clear_legal_hold`
- `set_moderation_hold`
- `clear_moderation_hold`

## Operational guidance

Run cleanup reconciliation from a trusted scheduler. Alert on repeated purge failures, checksum mismatches, storage unavailability and cleanup claims that repeatedly become stale.

Do not log storage keys, media-control secrets, session cookies or playback tokens.

## Still outside this slice

- Listing and quarantining object-store keys that have no database record.
- Organisation-wide default retention policies.
- Public listener replay pages.
- External legal-case identifiers and audit-event export.
