# LiveKit contribution adapter

DigiStream uses LiveKit only for the interactive contribution path. Public listener delivery remains the responsibility of OvenMediaEngine.

## Traffic boundary

```text
Creator, guest or moderator
        ↓ short-lived credential
LiveKit contribution room
        ↓ controlled relay/egress (next media slice)
OvenMediaEngine public delivery
```

The Fastify API is the authority for room access. Browsers never receive the LiveKit API key or API secret.

## Credential endpoint

```text
POST /api/v1/organisations/:organisationId/broadcasts/:broadcastId/contribution-token
```

The endpoint requires an active DigiStream session and an organisation membership. It returns `Cache-Control: no-store` and a short-lived LiveKit join token.

Supported participant profiles:

| Profile | Organisation roles | LiveKit permissions |
| --- | --- | --- |
| `host` | owner, admin, broadcaster | join, subscribe, publish microphone |
| `guest` | owner, admin, broadcaster, moderator | join, subscribe, publish microphone |
| `monitor` | owner, admin, broadcaster, moderator | join and subscribe only |

Analysts do not receive backstage media access. Non-members receive a private not-found response.

## Broadcast state gate

Credentials are issued only while a broadcast is:

```text
scheduled | starting | live | reconnecting
```

Draft, ending, completed, cancelled and failed broadcasts reject new contribution credentials.

## Token security

- Tokens are signed on the server with HS256 using the LiveKit API secret.
- The default TTL is 300 seconds and is constrained to 60–900 seconds.
- Publisher tokens can publish only the `microphone` source.
- Data publishing and self-service metadata updates are disabled.
- Monitor tokens cannot publish any track.
- Every credential receives a unique participant identity.
- Token metadata contains only DigiStream IDs and role information, never secrets.
- The API secret is never returned or logged.

Short token lifetimes are important for self-hosted LiveKit because removing a participant does not provide the same old-token revocation guarantees as LiveKit Cloud.

## Room provisioning

Before issuing a credential, the adapter:

1. Calls `ListRooms` for the broadcast contribution room.
2. Reuses the room when it already exists.
3. Calls `CreateRoom` when it is missing.
4. Treats an `already_exists` race as successful idempotent provisioning.

Room metadata identifies the DigiStream organisation, channel and broadcast. The default room limit is 12 participants because public listeners do not join LiveKit.

## Environment variables

```text
LIVEKIT_URL
LIVEKIT_API_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
LIVEKIT_TOKEN_TTL_SECONDS
LIVEKIT_ROOM_EMPTY_TIMEOUT_SECONDS
LIVEKIT_ROOM_DEPARTURE_TIMEOUT_SECONDS
LIVEKIT_ROOM_MAX_PARTICIPANTS
LIVEKIT_REQUEST_TIMEOUT_MS
```

`LIVEKIT_URL` is the `ws://` or `wss://` address returned to clients. `LIVEKIT_API_URL` is the `http://` or `https://` RoomService endpoint. When `LIVEKIT_API_URL` is omitted, the API derives it from `LIVEKIT_URL`.

Partial configuration fails during application startup rather than silently issuing unusable credentials.

## Still outside this slice

- Browser microphone capture and the LiveKit client SDK
- External guest invitations
- Participant removal and permission updates
- LiveKit webhooks
- LiveKit-to-OvenMediaEngine relay/egress
- OvenMediaEngine playback credentials
- Media load and failure testing
