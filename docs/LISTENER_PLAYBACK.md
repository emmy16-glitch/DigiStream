# Listener playback client

DigiStream's listener application is a responsive React experience backed by the existing Fastify broadcast and playback APIs. OvenMediaEngine remains the public media-delivery provider. The web application does not receive the OME administration token, signing secret, internal stream name or LiveKit credentials.

## Routes

```text
/listen
/listen/:organisationSlug/:channelSlug/:broadcastSlug
/listen/member/:organisationId/:broadcastId
```

`/listen` is public discovery. It lists only broadcasts belonging to active public channels.

The slug route is the exact public or unlisted listener link. Unlisted broadcasts do not appear in discovery but remain accessible through their exact path.

The member route is for private organisation broadcasts. It uses the existing HttpOnly session cookie and requires current organisation membership before metadata or playback access is returned.

## Playback selection

The player requests a short-lived playback descriptor from Fastify. The response contains signed OME URLs ordered as:

```text
1. WebRTC
2. LL-HLS
```

OvenPlayer attempts WebRTC first for the lowest practical listener delay. Automatic fallback is enabled, so LL-HLS is selected when WebRTC is unsupported or cannot establish a healthy connection.

The player UI reports the active path as either:

```text
WebRTC · ultra-low latency
LL-HLS · reliable fallback
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

## Listener states

The listener page presents explicit states instead of treating every media interruption as a generic failure:

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

Broadcast metadata is refreshed every eight seconds. This allows scheduled events to become playable without reloading the page and allows completed, cancelled or failed broadcasts to stop the player cleanly.

The browser also listens for online and offline events. A failed playback path receives up to three bounded recovery attempts using a newly issued signed playback descriptor. Manual retry remains available afterward.

## Controls

The player provides:

- Play, pause and resume
- Mute and unmute
- Volume control with local preference persistence
- Active transport reporting
- Buffering and reconnection feedback
- Copyable exact listener links
- Responsive phone, tablet and desktop layouts
- Reduced-motion handling

## Security boundaries

Fastify remains the authorization boundary.

- Public discovery never returns private or unlisted channels.
- Exact slug access permits public and unlisted broadcasts only.
- Private playback requires authentication and current organisation membership.
- Signed playback URLs use a short expiry and responses use `Cache-Control: no-store`.
- OME API credentials and signing secrets stay server-side.
- The listener application cannot choose an arbitrary internal stream name.

## Deployment requirements

A production HTTPS listener page must use secure media endpoints:

```text
OME_WEBRTC_BASE_URL=wss://media.example.test:3334
OME_LLHLS_BASE_URL=https://media.example.test:3334
```

Serving an HTTPS web page with insecure `ws://` or `http://` playback endpoints will be blocked by modern browsers as mixed content.

The production web host must also route `/listen` and nested listener paths to the React application's `index.html`; otherwise direct listener links will return a server 404 before React starts.

## Remaining verification

The normal CI build verifies TypeScript, React production compilation and the existing provider authorization tests. A production-like deployment still needs browser verification across current Android Chrome, desktop Chrome, Firefox and Safari, including real WebRTC-to-LL-HLS fallback and measured playback latency.
