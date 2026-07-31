# Creator broadcast studio

The DigiStream creator studio is the browser control surface for the LiveKit contribution path and the OvenMediaEngine public-delivery path.

The studio also follows the mandatory product-facing rules in [`PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`](PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md).

## What the studio does

The studio allows an authenticated organisation owner, administrator or broadcaster to:

1. Select an organisation, channel and draft, scheduled or active broadcast.
2. Request browser microphone permission.
3. Select or change the active audio input.
4. View a live RMS level meter, human-readable signal assessment and clipping warning.
5. Join the broadcast's server-authorized LiveKit room.
6. Publish a microphone-only audio track.
7. Monitor subscribed guest audio when the browser permits playback.
8. Mute, unmute and recover from LiveKit reconnection events.
9. Start the broadcast lifecycle and the LiveKit Egress to OvenMediaEngine delivery path.
10. End the public delivery and leave the contribution room cleanly.

The dashboard buttons **Start a broadcast**, **Broadcasts**, **Configure** and **Run sound check** open the studio.

On mobile, the product flow should remain understandable as:

```text
Step 1: Select broadcast
Step 2: Prepare studio audio
Step 3: Verify and go live
```

The step presentation may change visually, but the state and authorization boundaries must not be weakened.

## User and role boundary

Only authenticated users with the required organisation role and platform capability may operate the studio. The UI should promote **Open studio**, **Manage broadcast** or **Open backstage** to an owner, admin or broadcaster viewing their own event instead of presenting a listener-only **Request to speak** action.

The UI role check improves clarity. Fastify remains responsible for independently verifying the user, organisation, role, broadcast and action.

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

A connected microphone, moving level meter or connected LiveKit room must never be presented as proof that listeners can hear the broadcast.

## Microphone state model

The studio must distinguish these states instead of using one neutral `Listening` label for every condition:

- Permission required
- Requesting permission
- Permission denied
- Listening for input
- No signal
- Signal detected
- Too quiet
- Good
- Loud
- Clipping
- Muted
- Device disconnected

### Plain-language signal feedback

The human-readable assessment is primary. The raw technical value is secondary.

Examples:

```text
Good signal · -18.4 dBFS
Too quiet · -50.5 dBFS
No microphone signal detected
Input is clipping
```

A zero or near-silent meter sustained for an appropriate interval must become **No signal**, not remain neutral **Listening**. The no-signal message should suggest checking the selected input, microphone connection, mute state and browser permission.

### Meter smoothing

Smooth the underlying signal rather than relying only on CSS transitions.

- Use a fast attack so speech appears immediately.
- Use a slower release so the meter falls naturally.
- Preserve immediate clipping peaks.
- Do not make smoothing so slow that a dangerous level is hidden.

A class-based active-bar meter cannot be properly smoothed by merely adding `transition: height` to bars whose heights do not change.

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

### Permission denied

The studio explains that browser microphone permission is required and gives clear browser-setting guidance without repeatedly prompting in a loop.

### Device removed or silent input

The device list refreshes, the creator can choose another input and the UI reports **Device disconnected** or **No signal** instead of a generic failure.

### Input clipping

The meter shows a plain-language warning. DigiStream does not modify gain silently.

### LiveKit interruption

The studio enters `reconnecting`, explains that the contribution connection is recovering and returns to the connected or live state after verified recovery.

### Autoplay blocked

The creator receives an explicit **Enable guest audio** control.

### OvenMediaEngine delay

The studio polls delivery health for up to the bounded deadline while keeping the microphone connected. It says that public audio is still starting and does not claim the broadcast is live.

### Delivery failure

When safe, the creator remains in the contribution room and receives an understandable error with a safe retry or status action. An already healthy microphone connection must not be destroyed merely because public delivery failed.

### Studio action failed

`Live contribution access is temporarily unavailable` is a symptom, not a root cause. Before changing the copy or adding blind retry, trace whether the failure came from:

- expired or missing session;
- incorrect organisation role;
- broadcast lifecycle state;
- contribution-token authorization;
- LiveKit configuration or reachability;
- secure-context or CORS configuration;
- unavailable backend dependency.

The product error may include a safe request ID for support. It must not expose tokens, secrets, provider credentials or raw stack traces.

Avoid duplicate close and dismiss actions. When retry is safe and understood, provide **Try again** and one clear close action.

### End broadcast

The API moves the lifecycle to `ending`, stops the Egress/delivery path, completes the broadcast and then releases browser media. The UI does not claim completion before the lifecycle confirms it.

## Browser history and mobile closing

Opening the studio should create a navigable route or history state.

- Browser Back and Android Back close the studio before leaving the creator workspace.
- The visible close control uses the same close path.
- Do not implement a custom left-edge swipe recognizer that conflicts with Android, iOS or browser navigation gestures.
- A short reduced-motion-aware close transition may be used after behaviour is correct.

## Mobile layout requirements

- Fixed creator navigation must have matching content bottom clearance.
- Sticky studio actions must account for `env(safe-area-inset-bottom)`.
- The virtual keyboard must not cover required inputs or the active action.
- Long organisation, channel and broadcast names must wrap or truncate safely.
- Enabled primary actions use high-contrast dark text on the accent colour.
- Disabled actions must not retain a bright primary appearance with dim grey text.
- Use the shared icon system instead of browser-dependent Unicode symbols when an icon exists.

## Backstage and call-ins

External guest invitations, waiting-room admission, participant removal, mute controls and listener call-in decisions are already implemented in the separate creator backstage workspace.

The complete call-in flow is:

```text
listener request
-> producer review
-> approve or reject
-> secure guest invitation
-> guest waiting room
-> producer admission
-> guest joins backstage
```

Future work should improve discoverability and integration rather than re-implementing the same producer flow. The mobile navigation label should describe the destination clearly, such as **Backstage** or **Guests**, rather than the ambiguous **People** label.

## Remaining creator-media verification

- Trace and resolve the current studio-access failure shown by the UI.
- Add no-signal, disconnected-device and human-readable level states.
- Test contribution disconnect and reconnect.
- Test source loss while public delivery is active.
- Test delivery failure while contribution remains connected.
- Measure contribution latency, playback latency, jitter, packet loss and capacity.
- Run the workflow with a non-technical production volunteer without coaching.
- Confirm that the creator knows exactly when listeners can hear audio.
- Record and fix every critical hesitation or misunderstood state before decorative polish.
