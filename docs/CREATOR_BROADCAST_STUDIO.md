# Creator broadcast studio

The DigiStream creator studio is the browser control surface for the LiveKit contribution path and the OvenMediaEngine public-delivery path.

## What the studio does

The studio allows an authenticated organisation owner, administrator or broadcaster to:

1. Select an organisation, channel and draft, scheduled or active broadcast.
2. Request browser microphone permission.
3. Select or change the active audio input.
4. View a live RMS level meter and clipping warning.
5. Join the broadcast's server-authorized LiveKit room.
6. Publish a microphone-only audio track.
7. Monitor subscribed guest audio when the browser permits playback.
8. Mute, unmute and recover from LiveKit reconnection events.
9. Start the broadcast lifecycle and the LiveKit Egress to OvenMediaEngine delivery path.
10. End the public delivery and leave the contribution room cleanly.

The dashboard buttons **Start a broadcast**, **Broadcasts**, **Configure** and **Run sound check** open the studio.

## Browser and security requirements

Microphone capture requires a secure browser context. Use HTTPS in deployed environments or `localhost` during local development.

The browser receives only:

- a short-lived LiveKit participant token;
- the public LiveKit WebSocket URL;
- the participant identity and room name needed by the LiveKit client;
- normal authenticated API responses.

The browser never receives:

- `LIVEKIT_API_SECRET`;
- `MEDIA_CONTROL_SECRET`;
- OvenMediaEngine administration credentials;
- the LiveKit Egress service token;
- complete private ingest URLs.

The web application sends cookies with `credentials: include`, so the API and web origins must use the configured credentialed CORS policy.

## Verified readiness

After the browser publishes its microphone, it calls:

```text
POST /api/v1/organisations/:organisationId/broadcasts/:broadcastId/contribution/ready
```

The request contains the short-lived host participant identity. Fastify does not trust the browser's statement by itself. The API uses LiveKit RoomService to confirm that:

- the identity belongs to the authenticated host user;
- the participant exists in the expected broadcast room;
- the participant is a publisher;
- an unmuted microphone audio track is present.

Only after those checks does the API apply the idempotent `contribution_ready` media event. Public delivery still must independently become ready through OvenMediaEngine before the broadcast status becomes `live`.

## LiveKit browser module

The current web build loads an exact LiveKit client ESM version from:

```text
https://cdn.jsdelivr.net/npm/livekit-client@2.21.0/dist/livekit-client.esm.mjs
```

The version is pinned rather than floating. Production deployments can mirror that exact module on a controlled CDN and configure:

```text
VITE_LIVEKIT_CLIENT_MODULE_URL=https://static.example.com/vendor/livekit-client-2.21.0.esm.mjs
```

Changing the module version requires a tested pull request. Do not point the setting at an unversioned or user-controlled URL.

## Local development

Start the API and web app separately:

```bash
npm run dev:api
npm run dev:web -- --host 0.0.0.0
```

For the real media path, start the Docker environment:

```bash
npm run media:up
```

The browser-facing LiveKit URL must resolve from the device running the browser. When the web app is opened from another computer or phone, replace `127.0.0.1` in the browser-facing configuration with the Docker host's reachable address.

## Failure behaviour

- Permission denied: the studio explains that browser microphone permission is required.
- Device removed: the device list refreshes and the creator can choose another input.
- Input clipping: the meter shows a warning; it does not modify gain silently.
- LiveKit interruption: the studio enters `reconnecting` and returns to the connected/live state after recovery.
- Autoplay blocked: the creator receives an explicit **Enable guest audio** control.
- OME delay: the studio polls delivery health for up to 90 seconds while keeping the microphone connected.
- Delivery failure: the creator remains in the contribution room and receives the provider-safe error.
- End broadcast: the API moves the lifecycle to `ending`, stops the Egress/delivery path, completes the broadcast and then releases browser media.

## Remaining creator-media work

External guest invitation links, backstage admission controls, participant removal, call-ins and production latency/capacity measurement remain separate milestones.
