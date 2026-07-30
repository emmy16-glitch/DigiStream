# Guest browser and creator backstage interface

This document describes the browser surfaces that sit on top of the guest and call-in APIs.

## External guest route

External guests use:

```text
/guest/:acceptanceToken
```

The raw acceptance token exists in the invitation URL and is sent to the API only when the guest accepts the invitation. The server stores only its SHA-256 hash.

After acceptance, the browser keeps the short-lived guest session token in `sessionStorage`. It is not written to `localStorage`, a cookie, application logs or the page URL. Closing the browser tab removes it under normal browser behaviour.

## Guest waiting-room flow

```text
Open invitation link
        ↓
Enter display name and accept once
        ↓
Prepare microphone and select input
        ↓
Poll the guest credential endpoint
        ↓
Host admits the accepted invitation
        ↓
Receive short-lived microphone-only LiveKit credential
        ↓
Join and publish microphone backstage
```

The browser cannot join before admission. Acceptance and admission remain separate server-side transitions.

The guest page provides:

- microphone permission and input-device selection;
- a live level meter and clipping warning;
- waiting, admitted, connecting and reconnecting states;
- backstage audio playback with an explicit autoplay-recovery button;
- mute/unmute and clean leave controls;
- automatic media and timer cleanup when the page closes.

## Creator backstage workspace

Creators open **Backstage**, **Manage guests** or the **Audience** navigation item from the dashboard.

The workspace uses the existing HttpOnly creator session and lets authorized organisation members select an organisation, channel and scheduled/active broadcast.

It provides three operational panels.

### Invitation desk

Owners, administrators and broadcasters can create guest invitations with optional display name/email and a bounded expiry. The raw invitation link is shown only in the creation response and kept in page memory for copying. Refreshing the page cannot recover that raw token because the server stores only a hash.

Moderators can list, admit and revoke guest invitations but cannot create new invitations.

### LiveKit room

The participant panel polls the server-side RoomService projection. Hosts and monitors are visible but protected from guest-control actions. External guests can be muted/unmuted or removed through server-authorized LiveKit operations.

A LiveKit configuration or provider failure is shown separately from database-backed invitations and call-ins, so the rest of the workspace remains usable.

### Call-ins

Pending public call-in requests can be approved or rejected. Approval creates a normal guest invitation and returns its raw invitation token once. It does not bypass invitation acceptance or host admission.

## Security boundaries

- Guest invitation and session tokens are never placed in React logs or analytics payloads.
- Creator actions use the existing HttpOnly authenticated session.
- Guest media credentials are short-lived and microphone-only.
- LiveKit API credentials and RoomService permissions remain in Fastify.
- The UI cannot target host identities with guest mute/remove endpoints.
- Every request continues to use organisation and broadcast authorization enforced by the API.

## Deployment requirements

Production guest pages require HTTPS because microphone capture and secure LiveKit WebSockets are browser security requirements. The reverse proxy must route `/guest/*` to the React application while preserving `/api/*` for Fastify.
