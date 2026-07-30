# Local media infrastructure

DigiStream's local media stack runs the complete backend media path in containers:

```text
Creator or demo publisher
        ↓
LiveKit room
        ↓
LiveKit Egress audio mix
        ↓ RTMP
OvenMediaEngine
        ↓
WebRTC or LL-HLS playback
```

The stack is intended for development and end-to-end verification. Its credentials are deliberately local defaults and must never be copied unchanged into a deployed environment.

## Services

| Service | Purpose | Host access |
| --- | --- | --- |
| PostgreSQL 17 | Durable application and relay state | `localhost:5432` |
| Redis | LiveKit and Egress coordination | internal only |
| LiveKit | Creator, guest and backstage audio | `ws://localhost:7880` |
| LiveKit Egress | Audio-only room mix and RTMP push | internal only |
| OvenMediaEngine | RTMP ingest and WebRTC/LL-HLS delivery | `localhost:3333` |
| Fastify API | Identity, authorization and media orchestration | `http://localhost:3000` |

## Requirements

Use a machine or VM with Docker Engine and Docker Compose v2. Media processing is heavier than the normal API test suite, so allocate at least four CPU cores and approximately 6–8 GB of available memory for a comfortable local run.

This stack is not designed to run directly inside Android Termux. Use a desktop, Linux VM, remote development server or Docker-capable Codespace environment.

## Start and stop

From the repository root:

```bash
npm run media:up
```

The command validates the Compose file, builds the API image, starts every dependency and waits for container health checks.

Run the real end-to-end media check:

```bash
npm run media:smoke
```

Stop containers while preserving PostgreSQL and service volumes:

```bash
npm run media:down
```

Stop containers and remove all local stack data:

```bash
npm run media:reset
```

Validate only the Compose model:

```bash
npm run media:config
```

## What the smoke test proves

`scripts/media-e2e-smoke.mjs` performs a real workflow instead of calling mocked media providers:

1. Waits for the Fastify API and PostgreSQL migration state.
2. Registers a temporary user and grants the broadcaster capability.
3. Creates an organisation, public channel and broadcast.
4. Moves the channel through review to active.
5. Schedules and starts the broadcast lifecycle.
6. Requests a short-lived LiveKit host credential and creates the room.
7. Starts a LiveKit CLI demo-audio publisher in that room.
8. Confirms a real LiveKit participant before reporting contribution readiness.
9. Starts the persisted LiveKit Egress bridge.
10. Waits until OvenMediaEngine reports the RTMP stream ready.
11. Requests signed listener playback from the public API.
12. Fetches the LL-HLS manifest and requires a valid `#EXTM3U` response.
13. Stops the relay and deletes temporary application records.

A successful run prints:

```text
PASS: LiveKit room -> Egress -> OME -> signed LL-HLS manifest.
```

## Local configuration

The stack uses these development-only values:

```text
LiveKit API key:       devkey
LiveKit API secret:    secret
OME API token:         digistream-ome-access-token
OME signed-policy key: digistream-local-signed-policy
```

They are safe only because this Compose network is a local development environment. Production must use secret management, TLS URLs, restricted network exposure and independently generated credentials.

The API receives separate internal and browser-facing addresses:

```text
LIVEKIT_API_URL=http://livekit:7880
LIVEKIT_URL=ws://localhost:7880

OME_API_URL=http://ome:8081
OME_INGEST_URL_TEMPLATE=rtmp://ome:1935/live/{streamName}
OME_LLHLS_BASE_URL=http://localhost:3333
OME_WEBRTC_BASE_URL=ws://localhost:3333
```

This separation prevents browsers from receiving Docker-only hostnames while keeping service-to-service traffic inside the Compose network.

## Remote host and WebRTC testing

LL-HLS works through the published HTTP port. WebRTC also needs reachable ICE addresses. For another device on the network, set `OME_HOST_IP` to the Docker host's reachable IP before startup:

```bash
OME_HOST_IP=192.168.1.20 npm run media:up
```

The current local configuration uses plain HTTP and WebSocket URLs. Production browser access requires TLS termination and secure `https://`/`wss://` public endpoints.

## Troubleshooting

Inspect service status:

```bash
docker compose -f compose.media.yml ps
```

Inspect all logs:

```bash
docker compose -f compose.media.yml logs --tail=200
```

Inspect one service:

```bash
docker compose -f compose.media.yml logs --tail=200 livekit-egress
docker compose -f compose.media.yml logs --tail=200 ome
```

A broadcast remaining in `starting` usually means one of these conditions is unresolved:

- The publisher did not join the LiveKit room.
- LiveKit Egress did not become active.
- OvenMediaEngine did not receive the RTMP stream.
- OME received the stream but has not produced its first delivery segment yet.

A broadcast moving to `reconnecting` means the API previously saw delivery readiness and later lost the OME stream. The refresh endpoint reconciles both the persisted Egress job and OME stream health.

## CI policy

The normal pull-request workflow validates the Compose model, parses the OME XML and builds the production API image. It does not download and run the full media stack on every Node.js matrix job.

The `Media stack smoke` workflow is manually triggered from GitHub Actions. It starts the complete container stack, runs the real media test and always uploads service logs through the workflow output before teardown when a failure occurs.
