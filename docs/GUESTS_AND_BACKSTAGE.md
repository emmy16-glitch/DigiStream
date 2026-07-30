# Guest participation and backstage control

DigiStream separates a guest invitation from admission into the LiveKit room.

## Flow

1. An owner, administrator or broadcaster creates an invitation.
2. The API returns the raw acceptance token once and stores only its SHA-256 hash.
3. The guest accepts the link once and receives a short-lived guest session token.
4. The invitation moves to `accepted`, but the guest still cannot obtain LiveKit credentials.
5. An owner, administrator, broadcaster or moderator admits the guest.
6. The admitted guest exchanges the session token for a short-lived microphone-only LiveKit credential.
7. Revocation or session expiry blocks future credential issuance.

The browser never receives the LiveKit API secret or RoomService administrator token.

## Management endpoints

```text
POST   /api/v1/organisations/:organisationId/broadcasts/:broadcastId/guest-invitations
GET    /api/v1/organisations/:organisationId/broadcasts/:broadcastId/guest-invitations
POST   /api/v1/organisations/:organisationId/broadcasts/:broadcastId/guest-invitations/:invitationId/admit
DELETE /api/v1/organisations/:organisationId/broadcasts/:broadcastId/guest-invitations/:invitationId

GET    /api/v1/organisations/:organisationId/broadcasts/:broadcastId/backstage/participants
POST   /api/v1/organisations/:organisationId/broadcasts/:broadcastId/backstage/participants/:participantIdentity/mute
DELETE /api/v1/organisations/:organisationId/broadcasts/:broadcastId/backstage/participants/:participantIdentity
```

Backstage participant actions use LiveKit RoomService `ListParticipants`, `MutePublishedTrack` and `RemoveParticipant`. The API restricts these controls to server-generated external guest identities so a moderator cannot remove a host through this route.

## Guest endpoints

```text
POST /api/v1/guest-invitations/:token/accept
POST /api/v1/guest-contribution-token
```

The second endpoint requires the `x-guest-session-token` header. Tokens are returned with `Cache-Control: no-store` responses.

## Call-ins

Listeners can submit a request through an exact public or unlisted broadcast link:

```text
POST /api/v1/broadcasts/:organisationSlug/:channelSlug/:broadcastSlug/call-ins
```

Backstage staff list and decide requests through:

```text
GET  /api/v1/organisations/:organisationId/broadcasts/:broadcastId/call-ins
POST /api/v1/organisations/:organisationId/broadcasts/:broadcastId/call-ins/:callInId/approve
POST /api/v1/organisations/:organisationId/broadcasts/:broadcastId/call-ins/:callInId/reject
```

Approval creates a normal expiring guest invitation. It does not bypass acceptance or admission.

## Failure and privacy rules

- Cross-tenant broadcast access returns the same private not-found response used elsewhere.
- Invitation acceptance is single-use.
- Expired, revoked or non-admitted guest sessions cannot obtain LiveKit credentials.
- Only scheduled, starting, live or reconnecting broadcasts accept guests and call-ins.
- Raw acceptance and session tokens are never persisted.
- Invitation lists never expose token hashes or session tokens.
- Public call-in responses do not expose internal media room names.
