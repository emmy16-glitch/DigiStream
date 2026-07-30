# LiveKit Egress to OvenMediaEngine bridge

DigiStream uses separate systems for interactive contribution and public delivery:

```text
Creator and guests
        ↓
LiveKit room
        ↓
LiveKit Egress audio-only composite
        ↓ RTMP or SRT
OvenMediaEngine
        ↓
WebRTC and LL-HLS listeners
```

## Why this bridge exists

LiveKit is responsible for hosts, guests, call-ins, backstage monitoring and microphone permissions. OvenMediaEngine is responsible for one-to-many public playback. The API coordinates the two systems but does not carry continuous audio itself.

The preferred bridge uses LiveKit Egress `StartRoomCompositeEgress` with `audio_only=true` and an RTMP or SRT stream output pointed at OvenMediaEngine. The previous RTSP/OVT pull-stream adapter remains available only as a compatibility mode.

## Start flow

1. The broadcast lifecycle enters `starting`.
2. An owner, administrator or broadcaster calls the existing delivery start endpoint.
3. The API resolves the OME ingest URL from `OME_INGEST_URL_TEMPLATE`.
4. The API starts or reuses one LiveKit Egress job for the broadcast room.
5. The external egress ID and safe target host are stored in `broadcast_media_relays`.
6. The full ingest URL, query parameters and possible SRT credentials are never stored.
7. The API checks OME for the delivery stream.
8. The broadcast becomes `live` only after both contribution and delivery readiness are confirmed.

## Reconciliation

The refresh endpoint checks both layers:

- LiveKit Egress job state
- OME stream state and listener counts

A failed egress job moves an active broadcast to `failed`. A missing OME stream during a live broadcast moves it to `reconnecting`. Repeated start requests reuse the persisted active egress job instead of creating duplicates.

## Stop flow

1. The broadcast lifecycle enters `ending`, `cancelled` or `failed`.
2. The API stops the LiveKit Egress job.
3. The persisted relay state becomes `stopped`.
4. Push-mode OME delivery disappears when its source disconnects.
5. The broadcast becomes `completed` after the delivery-stopped event.

## Configuration

```dotenv
LIVEKIT_URL=ws://livekit:7880
LIVEKIT_API_URL=http://livekit:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=replace-this

OME_API_URL=http://ovenmediaengine:8081
OME_API_ACCESS_TOKEN=replace-this
OME_VHOST=default
OME_APP=live
OME_INGEST_URL_TEMPLATE=rtmp://ovenmediaengine:1935/{app}/{streamName}
OME_WEBRTC_BASE_URL=wss://media.example.com:3334
OME_LLHLS_BASE_URL=https://media.example.com:3334
OME_SIGNED_POLICY_SECRET=replace-this
```

`OME_INGEST_URL_TEMPLATE` must contain `{streamName}`. `{app}` is optional. Supported schemes are `rtmp`, `rtmps` and `srt`.

## Self-hosted LiveKit requirement

The LiveKit Egress service must be deployed in addition to the LiveKit server. Both LiveKit server and Egress must be able to reach the same Redis service, and the Egress `ws_url` must be reachable from its container or host.

## Security boundaries

- The browser never receives LiveKit API secrets, OME API credentials or ingest URLs.
- LiveKit service tokens carry only the `roomRecord` grant and expire after 60 seconds.
- Listener playback URLs remain short-lived OME SignedPolicy URLs.
- Relay database rows expose neither the full ingest URL nor its query string.
- Organisation permissions and tenant isolation are enforced before starting, refreshing or stopping delivery.
