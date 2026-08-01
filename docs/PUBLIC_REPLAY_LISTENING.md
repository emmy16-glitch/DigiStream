# Public and member replay listening

This document defines the next Phase 8 implementation slice after recording retention and protected cleanup.

## Goal

Expose real, authorised replay listening without making private storage public, leaking object keys or presenting an unfinished recording as playable.

The slice will add:

- public replay discovery for published recordings on active public channels;
- exact unlisted replay links that are not returned by discovery;
- authenticated organisation-member access to private replays;
- short-lived playback grants minted only after the API rechecks recording, channel, broadcast and retention state;
- responsive replay pages with a user-initiated HTML audio player;
- honest loading, unavailable, expired-link, archived and playback-failure states;
- browser regression coverage on desktop Chrome, Android Chrome and Android Desktop-site simulation.

## Proposed API surface

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
- no legal or moderation hold requires the replay to be hidden by policy.

Unlisted channels may be opened only through the exact organisation, channel and broadcast slug route. Private channels require an authenticated organisation membership.

## Playback authorization

The browser never receives an object-storage key or credential. It requests a short-lived playback grant from DigiStream, then uses the existing `/api/v1/recording-media?token=...` delivery path.

Every grant request must reload current database state. Archived, private, deleted, deletion-scheduled or otherwise non-deliverable recordings fail closed even when a stale discovery response remains in a browser cache.

Playback links remain private, short-lived and `no-store`. Expiry during listening must be communicated clearly and must not be confused with general application-server failure.

## Listener experience

The replay page must display only real metadata:

- broadcast and channel identity;
- completion or publication date;
- verified duration, format and size when present;
- actual playback availability;
- clear access or failure guidance.

The player starts only after a user action. Loading and retry controls must not imply success before the media element confirms it can play. Mobile controls must remain reachable above safe areas and bottom navigation.

## Validation gate

The pull request remains draft until it includes:

- API integration tests for public, unlisted, private, archived, deletion-scheduled and cross-tenant cases;
- playback-grant expiry and revocation tests;
- responsive replay discovery and exact-page browser tests;
- Node 22 and Node 24 typecheck, complete API tests and production builds;
- Playwright desktop, Android and Android Desktop-site coverage;
- updated roadmap and recording documentation.
