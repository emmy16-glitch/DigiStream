# DigiStream contributor and implementation-agent instructions

## Authority order

Before changing DigiStream, read and follow these sources in this order:

1. `docs/PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`
2. `docs/CREATOR_ONBOARDING_AND_ACTIVATION.md`
3. `docs/PRODUCT_SPECIFICATION.md`
4. `docs/ROADMAP.md`
5. `docs/ARCHITECTURE.md`
6. feature-specific documents and the current implementation

A decorative reference, stale test or old copy does not override the quality, authorization, lifecycle or onboarding contracts above.

## Immediate product priority

After safely finishing any already-active pull request, the next highest-priority product correction is the creator onboarding and activation flow defined in `docs/CREATOR_ONBOARDING_AND_ACTIVATION.md`.

The current broken journey allows a new creator to create an organisation, land on Overview, open Broadcast Studio and only then discover that no channel exists. Correct that journey before adding unrelated decorative expansion.

## Implementation rule

Reuse and realign the existing implementation. Do not create duplicate pages or parallel product flows.

Required existing surfaces:

- `OrganisationSetup` in `apps/web/src/App.tsx`
- `CreatorBroadcastsPage`
- `CreatorBroadcastStudio`
- existing organisation, channel and broadcast APIs
- existing lifecycle and authorization boundaries
- existing shared design-system components and creator shell

A route/state orchestrator may coordinate these surfaces, but it must not copy their forms or business logic.

## Required creator sequence

```text
Create account
-> Create organisation
-> Existing Broadcasts page opens automatically
-> Existing first-channel form opens automatically
-> Owner/admin creates and activates the first channel through authorized API transitions
-> Existing broadcast form presents Go live now, Schedule for later or Finish later
-> Existing Studio opens only after a valid broadcast exists
```

The creator Overview and navigation must present the next valid API-backed action. Never promote a dead-end Studio action when the organisation lacks a usable channel or broadcast.

Rename the narrow creator navigation label from ambiguous `Live` to a broadcast-management label such as `Streams`, while preserving `/creator/broadcasts` and the desktop `Broadcasts` destination.

## Pull-request discipline

Work in one bounded pull request at a time.

Before merge:

- re-check the current branch and main head;
- preserve backend authorization and private-not-found boundaries;
- add regression tests before or with the implementation;
- run type checks, the complete API tests, production builds, responsive Playwright coverage and infrastructure validation;
- test desktop Chromium, Android Chrome and Android desktop-site simulation;
- verify browser/Android Back, refresh, long text and no horizontal overflow;
- update all relevant documentation listed in the onboarding document;
- resolve every review thread and real failure;
- do not merge failing or unreviewed work;
- do not fabricate data, readiness, listener counts, analytics, recordings or media evidence.

## Anti-duplication gate

Reject a change that introduces any of the following when an existing surface can be reused:

- a second creator dashboard;
- a copied onboarding application;
- a duplicate channel form or channel-management page;
- a duplicate broadcast form or broadcast-management page;
- a second Studio;
- multiple competing primary actions for one empty state;
- client-side lifecycle shortcuts that bypass the API.

## Reporting

Report only meaningful completed behaviour, validation evidence or a specific blocker requiring user action. Distinguish implementation completion from manual physical-microphone, real-media-stack or production-network verification that has not actually been performed.
