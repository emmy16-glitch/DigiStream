# DigiStream recording foundation

This document records the first vertical slice of roadmap Phase 8. It establishes durable recording metadata, lifecycle authorization and a real creator Replay workspace without pretending that an audio object has already been captured or stored.

## Implemented in this slice

- PostgreSQL migration `0012_recording_foundation.sql`.
- One idempotent recording job per completed broadcast.
- Server-generated private storage keys scoped by organisation and broadcast.
- Recording states: `recording`, `uploading`, `processing`, `ready`, `failed`, `published`, `private`, `archived` and `deleted`.
- Metadata for provider artifact ID, media format, content type, size, duration, SHA-256 checksum, processing error, retry count and lifecycle timestamps.
- Owner, administrator and broadcaster permission for creating and managing recording jobs.
- Read access for authenticated organisation members, while cross-tenant requests retain private not-found behaviour.
- Media-worker state updates protected by the existing media-control secret.
- Creator transitions from `ready` to published, private or archived states.
- An API-backed Replay workspace that discovers completed broadcasts, creates recording jobs, displays real processing metadata and manages visibility states.
- Integration coverage for idempotency, tenant isolation, permission checks, worker authentication, lifecycle transitions and private-key non-disclosure.
- Responsive Playwright coverage for the Replay workspace on desktop Chromium, Android Chrome and Android Desktop-site simulation.

## Security and data-honesty rules

- The `storage_key` and provider artifact identifier are internal database fields and are never included in creator-facing recording DTOs.
- A broadcast must be `completed` before a recording job can be requested.
- A creator cannot publish an artifact before a media worker has supplied required format, content type, size, duration and checksum metadata and moved the job to `ready`.
- The Replay workspace does not fabricate audio, URLs, durations, sizes, waveforms or processing success.
- Published status currently represents the creator's replay visibility decision. It does not imply that a public object-storage delivery URL exists.

## Deliberately not implemented yet

- LiveKit Egress or another worker writing the captured audio object to private storage.
- An S3-compatible storage adapter and storage credentials.
- Queue-backed retry scheduling, reconciliation and orphan cleanup.
- Signed or session-authorized playback and download URLs.
- HTTP range delivery.
- Public and member replay listening pages.
- Retention, deletion, legal hold and moderation hold policies.

These remaining items continue under roadmap Phase 8. Playback and download controls must remain unavailable until the storage adapter and authorization path are implemented and tested.

## Recording API surface

Creator and organisation-member routes:

- `POST /api/v1/organisations/:organisationId/broadcasts/:broadcastId/recording`
- `GET /api/v1/organisations/:organisationId/recordings`
- `GET /api/v1/organisations/:organisationId/recordings/:recordingId`
- `PATCH /api/v1/organisations/:organisationId/recordings/:recordingId`

Internal media-worker route:

- `POST /api/v1/internal/organisations/:organisationId/recordings/:recordingId/state`

The internal route requires `x-digistream-media-secret` and never accepts a storage key from the worker or browser.

## Next implementation slice

The next recording slice should add a provider-neutral object-storage interface, a local S3-compatible development service, a worker adapter that uploads an actual audio artifact, checksum verification after upload, and short-lived authorized playback/download access. Only then should the listener Replay page expose a playable control.
