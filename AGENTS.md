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

After safely finishing any already-active pull request, continue the creator onboarding, activation, Studio-readiness and first-completion journey defined in `docs/CREATOR_ONBOARDING_AND_ACTIVATION.md` as the next highest-priority product correction.

Do not interpret that document as a vague design suggestion. Its six-step journey, returning-state table, acceptance tests, anti-duplication rules and truthful-data boundaries are mandatory implementation requirements.

The current broken journey allows a new creator to create an organisation, land on Overview, open Broadcast Studio and only then discover that no channel exists. Correct that journey before adding unrelated decorative expansion.

## Required end-to-end sequence

```text
Create account
-> choose Broadcast audio or Listen to broadcasts
-> listener choice reaches existing listener discovery without organisation creation
-> creator creates organisation as Step 1 of 3
-> existing Broadcasts page and first-channel form open automatically as Step 2 of 3
-> owner/admin creates and activates the first channel through authorized API transitions
-> existing broadcast creation presents Go live now, Schedule for later or Finish later as Step 3 of 3
-> existing Studio opens only after a valid broadcast exists
-> Studio presents real organisation, channel, broadcast, microphone, server and listener-delivery readiness
-> Go live remains blocked until contribution and public delivery are verified
-> completed broadcast presents truthful duration, recording, replay, sharing and create-another-broadcast actions
```

A missing backend foundation does not permit a fake UI. Record it as bounded follow-up work and omit or clearly mark the capability unavailable until real data exists.

## Reuse and implementation rule

Reuse and realign the existing implementation. Do not create duplicate pages or parallel product flows.

Required existing surfaces:

- existing registration/login and listener discovery
- `OrganisationSetup` in `apps/web/src/App.tsx`
- `CreatorBroadcastsPage`
- `CreatorBroadcastStudio`
- existing Broadcasts, recording and replay surfaces
- existing organisation, channel, broadcast, media, recording and replay APIs
- existing lifecycle, capability, role and private-not-found boundaries
- existing shared design-system components and creator/listener shells

A lightweight route or state orchestrator may coordinate these surfaces, but it must not copy their forms, APIs or business logic.

### Specific UX requirements

- A listener is never forced to create an organisation.
- Organisation setup is `Step 1 of 3` with `Continue to channel setup`.
- The organisation-logo field remains absent until real storage-backed organisation branding exists; do not create a browser-only fake upload.
- First-channel setup is `Step 2 of 3` and opens automatically.
- Owners/admins see one `Create and activate channel` action while the server still enforces the real lifecycle.
- Non-approving broadcasters cannot self-activate.
- First-broadcast choice is `Step 3 of 3` with Go live now, Schedule for later and Finish later.
- Overview and navigation always show the next valid API-backed action.
- Do not promote a dead-end Studio, Backstage or replay action.
- Rename the narrow creator navigation label from ambiguous `Live` to a broadcast-management label such as `Streams`, while preserving `/creator/broadcasts` and desktop `Broadcasts`.
- Studio readiness separates microphone/private contribution from public listener delivery.
- A completed-broadcast summary uses real timestamps, audience evidence and recording state only.
- Peak listeners is not shown as a fake zero when measurement is unavailable.
- Replay and share actions appear only for real authorized playable artifacts and valid visibility.

## Bounded implementation order

Work through the authoritative journey in bounded pull requests when necessary:

1. first-registration listener/creator intent and routing;
2. organisation-to-channel continuation;
3. authorized create-and-activate first channel;
4. first-broadcast choice and state-aware Overview;
5. truthful Studio checklist and valid preselection;
6. truthful completed-broadcast, recording and replay next actions;
7. returning-user, recovery, mobile and accessibility hardening;
8. documentation reconciliation.

Do not create one unsafe giant pull request. Do not abandon the required end-to-end journey for unrelated expansion between slices unless a specific dependency is documented.

## Pull-request discipline

Work in one bounded pull request at a time.

Before merge:

- re-check the current branch, active pull requests and `main` head;
- preserve backend authorization and private-not-found boundaries;
- add regression tests before or with the implementation;
- run type checks, complete API tests, production builds, responsive Playwright coverage and infrastructure validation;
- test Node 22 and Node 24;
- test desktop Chromium, Android Chrome and Android desktop-site simulation;
- verify browser/Android Back, refresh, session recovery, repeated submission, long text and no horizontal overflow;
- verify new listener, new creator and every returning setup state affected by the pull request;
- verify one contextual primary action per state;
- update all relevant documentation listed in the onboarding document;
- resolve every review thread and real failure;
- do not merge failing or unreviewed work;
- do not fabricate data, readiness, listener counts, analytics, recordings or media evidence.

## Anti-duplication gate

Reject a change that introduces any of the following when an existing surface can be reused:

- a second creator dashboard;
- a copied onboarding application;
- duplicate organisation, channel or broadcast forms;
- a duplicate channel-management page;
- a duplicate broadcast-management page;
- a second Studio;
- a disconnected fake completion, replay or analytics page;
- multiple competing primary actions for one state;
- client-side lifecycle or authorization shortcuts;
- client-only resources presented as durable server state.

## Reporting

Report only meaningful completed behaviour, validation evidence or a specific blocker requiring user action. Distinguish:

- implemented and automated-test verified;
- manually verified with a physical microphone or real media stack;
- documented but not implemented;
- blocked by a missing real data or provider foundation.

Never describe the complete onboarding or post-broadcast journey as finished while a mandatory step in `docs/CREATOR_ONBOARDING_AND_ACTIVATION.md` remains only documented.
