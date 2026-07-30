# OvenMediaEngine public delivery adapter

DigiStream keeps contribution and public delivery separate:

```text
Creator / guest
    -> LiveKit room
    -> controlled relay or egress service
    -> RTSP or OVT source
    -> OvenMediaEngine
    -> WebRTC or LL-HLS listener
```

LiveKit remains responsible for interactive creator, guest and backstage audio. OvenMediaEngine is responsible for scalable one-to-many listener delivery. The Fastify API authorizes each transition and never exposes provider administration secrets to browsers.

## Relay boundary

OvenMediaEngine cannot pull a LiveKit room directly. `DELIVERY_RELAY_URL_TEMPLATE` is therefore an explicit contract with a separately operated relay/egress component. It must contain `{roomName}` or `{streamName}` and resolve to an RTSP or OVT source that OME can pull.

Example:

```env
DELIVERY_RELAY_URL_TEMPLATE=rtsp://relay.internal:8554/{roomName}/{streamName}
```

This repository does not pretend that the relay already exists. The adapter provisions OME against the relay URL and makes relay implementation the next infrastructure task.

## Management endpoints

Authenticated owners, administrators and broadcasters can use:

```text
POST /api/v1/organisations/:organisationId/broadcasts/:broadcastId/delivery/start
POST /api/v1/organisations/:organisationId/broadcasts/:broadcastId/delivery/refresh
POST /api/v1/organisations/:organisationId/broadcasts/:broadcastId/delivery/stop
```

`start` is accepted only after the broadcast lifecycle is `starting`, `live` or `reconnecting`. `refresh` reconciles OME state with the broadcast lifecycle. A previously live stream that disappears moves to `reconnecting`. `stop` is accepted only after the broadcast is ending or terminal.

The API marks `delivery_ready` only after OME reports that the stream exists. The broadcast becomes `live` only when both LiveKit contribution and OME delivery are ready.

## Listener playback

Public and unlisted live broadcasts use:

```text
GET /api/v1/broadcasts/:organisationSlug/:channelSlug/:broadcastSlug/playback
```

Private broadcasts require organisation membership:

```text
GET /api/v1/organisations/:organisationId/broadcasts/:broadcastId/playback
```

Responses contain short-lived signed WebRTC and LL-HLS URLs and use `Cache-Control: no-store`. The response intentionally omits the standalone internal delivery stream identifier, although the signed playback URL necessarily includes its path.

## OME API authentication

The API sends:

```text
Authorization: Basic base64(OME_API_ACCESS_TOKEN)
```

The configured access token may be a single opaque value or an RFC 7617-style `user:password` string. It is never returned to clients or written into public URLs.

## Signed playback policy

WebRTC and LL-HLS URLs include an OME signed policy containing millisecond `url_expire` and `stream_expire` values. The complete URL including its explicit port and encoded policy is authenticated with HMAC-SHA1, matching OME SignedPolicy behavior.

Playback base URLs must therefore include an explicit port, including default TLS ports when those are used.

## Required configuration

```env
OME_API_URL=http://127.0.0.1:8081
OME_API_ACCESS_TOKEN=replace-with-ome-api-access-token
OME_VHOST=default
OME_APP=live
OME_WEBRTC_BASE_URL=wss://media.example.test:3334
OME_LLHLS_BASE_URL=https://media.example.test:3334
OME_SIGNED_POLICY_SECRET=replace-with-ome-signed-policy-secret
OME_PLAYBACK_TTL_SECONDS=120
DELIVERY_RELAY_URL_TEMPLATE=rtsp://relay.internal:8554/{roomName}/{streamName}
```

All six core OME and relay values must either be configured together or omitted together. Partial configuration fails during application startup instead of producing an insecure half-configured deployment.

## Failure behavior

- OME API timeouts and transport failures become a safe `502 DELIVERY_PROVIDER_ERROR` response.
- OME authentication or authorization failures become a safe `503` response.
- A missing OME stream is treated as not ready rather than as a successful delivery.
- OME stream creation accepts `201 Created` and `409 Conflict`, making repeated starts idempotent.
- OME deletion accepts `200 OK` and `404 Not Found`, making repeated stops idempotent.
- Provider response bodies and credentials are not exposed in public API errors.
