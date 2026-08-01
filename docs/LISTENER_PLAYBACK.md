# Listener playback client

DigiStream's listener application is a responsive React experience backed by the existing Fastify broadcast and playback APIs. OvenMediaEngine remains the public media-delivery provider. The web application does not receive the OME administration token, signing secret, internal stream name or LiveKit credentials.

This feature also follows the mandatory listener and resilience rules in [`PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`](PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md).

## Routes

```text
/listen
/listen/:organisationSlug/:channelSlug/:broadcastSlug
/listen/member/:organisationId/:broadcastId
```

`/listen` is public discovery. It lists only broadcasts belonging to active public channels.

The slug route is the exact public or unlisted listener link. Unlisted broadcasts do not appear in discovery but remain accessible through their exact path.

The member route is for private organisation broadcasts. It uses the existing HttpOnly session cookie and requires current organisation membership before metadata or playback access is returned.

Individual event pages must provide a clear path back to discovery. Navigation must not mark `Live now` as active for a scheduled event.

## Playback selection

The player requests a short-lived playback descriptor from Fastify. The response contains signed OME URLs ordered as:

```text
1. WebRTC
2. LL-HLS
```

OvenPlayer attempts WebRTC first for the lowest practical listener delay. Automatic fallback is enabled, so LL-HLS is selected when WebRTC is unsupported or cannot establish a healthy connection.

Technical diagnostics may report:

```text
WebRTC · ultra-low latency
LL-HLS · reliable fallback
```

The primary listener interface instead uses understandable wording such as:

```text
Low-latency audio
Reliable audio fallback
Switching to a more reliable audio path
```

Playback access is issued only while the channel is active, delivery has reported ready and the broadcast is `live`, `reconnecting` or `ending`.

## Browser bundles

The browser loads pinned versions of OvenPlayer and hls.js:

```text
VITE_OVENPLAYER_URL
VITE_HLS_CLIENT_URL
```

The default URLs are recorded in `.env.example`. Production deployments may mirror those exact files on a controlled CDN and set the variables at web build time.

No dependency is loaded from an unversioned `latest` URL.

## Broadcast and player state model

The listener page must combine the authoritative broadcast lifecycle with the local player phase. It must not treat every page as a live player.

### Scheduled

- Show `Upcoming` or `Scheduled`.
- Show exact local date and time.
- A simple text countdown may be shown.
- Allow `Add to calendar` and `Copy listener link` when available.
- Hide play, pause, mute, volume and retry controls.
- Hide active `LIVE` artwork.
- Hide the chat composer and show a compact opening-time state.
- Refresh metadata automatically so the page can become live without reload.

### Starting

- Explain that the creator and public audio path are connecting.
- Do not claim audio is live until the backend confirms contribution and delivery readiness.
- Keep controls disabled or hidden according to the actual playable state.

### Live

- Enable playback controls.
- Show clear `Live now` treatment.
- Animate live artwork only when motion is appropriate and the broadcast is truly live.
- Show plain-language connection health.

### Reconnecting

- Explain that DigiStream is recovering.
- Show bounded attempt information when known.
- Keep automatic fallback and signed-source refresh visible in plain language.
- Do not reduce the state to a generic error before recovery is exhausted.

### Ending

- Explain that the broadcast is ending.
- Stop accepting actions that assume a normal ongoing live event.

### Completed, cancelled or failed

- Remove live controls.
- Show the real outcome.
- Offer replay only when an authorised recording exists.
- Provide a safe route back to discovery or another meaningful action.

## Local player phases

The player keeps explicit local phases:

```text
waiting
loading
ready
playing
paused
buffering
reconnecting
ended
error
```

These phases must produce plain-language listener states:

| Player evidence | Primary listener wording |
| --- | --- |
| normal active playback | Stable |
| prolonged loading or stalled media | Buffering audio |
| repeated transport problems | Unstable connection |
| bounded automatic recovery | Reconnecting audio |
| browser offline | You are offline |
| recovery exhausted | Playback unavailable |
| stream complete | Broadcast ended |

A phone's status-bar transfer-rate number is not a valid quality measurement. Connection labels must derive from player and transport evidence such as buffering duration, packet loss, jitter, round-trip time, reconnect events, segment download time or time since the last audio packet.

## Metadata refresh and recovery

Broadcast metadata is refreshed every eight seconds. This allows scheduled events to become playable without reloading the page and allows completed, cancelled or failed broadcasts to stop the player cleanly.

The browser also listens for online and offline events. A failed playback path receives up to three bounded recovery attempts using a newly issued signed playback descriptor. Manual retry remains available afterward.

Required recovery hierarchy:

1. Explain the interruption.
2. Attempt bounded automatic recovery.
3. Switch to the reliable playback path when appropriate.
4. Request fresh signed playback access when necessary.
5. Show manual retry only after automatic recovery cannot continue.

`Retry playback` must not appear for a scheduled event and becomes the primary action only after an actual playback failure.

## Controls

The player provides when the broadcast and player state allow them:

- Play, pause and resume
- Mute and unmute
- Volume control with local preference persistence on suitable screen sizes
- Plain-language connection and recovery feedback
- Optional technical transport reporting in diagnostics
- Copyable exact listener links
- Responsive phone, tablet and desktop layouts
- Reduced-motion handling

On mobile, mute remains visible but the full-width volume slider should be hidden, collapsed or moved into an expandable player control. Hardware volume buttons are the expected primary volume control.

## Role-aware event actions

The public event route may be opened by a visitor, an ordinary listener or a signed-in organisation member.

- Visitors and ordinary listeners may receive listen, chat and request-to-speak actions according to broadcast policy.
- Organisation owners, admins and broadcasters viewing their own event should receive **Manage broadcast**, **Open studio** or **Open backstage** instead of a prominent listener call-in action.
- The UI role check is for clarity only. Fastify remains responsible for authorizing every protected operation.

## Request to speak on listener pages

The closed launcher may be fixed above the safe area only when the page reserves matching bottom clearance.

On narrow screens, the open request form and status view must use a bottom sheet or full-height modal with:

- hidden launcher while open;
- backdrop and background scroll lock;
- dynamic viewport height;
- safe-area padding;
- internally scrollable content;
- keyboard-safe submit and status actions;
- pre-filled signed-in display name and email when available;
- persistent pending, approved or rejected feedback after submission.

The producer-side half already exists in the creator backstage workflow. The listener experience must explain that approval does not automatically enable the microphone and that an approved listener proceeds through invitation, waiting room and producer admission.

## Chat on listener pages

When the broadcast is scheduled or chat is otherwise read-only, do not show a full disabled textarea, send button and character counter. Show a compact message such as:

```text
Chat will open when the broadcast starts.
```

When writable, show the composer, sending state and counter. When completed, show history according to policy without an active composer.

## Security boundaries

Fastify remains the authorization boundary.

- Public discovery never returns private or unlisted channels.
- Exact slug access permits public and unlisted broadcasts only.
- Private playback requires authentication and current organisation membership.
- Signed playback URLs use a short expiry and responses use `Cache-Control: no-store`.
- OME API credentials and signing secrets stay server-side.
- The listener application cannot choose an arbitrary internal stream name.
- Role-aware presentation never replaces API authorization.

## Deployment requirements

A production HTTPS listener page must use secure media endpoints:

```text
OME_WEBRTC_BASE_URL=wss://media.example.test:3334
OME_LLHLS_BASE_URL=https://media.example.test:3334
```

Serving an HTTPS web page with insecure `ws://` or `http://` playback endpoints will be blocked by modern browsers as mixed content.

The production web host must also route `/listen` and nested listener paths to the React application's `index.html`; otherwise direct listener links will return a server 404 before React starts.

## Existing verification

The repository contains a real media smoke test that verifies:

```text
LiveKit room -> audio publisher -> LiveKit Egress -> OvenMediaEngine -> signed LL-HLS manifest
```

The normal CI build also verifies TypeScript, React production compilation and provider authorization tests.

## Remaining verification

The happy-path media smoke test does not prove browser failover or constrained-network recovery. Production-like verification still requires:

- real WebRTC failure followed by successful LL-HLS playback;
- temporary listener network loss and recovery without page reload;
- buffering and retry exhaustion;
- high latency, packet loss and jitter;
- signed descriptor expiry during playback;
- mobile background and foreground transitions;
- measured playback latency and fallback time;
- Android Chrome, desktop Chrome, Firefox and Safari;
- low-end devices and listener capacity.

Test evidence and logs must be recorded before production readiness is claimed.
