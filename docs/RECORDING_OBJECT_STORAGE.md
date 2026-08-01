# DigiStream recording object storage

This document defines the Phase 8 private recording-storage and authorised media-delivery slice.

## Scope

This slice begins after a completed broadcast has an idempotent recording job. A trusted media worker uploads the actual audio artifact through the API. The API chooses the private storage key, stores the object, verifies its SHA-256 checksum and byte size, and only then moves the recording to `ready`.

It also provides organisation-member playback and download using short-lived signed grants and HTTP byte ranges. It does not provide public replay discovery, queue-backed processing or retention automation.

## Storage contract

`apps/api/src/modules/storage/object-storage.ts` defines a provider-neutral `ObjectStorage` interface with these operations:

- service availability check;
- whole-object upload;
- read-after-write checksum and size verification;
- whole-object or single-range read;
- object deletion;
- adapter shutdown.

The production-facing implementation uses the AWS S3 client against an S3-compatible endpoint. The test implementation stores buffers in memory. Business logic depends on the interface rather than provider-specific response types.

## Local development service

`compose.media.yml` includes a private SeaweedFS S3-compatible service on port `8333` with a persistent `object-storage-data` volume. The API connects to the service through the Compose network.

Required local configuration is documented in `.env.example`:

- `OBJECT_STORAGE_ENDPOINT`
- `OBJECT_STORAGE_REGION`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_ACCESS_KEY_ID`
- `OBJECT_STORAGE_SECRET_ACCESS_KEY`
- `OBJECT_STORAGE_FORCE_PATH_STYLE`
- `OBJECT_STORAGE_MAX_UPLOAD_BYTES`

Production deployments must replace every local secret, keep the bucket private and apply separate backup and lifecycle policies.

## Artifact upload flow

The trusted worker sends:

```text
PUT /api/v1/internal/organisations/:organisationId/recordings/:recordingId/artifact
```

Required authentication:

```text
x-digistream-media-secret: <MEDIA_CONTROL_SECRET>
```

Required metadata:

```text
Content-Type: audio/<format>
x-digistream-media-format: <format>
x-digistream-duration-ms: <positive integer>
```

Optional bounded provider metadata:

```text
x-digistream-recording-provider: <provider name>
x-digistream-provider-artifact-id: <provider reference>
```

The request body is the audio artifact. The API rejects empty bodies, non-audio content types, invalid duration/format values and objects above `OBJECT_STORAGE_MAX_UPLOAD_BYTES`.

The transition sequence is:

1. Validate tenant, recording and worker authentication.
2. Move the recording to `uploading`.
3. Write the object at the existing server-generated storage key.
4. Move the recording to `processing` with measured size and checksum metadata.
5. Read the stored object and independently recompute size and SHA-256.
6. Move the recording to `ready` only when verification matches.
7. On upload or verification failure, delete the attempted object where possible and move the recording to `failed` with a safe processing error.

The existing metadata state endpoint cannot set `ready`. This prevents a worker from declaring a nonexistent artifact playable.

## Access-grant flow

An authenticated organisation member requests playback or download access:

```text
POST /api/v1/organisations/:organisationId/recordings/:recordingId/access
Content-Type: application/json

{"mode":"playback"}
```

or:

```json
{"mode":"download"}
```

The API verifies membership and current artifact availability, then returns a short-lived same-origin URL:

```text
/api/v1/recording-media?token=<signed-grant>
```

The grant contains only the organisation ID, recording ID, mode, expiry and a nonce. It is authenticated with `RECORDING_ACCESS_SECRET`. It contains no storage key, storage endpoint or credential.

Configuration:

- `RECORDING_ACCESS_SECRET`: distinct random secret with at least 32 bytes;
- `RECORDING_ACCESS_TTL_SECONDS`: bounded to 30–900 seconds, default 120.

## Media delivery

The media route supports:

- `200 OK` for the complete object;
- `206 Partial Content` for one valid byte range;
- `416 Range Not Satisfiable` for malformed, multiple or out-of-bounds ranges.

Responses include:

- `Accept-Ranges: bytes`;
- `Cache-Control: private, no-store`;
- `Cross-Origin-Resource-Policy: same-origin`;
- `X-Content-Type-Options: nosniff`;
- `Content-Disposition: inline` for playback;
- `Content-Disposition: attachment` for download.

The API reloads the recording before every media response. A previously minted link stops working after the recording becomes archived, deleted or otherwise non-deliverable.

## Authorization boundary

- Owner, administrator or broadcaster roles may create and manage recording jobs.
- Any authenticated organisation member may read recording metadata and request authorised member playback/download access.
- Cross-tenant requests return private not-found behaviour.
- The browser never receives object-storage credentials.
- The worker never chooses or receives a storage key.
- The storage bucket is not a public delivery surface.

Public listener replay authorization must be implemented separately with explicit published-replay rules and safe public DTOs.

## Failure behaviour

- Missing storage configuration: `OBJECT_STORAGE_UNAVAILABLE`.
- Missing access-signing configuration: `RECORDING_ACCESS_UNAVAILABLE`.
- Metadata-only attempt to set ready: `RECORDING_ARTIFACT_UPLOAD_REQUIRED`.
- Invalid or expired access token: `RECORDING_ACCESS_INVALID` or `RECORDING_ACCESS_EXPIRED`.
- Object missing after metadata says it is ready: `RECORDING_ARTIFACT_MISSING`.
- Storage request failure: `OBJECT_STORAGE_UNAVAILABLE`.
- Upload or checksum failure: `RECORDING_ARTIFACT_UPLOAD_FAILED` and a failed recording state where possible.

Technical provider errors are not exposed directly to the browser.

## Validation

Automated coverage includes:

- real S3-compatible put, get, range, checksum verification and delete against SeaweedFS;
- valid WAV artifact upload through the protected internal API;
- rejection of invalid worker authentication;
- rejection of fabricated metadata-only readiness;
- SHA-256, size and duration persistence;
- storage-key non-disclosure;
- short-lived playback and download grants;
- full and range delivery;
- invalid range handling;
- cross-tenant denial;
- immediate archive revocation;
- TypeScript checks, API tests, production builds and responsive Playwright regressions.

## Remaining Phase 8 work

- durable queue-backed job claiming and leases;
- bounded retry scheduling and dead-letter/manual-review states;
- stalled-state and missing-object reconciliation;
- orphan-object cleanup;
- retention and deletion workflows;
- legal and moderation holds;
- public replay pages and published replay discovery;
- production backup, restore and object-lifecycle drills.
