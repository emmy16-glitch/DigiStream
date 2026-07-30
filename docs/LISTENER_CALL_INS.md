# Listener request-to-speak controls

DigiStream exposes request-to-speak controls only on exact public and unlisted broadcast pages. Private organisation-member playback pages do not expose the public call-in form.

## Listener flow

1. The listener opens the request-to-speak panel.
2. They provide a display name, optional contact email and optional short message.
3. The API creates a pending call-in request and returns a strong status token once.
4. The browser stores that status token in `sessionStorage` for the current tab/session.
5. The listener page polls the private status endpoint every five seconds.
6. The production team approves or rejects the request in the creator backstage workspace.
7. Approved listeners receive preparation guidance. The host still controls delivery of the expiring guest invitation link and later backstage admission.

Approval never grants microphone access directly. The existing guest flow still requires an expiring guest invitation, one-time acceptance, host admission and a short-lived microphone-only LiveKit credential.

## API

Create a request:

```text
POST /api/v1/broadcasts/:organisationSlug/:channelSlug/:broadcastSlug/call-ins
```

The successful response contains the public call-in DTO plus:

```text
statusToken
statusExpiresAt
```

The raw status token is not stored in PostgreSQL. Only its SHA-256 hash is stored.

Read private status:

```text
GET /api/v1/call-ins/:statusToken
```

The status response exposes only the display name, request state, timestamps, whether contact information was supplied and safe listener guidance. It does not expose the contact email, message, organisation identifier, broadcast identifier, invitation identifier or staff identity.

Both responses use `Cache-Control: no-store`.

## Duplicate and rate-limit protection

The API computes a one-way HMAC request fingerprint from bounded request metadata and the normalized optional email. The raw IP address and user-agent value are not stored with the call-in request.

PostgreSQL enforces one pending request per broadcast and request fingerprint. This prevents concurrent requests from bypassing the duplicate check.

A rolling limit also applies to decided and pending requests from the same fingerprint for the same broadcast. The defaults are:

```text
3 requests per 1800 seconds
```

A limited request returns HTTP `429`, a `Retry-After` header and an API error detail containing `retryAfterSeconds`.

Configuration:

```text
CALL_IN_FINGERPRINT_SECRET
CALL_IN_RATE_LIMIT_MAX
CALL_IN_RATE_LIMIT_WINDOW_SECONDS
CALL_IN_STATUS_TTL_SECONDS
```

`CALL_IN_FINGERPRINT_SECRET` must be a unique random secret in production. DigiStream refuses public call-in creation in production when that secret is absent.

## Browser storage

The listener client uses `sessionStorage`, not `localStorage`, for call-in status tokens. Closing the tab removes normal access to the token. A different browser session cannot inspect or poll the request.

The page restores polling after a refresh in the same tab, stops using expired or invalid status tokens, and shows specific messages for duplicate requests, closed call-ins and rate limits.

## Remaining delivery boundary

The current approval status tells the listener to follow the host's instructions. DigiStream does not yet email guest links automatically. Email delivery and durable user notifications belong to the notification infrastructure phase.
