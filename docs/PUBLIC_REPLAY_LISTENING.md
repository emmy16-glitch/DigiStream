# Public and member replay listening

This document defines the Phase 8 replay-listening implementation after recording retention and protected cleanup.

## Goal

Expose real, authorised replay listening without making private storage public, leaking object keys or presenting an unfinished recording as playable.

The implementation adds:

- public replay discovery for published recordings on active public channels;
- exact unlisted replay links that are not returned by discovery;
- authenticated organisation-member access to private replays;
- short-lived playback grants minted only after the API rechecks recording, channel, broadcast and retention state;
- responsive replay pages with a user-initiated HTML audio player;
- honest loading, unavailable, expired-link, archived and playback-failure states;
- browser regression coverage on desktop Chrome, Android Chrome and Android Desktop-site simulation.

## API surface

Public discovery and exact routes:

- `GET /api/v1/replays`
- `GET /api/v1/replays/:organisationSlug/:channelSlug/:broadcastSlug`
- `POST /api/v1/replays/:organisationSlug/:channelSlug/:broadcastSlug/access`

Authenticated member route:

- `GET /api/v1/organisations/:organisationId/replays/:recordingId`

The existing organisation-member recording access route remains the authorization boundary for private playback grants.

## Discovery rules

A replay may appear in public discovery only when all of these are true:

- the recording status is `published`;
- the verified artifact is ready;
- the broadcast is completed;
- the channel is active and public;
- deletion has not been requested;
- cleanup has not started or completed;
- no legal or moderation hold is active.

Unlisted channels may be opened only through the exact organisation, channel and broadcast slug route. Private channels require an authenticated organisation membership.

## Playback authorization

The browser never receives an object-storage key or credential. It requests a short-lived playback grant from DigiStream, then uses the existing `/api/v1/recording-media?token=...` delivery path.

Every grant request reloads current database state. Archived, made-private, deleted, deletion-scheduled, held or otherwise non-deliverable recordings fail closed even when a stale discovery response remains in a browser cache.

Playback grants carry an explicit `public` or `member` scope. A public grant remains valid only while the recording is published and its channel is active with public or unlisted visibility. A member grant remains valid only for an authenticated organisation-member flow and may serve published or private recordings. Public grants cannot silently become member grants after a visibility change.

The media route independently rechecks the grant scope, recording, broadcast, channel and retention policy for every request. A token minted before a recording becomes private, a moderation or legal hold, a deletion request, an archive action or a channel suspension is therefore revoked immediately rather than remaining usable until token expiry.

Playback links remain private, short-lived and `no-store`. Expiry during listening is communicated clearly and is not described as a general application-server failure.

## Listener experience

The replay page displays only real metadata:

- broadcast and channel identity;
- completion or publication date;
- verified duration, format and size;
- actual playback availability;
- clear access or failure guidance.

The player starts only after a user action. Loading and retry controls do not imply success before a playback grant exists. Mobile controls remain reachable on narrow portrait and short-height landscape screens.

Listener routes:

- `/listen/replays`
- `/listen/replay/:organisationSlug/:channelSlug/:broadcastSlug`
- `/listen/member-replay/:organisationId/:recordingId`

## Creator workflow

Published recording cards on public or unlisted channels link to the exact listener replay page. Published recordings on private channels and recordings explicitly marked private link to the authenticated member replay page. Archiving, making a recording private, changing a channel to private or scheduling deletion revokes public playback immediately.

## Validation gate

The pull request remains draft until it passes:

- API integration tests for public, unlisted, private, archived, deletion-scheduled, held and cross-tenant cases;
- playback-grant revocation tests after policy changes;
- responsive replay discovery and exact-page browser tests;
- Node 22 and Node 24 typecheck, complete API tests and production builds;
- Playwright desktop, Android and Android Desktop-site coverage;
- infrastructure and production API image checks.
