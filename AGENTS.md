# DigiStream contributor and implementation-agent instructions

## Authority order

Before changing DigiStream, read and follow these sources in this order:

1. `docs/PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`
2. `docs/CREATOR_ONBOARDING_AND_ACTIVATION.md`
3. `docs/PRODUCT_DESIGN_AND_FLOW_HARDENING.md`
4. `docs/PRODUCT_SPECIFICATION.md`
5. `docs/ROADMAP.md`
6. `docs/ARCHITECTURE.md`
7. feature-specific documents and the current implementation

A decorative reference, stale test, generic dashboard pattern or old copy does not override the quality, authorization, lifecycle, onboarding or product-flow contracts above.

## Immediate product priority

After safely finishing any already-active pull request, continue the creator onboarding, activation, Studio-readiness and first-completion journey defined in `docs/CREATOR_ONBOARDING_AND_ACTIVATION.md` as the next highest-priority product correction.

Do not interpret that document as a vague design suggestion. Its six-step journey, returning-state table, acceptance tests, anti-duplication rules and truthful-data boundaries are mandatory implementation requirements.

The current broken journey allows a new creator to create an organisation, land on Overview, open Broadcast Studio and only then discover that no channel exists. Correct the complete journey before adding unrelated decorative expansion.

## Next mandatory programme after onboarding

After every mandatory onboarding and activation slice is implemented, merged, verified and reconciled with documentation, immediately execute `docs/PRODUCT_DESIGN_AND_FLOW_HARDENING.md` through bounded dependency-ordered pull requests.

That document is the authoritative next product-design programme. It is not optional polish and it does not authorize a visual rewrite. It requires agents to connect the existing capable surfaces into one coherent product while preserving DigiStream’s dark design identity, truthful lifecycle communication, backend authority and media reliability.

The next programme includes:

- replacing hardcoded creator setup inputs with a real API-backed workspace projection;
- making Overview show the exact next valid action for every returning state;
- passing organisation, channel and broadcast context into the existing Studio and Backstage workspaces;
- restoring discoverability of the real API-backed Recordings workspace while keeping unfinished Analytics hidden;
- consolidating duplicate Studio calls to action and using lifecycle-specific row actions;
- reorganizing Backstage into Call-ins, Invited guests and On stage without duplicating its APIs or component;
- standardizing focus trapping, Back handling, scroll locking, safe closure and focus restoration across overlays;
- reducing unnecessary mobile vertical travel while preserving touch targets, labels, safe areas and truthful detail;
- fixing primary-button contrast and standardizing enabled, disabled, loading, focus and pressed states;
- aligning authentication language for listener and creator intent;
- improving post-broadcast continuity through existing recording and replay surfaces;
- preserving the listener experience and changing it only through conservative, regression-tested polish;
- running accessibility and non-technical usability acceptance before declaring the programme complete.

Do not begin this second programme while a required onboarding slice remains only documented. Once the onboarding journey is complete, do not skip the hardening programme for unrelated feature expansion unless a real dependency is documented.

## Required onboarding end-to-end sequence

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

- existing registration/login and listener discovery;
- `OrganisationSetup` in `apps/web/src/App.tsx`;
- `CreatorBroadcastsPage`;
- `CreatorBroadcastStudio`;
- `CreatorBackstageWorkspace`;
- `CreatorRecordingsPage`;
- existing Broadcasts, recording and replay surfaces;
- existing organisation, channel, broadcast, media, recording and replay APIs;
- existing lifecycle, capability, role and private-not-found boundaries;
- existing shared design-system components and creator/listener shells.

A lightweight route or state orchestrator may coordinate these surfaces, but it must not copy their forms, APIs or business logic.

### Specific onboarding UX requirements

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

### Specific product-hardening UX requirements

After onboarding completion, all agents must follow the complete workstreams and acceptance gates in `docs/PRODUCT_DESIGN_AND_FLOW_HARDENING.md`. At minimum:

- no hardcoded `channelStatus: 'none'` or `broadcastStatus: 'none'` may drive returning-user navigation;
- `organisations[0]` must not remain the permanent implicit workspace when multiple organisations require user selection;
- Overview must answer what is happening, what the user should do next and what is blocked;
- contextual actions must preselect and re-verify their exact organisation, channel and broadcast;
- Recordings must not remain hidden when its real authorized workspace is available;
- Analytics must remain hidden until trustworthy data and complete states exist;
- creator vocabulary is Overview, Broadcasts, Backstage, Recordings and Studio;
- each state has one contextual primary action;
- duplicate page headings and duplicate generic Studio buttons are removed;
- enabled green primary actions must not use muted disabled-looking text;
- responsive acceptance measures task efficiency and vertical travel, not only horizontal overflow;
- shared overlay behavior must cover focus, Escape, Android/browser Back, scroll lock, keyboard, safe areas and focus restoration;
- all counts, readiness claims, durations, recording states and replay actions remain evidence-backed.

## Bounded implementation order

### Onboarding and activation

Work through the authoritative onboarding journey in bounded pull requests when necessary:

1. first-registration listener/creator intent and routing;
2. organisation-to-channel continuation;
3. authorized create-and-activate first channel;
4. first-broadcast choice and state-aware Overview;
5. truthful Studio checklist and valid preselection;
6. truthful completed-broadcast, recording and replay next actions;
7. returning-user, recovery, mobile and accessibility hardening;
8. documentation reconciliation.

### Product design and flow hardening

Only after the onboarding sequence is complete, follow the dependency order in `docs/PRODUCT_DESIGN_AND_FLOW_HARDENING.md`:

1. authoritative workspace projection and state invariants;
2. state-aware Overview;
3. contextual Studio and Backstage opening;
4. navigation and Recordings discoverability;
5. broadcast action consolidation;
6. Backstage information architecture and shared modal behavior;
7. mobile density and progressive disclosure;
8. design-system contrast and interaction audit;
9. authentication and post-broadcast continuity;
10. conservative listener polish and routing assessment;
11. accessibility and non-technical usability verification;
12. obsolete-code and documentation reconciliation.

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
- test short-height landscape for operational and modal layouts;
- verify browser/Android Back, refresh, session recovery, repeated submission, long text and no horizontal overflow;
- verify virtual-keyboard open/closed and safe-area behavior for affected mobile forms;
- verify new listener, new creator and every returning setup state affected by the pull request;
- verify one contextual primary action per state;
- verify focus containment and restoration for affected dialogs/sheets;
- update all relevant authoritative documentation;
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
- a second Backstage workspace;
- a second Recordings workspace;
- a disconnected fake completion, replay or analytics page;
- multiple competing primary actions for one state;
- client-side lifecycle or authorization shortcuts;
- client-only resources presented as durable server state;
- a new component library that merely renames existing design-system primitives;
- a route migration that rewrites feature business logic without a demonstrated routing need.

## Anti-rubbish implementation check

Before approving any product-facing change, confirm:

- the state is API-backed or based on verified browser/media evidence;
- the primary action can succeed from the current state;
- refresh and reconnect reconstruct the same task;
- the existing responsible component and API are reused;
- backend authorization remains independent;
- loading, disabled, failure and recovery states are understandable;
- Back, focus and keyboard behavior are correct;
- a physical-size phone remains efficient, not merely overflow-free;
- long names, descriptions, URLs and slugs remain usable;
- fixed controls reserve content space;
- no count, metric, readiness or replay capability is fabricated;
- regression tests and documentation are aligned.

## Reporting

Report only meaningful completed behavior, validation evidence or a specific blocker requiring user action. Distinguish:

- implemented and automated-test verified;
- manually verified with a physical microphone or real media stack;
- manually verified through accessibility or non-technical usability testing;
- documented but not implemented;
- blocked by a missing real data or provider foundation.

Never describe the complete onboarding or post-broadcast journey as finished while a mandatory step in `docs/CREATOR_ONBOARDING_AND_ACTIVATION.md` remains only documented.

Never describe the product-design and flow-hardening programme as complete while a supported creator state still uses hardcoded setup status, a working feature remains undiscoverable, a contextual action reopens an unnecessary selector, mobile controls remain covered or excessively inefficient, contrast makes enabled actions look disabled, or modal/accessibility acceptance remains unverified.
