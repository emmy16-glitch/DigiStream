# DigiStream recording foundation

This document records the completed metadata foundation and the verified object-storage delivery slice of roadmap Phase 8. DigiStream now stores actual private audio artifacts, verifies them before readiness and issues short-lived authorised playback or download access without exposing storage credentials or object keys.

## Implemented recording foundation

- PostgreSQL migration `0012_recording_foundation.sql`.
- One idempotent recording job per completed broadcast.
- Server-generated private storage keys scoped by organisation and broadcast.
- Recording states: `recording`, `uploading`, `processing`, `ready`, `failed`, `published`, `private`, `archived` and `deleted`.
- Metadata for provider artifact ID, media format, content type, size, duration, SHA-256 checksum, processing error, retry count and lifecycle timestamps.
- Owner, administrator and broadcaster permission for creating and managing recording jobs.
- Read access for authenticated organisation members, while cross-tenant requests retain private not-found behaviour.
- Creator transitions from `ready` to published, private or archived states.
- An API-backed Replay workspace that discovers completed broadcasts, creates recording jobs, displays real processing metadata and manages visibility states.
- Responsive Playwright coverage for the Replay workspace on desktop Chromium, Android Chrome and Android Desktop-site simulation.

## Implemented object-storage and delivery slice

- A provider-neutral `ObjectStorage` interface with an S3-compatible implementation and an in-memory test implementation.
- A private SeaweedFS S3-compatible service in the local Docker Compose stack.
- A media-worker upload endpoint protected by `x-digistream-media-secret`.
- Server-owned storage keys; neither workers nor browsers may select a storage key.
- Read-after-write SHA-256 and byte-size verification before a recording can become `ready`.
- The metadata-only worker state endpoint is prevented from fabricating the `ready` state.
- Short-lived HMAC-signed playback and download grants issued only after organisation membership authorization.
- Current recording state is reloaded for every media request, so archiving or otherwise making an artifact non-deliverable revokes previously minted links immediately.
- HTTP full-object and single-range delivery with `200`, `206` and `416` behaviour.
- Independent inline playback and attachment download authorization.
- Integration coverage for S3-compatible storage, checksum verification, private-key non-disclosure, cross-tenant denial, byte ranges, download disposition and archive revocation.

The detailed storage contract, API surface and operational configuration are recorded in [`RECORDING_OBJECT_STORAGE.md`](RECORDING_OBJECT_STORAGE.md).

## Security and data-honesty rules

- The `storage_key` and provider artifact identifier are internal database fields and are never included in creator-facing recording DTOs.
- A broadcast must be `completed` before a recording job can be requested.
- A recording cannot become `ready` from supplied metadata alone. The API must store the object and verify its checksum and byte size.
- Object-storage credentials are server-only configuration and are never returned to the browser or media worker.
- Playback and download links contain a bounded signed grant, not a storage key or storage credential.
- Signed access does not bypass current authorization state: an archived, deleted, failed or otherwise unavailable recording is not delivered.
- The Replay workspace does not fabricate audio, URLs, durations, sizes, waveforms or processing success.
- `published` and `private` are creator visibility decisions. This slice authorizes organisation-member playback; a public listener replay page remains a separate implementation.

## Recording API surface

Creator and organisation-member routes:

- `POST /api/v1/organisations/:organisationId/broadcasts/:broadcastId/recording`
- `GET /api/v1/organisations/:organisationId/recordings`
- `GET /api/v1/organisations/:organisationId/recordings/:recordingId`
- `PATCH /api/v1/organisations/:organisationId/recordings/:recordingId`
- `POST /api/v1/organisations/:organisationId/recordings/:recordingId/access`

Internal media-worker routes:

- `POST /api/v1/internal/organisations/:organisationId/recordings/:recordingId/state`
- `PUT /api/v1/internal/organisations/:organisationId/recordings/:recordingId/artifact`

Authorised media route:

- `GET /api/v1/recording-media?token=<short-lived-grant>`

The internal routes require `x-digistream-media-secret`. The artifact route accepts an audio body and validated metadata headers, but never accepts a storage key from the worker or browser.

## Implemented durable processing and retention slices

- PostgreSQL-backed processing jobs with atomic `FOR UPDATE SKIP LOCKED` claims.
- Short-lived worker leases, heartbeats, bounded exponential retries and dead-letter state.
- Reconciliation for expired leases and recordings already in terminal artifact states.
- One retention-control row per recording with migration backfill.
- Explicit deletion scheduling with a minimum grace period and immediate archive-based access revocation.
- Legal and moderation holds that prevent destructive cleanup.
- Protected, bounded cleanup reconciliation with checksum verification, honest missing-object outcomes and idempotent completion.

The worker lifecycle is documented in [`RECORDING_RECONCILIATION.md`](RECORDING_RECONCILIATION.md). Retention and cleanup are documented in [`RECORDING_RETENTION.md`](RECORDING_RETENTION.md).

## Deliberately not implemented yet

- Listing and quarantining object-store keys that have no database record.
- Organisation-wide default retention policies.
- Public listener replay pages and published replay discovery.
- Production object-storage backup, lifecycle and disaster-recovery policy.
- Direct browser-to-storage multipart upload; uploads remain behind the trusted API boundary.

## Next implementation slice

The next Phase 8 slice should add public and member replay listening pages only after the complete authorised playback, expiry, archived-state and failure behaviour is represented honestly. Object-store orphan discovery and quarantine remains a separate operational slice.
