# Broadcast scheduling and lifecycle backend

This module gives DigiStream a provider-neutral broadcast state machine before the real LiveKit and OvenMediaEngine adapters are connected.

## Lifecycle

```text
draft → scheduled → starting → live → ending → completed
   ↘ cancelled        ↕ reconnecting
starting/live/reconnecting/ending → failed
```

A broadcast does not become `live` merely because a creator pressed Start. The start command moves it to `starting`. DigiStream waits for two independent media events:

1. `contribution_ready` — the LiveKit creator/guest path is ready.
2. `delivery_ready` — the OvenMediaEngine public delivery path is ready.

Only after both events have been received does the API move the broadcast to `live`.

## Tenant endpoints

```text
POST  /api/v1/organisations/:organisationId/channels/:channelId/broadcasts
GET   /api/v1/organisations/:organisationId/channels/:channelId/broadcasts
GET   /api/v1/organisations/:organisationId/broadcasts/:broadcastId
PATCH /api/v1/organisations/:organisationId/broadcasts/:broadcastId

POST  /api/v1/organisations/:organisationId/broadcasts/:broadcastId/schedule
POST  /api/v1/organisations/:organisationId/broadcasts/:broadcastId/start
POST  /api/v1/organisations/:organisationId/broadcasts/:broadcastId/cancel
POST  /api/v1/organisations/:organisationId/broadcasts/:broadcastId/end
```

Owner, admin and broadcaster roles can create and control broadcasts. Moderator and analyst roles have read-only organisation access.

Lifecycle commands require:

```text
Idempotency-Key: a unique 8–128 character value
```

and a body containing the version last read by the caller:

```json
{
  "expectedVersion": 3
}
```

Scheduling also requires a future `scheduledStartAt` value.

## Public endpoints

```text
GET /api/v1/broadcasts
GET /api/v1/broadcasts/:organisationSlug/:channelSlug/:broadcastSlug
```

Public listing contains only broadcasts attached to active public channels. Exact links also support active unlisted channels. Draft, cancelled, failed and private-channel broadcasts are not exposed.

## Media-control endpoint

```text
POST /api/v1/internal/media/broadcasts/:broadcastId/events
```

The caller must provide the `x-digistream-media-secret` header matching `MEDIA_CONTROL_SECRET`.

Supported events:

```text
contribution_ready
delivery_ready
source_lost
delivery_lost
failed
delivery_stopped
```

Each event carries its own idempotency key. The `failed` event also carries a safe failure reason.

## Concurrency and idempotency

- Each broadcast has a monotonically increasing `lifecycleVersion`.
- PostgreSQL row locks serialize competing lifecycle commands.
- Stale callers receive `BROADCAST_VERSION_CONFLICT`.
- Repeating an identical idempotency key safely replays the result.
- Reusing a key for another command or payload receives `IDEMPOTENCY_KEY_CONFLICT`.
- Command receipts are retained in `broadcast_lifecycle_commands`.

## Media identifiers

Every broadcast receives two non-secret provider-neutral identifiers:

- `contributionRoomName` for the future LiveKit room.
- `deliveryStreamName` for the future OvenMediaEngine stream.

Actual provider credentials and short-lived user tokens are not implemented in this slice and must never be stored in public broadcast responses.
