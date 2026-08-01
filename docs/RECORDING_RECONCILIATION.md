# Recording processing jobs and reconciliation

This Phase 8 slice adds durable, retry-safe coordination between DigiStream and recording workers. It builds on the private object-storage and authorised delivery implementation.

## Processing-job lifecycle

Every recording receives one database-backed processing job through a PostgreSQL trigger. Existing recordings are backfilled during migration.

Job states:

- `pending`: eligible for a worker after `next_attempt_at`.
- `leased`: exclusively claimed by one worker until the lease expires.
- `completed`: the recording reached a terminal artifact state and is no longer claimable.
- `dead`: the configured attempt limit was reached and manual investigation is required.

Claims use `FOR UPDATE SKIP LOCKED`, so cooperating workers cannot claim the same job concurrently. Each claim receives a random lease token. Only its SHA-256 hash is stored in PostgreSQL.

## Internal worker routes

All routes require the existing `x-digistream-media-secret` header.

- `POST /api/v1/internal/recording-jobs/claim`
- `POST /api/v1/internal/recording-jobs/:jobId/heartbeat`
- `PUT /api/v1/internal/recording-jobs/:jobId/artifact`
- `POST /api/v1/internal/recording-jobs/:jobId/fail`
- `POST /api/v1/internal/recording-jobs/reconcile`

The claimed artifact route additionally requires:

- `x-digistream-recording-worker`
- `x-digistream-recording-lease`

The lease token is returned only in the claim response and is never exposed through creator or listener recording DTOs.

## Retry behaviour

A claim increments the job attempt count. Failed or expired work is rescheduled with bounded exponential backoff beginning at 30 seconds and capped at one hour. The default maximum is five attempts. Reaching the limit moves the job to `dead` instead of retrying forever.

A heartbeat extends only a valid, unexpired lease owned by the same worker. Stale workers cannot renew, upload, complete or fail a job after their lease expires.

## Reconciliation

The reconciliation endpoint performs two safe repairs:

1. Jobs whose recording already reached `ready`, `published`, `private`, `archived` or `deleted` are normalised to `completed` and any stale lease is cleared.
2. Expired leases are either rescheduled or moved to `dead` when the attempt limit has been reached.

The operation is bounded by a caller-supplied limit and uses row locking with `SKIP LOCKED`, allowing multiple reconcilers without duplicate work.

## Operational guidance

Run reconciliation periodically from a trusted scheduler or worker supervisor. A one-minute cadence is a reasonable starting point for development. Production cadence, maximum attempts and alert thresholds should be selected from measured worker duration and failure data.

Alert on:

- jobs entering `dead`;
- repeated `worker_lease_expired` failures;
- a growing pending-job age;
- recording artifacts failing verification;
- workers that repeatedly claim but never heartbeat.

Do not log lease tokens, media-control secrets, storage credentials or authorised playback tokens.

## Still outside this slice

- Automatic object-store orphan listing and deletion.
- Retention, legal hold and moderation hold policies.
- Public listener replay pages.
- Distributed scheduling through Redis or another external queue when database-backed claiming is no longer sufficient.
