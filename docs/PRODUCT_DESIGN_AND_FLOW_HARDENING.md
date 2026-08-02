# DigiStream product design and flow hardening programme

## Authority, timing and purpose

This document is the authoritative implementation programme for the product-design, information-architecture, discoverability, contextual-navigation, mobile-density and interaction-quality work that follows the mandatory creator onboarding and activation journey in [`CREATOR_ONBOARDING_AND_ACTIVATION.md`](CREATOR_ONBOARDING_AND_ACTIVATION.md).

The current onboarding programme remains first priority. An implementation agent must finish every required onboarding slice, acceptance gate, review thread and validation requirement before beginning this programme, unless a specific defect here blocks the onboarding work itself.

This is not a request for a cosmetic redesign. DigiStream already has a useful dark visual identity, a shared design system, API-backed creator and listener surfaces, truthful lifecycle communication and strong media-recovery behaviour. The goal is to preserve those strengths while correcting fragmented creator flows, hidden functionality, duplicate decisions, mobile information density, inconsistent terminology and interaction defects.

This document does not authorize duplicate onboarding pages, a second dashboard, a second Broadcasts page, a second Studio, duplicate Backstage or Recordings workspaces, parallel lifecycle state, browser-only resources or invented product data. Existing components, routes, APIs, authorization rules and lifecycle services remain authoritative.

When this document conflicts with a decorative mock-up, generic dashboard pattern or convenience shortcut, follow this authority order:

1. [`PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`](PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md)
2. [`CREATOR_ONBOARDING_AND_ACTIVATION.md`](CREATOR_ONBOARDING_AND_ACTIVATION.md) until its complete journey is implemented and verified
3. this document
4. [`PRODUCT_SPECIFICATION.md`](PRODUCT_SPECIFICATION.md)
5. [`ROADMAP.md`](ROADMAP.md)
6. feature-specific documents and the existing implementation

## Baseline assessment

DigiStream is a strong early beta rather than an ordinary visual prototype.

Existing strengths that must be preserved:

- one shared token system for colour, typography, spacing, radius, shadows, motion and control sizing;
- reusable buttons, status badges, state panels, icons, shells and accessible audio meters;
- separate creator and listener shells;
- truthful scheduled, starting, live, reconnecting, ending, completed, cancelled and failed presentation;
- explicit loading, empty, error, offline and unauthorized states;
- WebRTC-first listener playback with automatic LL-HLS fallback;
- bounded playback recovery and evidence-based unstable-connection presentation;
- role-aware call-in actions for visitors, production users, moderators and analysts;
- secure API-backed organisation, channel, broadcast, Studio, Backstage, recording and replay operations;
- measured microphone states and separation of microphone readiness, private contribution and public delivery;
- responsive Playwright coverage for desktop Chromium, Android Chrome and Android desktop-site simulation;
- honest omission of fake listener counts, fake analytics, fake health scores and dead replay actions.

The primary remaining product-design weakness is creator journey fragmentation. Individual screens are capable, but users still have to understand how several routes, selectors and modal workspaces connect. The programme below turns those capable surfaces into one coherent product without replacing them.

## Non-negotiable product invariants

Every implementation in this programme must preserve the following invariants.

### Truth before appearance

- Scheduled content never looks or behaves live.
- A moving microphone meter never implies that listeners can hear audio.
- A private LiveKit connection never implies that public delivery is ready.
- A disabled primary action never looks enabled.
- A green or visually dominant action must be usable from the current state.
- Missing measurements are omitted or described as unavailable, never shown as invented zeroes.
- A recording, replay, share link, graph, statistic or health state appears only when a real authorized source exists.

### API-backed navigation

- Overview, navigation, Studio entry, Backstage entry, Recordings actions and replay actions derive from real API state.
- Browser-local wizard state may support presentation but cannot be the source of truth for completed setup.
- Refresh, reconnect, session recovery and device switching reconstruct the same valid next action.
- One current organisation, channel and broadcast context is carried into the next surface whenever the user selected a contextual action.

### One surface per responsibility

- `OrganisationSetup` owns organisation creation.
- `CreatorBroadcastsPage` owns channel and broadcast creation/management.
- `CreatorBroadcastStudio` owns microphone, contribution, delivery and live control.
- `CreatorBackstageWorkspace` owns call-ins, invitations and participant operations.
- `CreatorRecordingsPage` owns recording and replay management.
- Listener discovery, live listening and replay listening remain distinct existing listener surfaces.

An orchestrator may pass state, open a form or select a resource. It must not copy the form, API mutation, authorization decision or lifecycle logic into another component.

### One contextual primary action

Each product state has one obvious primary action. Secondary actions remain visibly secondary. A page must not display multiple competing controls that lead to the same selector or dead-end workflow.

## Programme completion definition

This programme is complete only when all of the following are true:

- the creator shell derives its next action from real organisation, channel, broadcast and recording state;
- every contextual Studio or Backstage action opens with the intended organisation, channel and broadcast already selected;
- Recordings is discoverable whenever its real API-backed workspace is available;
- Analytics remains hidden until trustworthy metrics and complete states exist;
- creator and listener terminology is consistent;
- duplicate headings and duplicate primary actions are removed;
- all modal workspaces share correct focus, Back, scroll-lock and focus-restoration behaviour;
- Android portrait, Android desktop-site mode, short-height landscape and desktop layouts are usable without horizontal overflow or excessive unnecessary scrolling;
- primary, disabled, focus and status contrast passes automated and manual review;
- long names, descriptions, URLs and generated slugs remain readable without creating unusably tall list cards;
- non-technical users can complete the main creator and listener tasks without coaching;
- all affected documents and tests agree with the implementation.

A changed colour, reorganized CSS file or screenshot alone does not satisfy this completion definition.

## Workstream 1 — Authoritative creator workspace projection

### Current problem

The onboarding state model defines useful states such as `create_channel`, `finish_channel_activation`, `create_broadcast`, `prepare_broadcast`, `manage_live_broadcast` and `view_completed_broadcast`, but the creator dashboard must not call it with hardcoded channel or broadcast values.

### Required implementation

Create or reuse one API-backed creator workspace projection that provides enough data to determine the next valid action without duplicating domain logic.

The projection must include, directly or through normalized existing responses:

- authenticated user and broadcaster capability;
- organisations available to the user;
- selected or preferred organisation;
- organisation role and allowed actions;
- channels for the selected organisation;
- selected or preferred channel;
- channel lifecycle and visibility;
- relevant current or next broadcast;
- broadcast lifecycle, schedule and contribution/delivery state where required;
- completed broadcast and real recording/replay state when relevant;
- explicit allowed actions derived from backend authority or safely interpreted existing permissions.

The projection may be composed client-side from existing API calls initially if that composition is bounded, tested and refresh-safe. Add a dedicated API read model only when it removes meaningful duplication, race conditions or excessive requests. Do not create a second store that can disagree with the existing APIs.

### Selection rules

- Preserve an explicit user selection while it remains valid.
- Otherwise prefer an active or reconnecting broadcast requiring immediate management.
- Then prefer the nearest scheduled broadcast.
- Then prefer a draft that the user can continue.
- Then use the most recently updated valid channel or organisation.
- Never silently switch context during a destructive or live-critical operation.
- When multiple organisations exist, expose an understandable workspace switcher rather than always treating `organisations[0]` as the permanent workspace.

### Required states

The creator shell and Overview must correctly represent at least:

- first registration with intent unknown;
- no organisation;
- organisation without channel;
- draft or pending-review channel;
- active channel without broadcast;
- draft broadcast;
- future scheduled broadcast;
- overdue scheduled broadcast;
- starting broadcast;
- live broadcast;
- reconnecting broadcast;
- ending broadcast;
- completed broadcast without recording;
- recording requested/processing;
- recording ready but not published;
- private replay;
- published public or unlisted replay;
- failed or archived recording;
- insufficient permission for the next management action.

### Acceptance gates

- No hardcoded `channelStatus: 'none'` or `broadcastStatus: 'none'` drives returning-user navigation.
- Refreshing any supported creator state restores the same valid next action.
- Clearing local storage does not restart completed onboarding.
- A stale selected ID is safely replaced by a valid API-backed selection.
- Organisation changes reset channel and broadcast context without displaying stale data.
- Tests cover conflicting or rapidly changing lifecycle responses.

## Workstream 2 — State-aware Overview as the next-action dashboard

### Product goal

Overview should answer three questions immediately:

1. What is happening now?
2. What should I do next?
3. Is anything blocked or recovering?

It must not be a generic collection of impressive cards that promote impossible actions.

### State-specific primary actions

Use the existing destinations and actions.

| API-backed state | Primary action | Required destination |
| --- | --- | --- |
| No organisation | Create your organisation | Existing organisation setup |
| Organisation, no channel | Create your first channel | Existing Broadcasts page with channel form open |
| Channel activation incomplete | Finish channel setup | Existing channel summary and safe activation action |
| Active channel, no broadcast | Create your first broadcast | Existing Broadcasts first-broadcast choice |
| Draft broadcast | Continue preparing broadcast | Existing Studio with exact resource preselected |
| Scheduled broadcast | Run sound check or manage schedule | Existing Broadcasts/Studio context as appropriate |
| Overdue scheduled broadcast | Start, reschedule or cancel | Existing contextual recovery surface |
| Live/reconnecting | Manage live broadcast | Existing Studio with exact live broadcast selected |
| Completed, no recording | Prepare recording when authorized | Existing Recordings workspace |
| Recording processing | View recording status | Existing Recordings workspace |
| Authorized playable replay | Open replay | Existing authorized listener replay route |

### Content rules

- The primary card contains a specific resource name whenever one exists.
- Exact date/time uses the user device locale while storing canonical server time.
- Secondary cards show only real information.
- Replace unavailable metric cards with contextual guidance, not permanent dashes repeated across the page.
- Do not show `Manage backstage` until a broadcast state can support backstage work.
- Do not show `Open broadcast studio` until a valid broadcast exists.
- Do not show recording or replay actions before a completed lifecycle and real recording state.
- Avoid repeating the shell page title inside the page unless the inner heading names a different task.

### Empty-state standard

Each empty state contains:

- one plain-language title;
- one sentence explaining why the state exists;
- one useful primary action when the user has permission;
- permission guidance instead of a disabled fake primary action when the user cannot proceed.

## Workstream 3 — Contextual navigation and preselection

### Current problem

Broadcast rows, Overview actions and role-aware listener actions may open a general Studio or Backstage selector. The user then repeats organisation, channel and broadcast selection even though the originating action already identified the intended resource.

### Required implementation

Add a typed contextual-open contract for existing operational workspaces.

At minimum it must support:

```ts
{
  organisationId?: string;
  channelId?: string;
  broadcastId?: string;
  initialTask?: 'select' | 'prepare-audio' | 'manage-live' | 'recover-delivery' | 'call-ins' | 'guests';
}
```

The exact implementation may use component props, route state or query parameters. Use a real route when durable deep-linking, refresh restoration or browser history materially benefits the task. Do not introduce an opaque global variable.

### Behaviour

- A row-level action passes that row’s broadcast ID.
- Overview passes its current resource context.
- `Manage broadcast` from a listener page resolves the owned broadcast and opens its management context.
- `Open backstage` opens the call-in/guest area for that broadcast.
- A stale, unauthorized or terminal resource is rejected safely and the user receives the nearest valid destination.
- The Studio still reloads and verifies every selected resource through the API; preselection is not authorization.
- Browser and Android Back close the operational workspace before leaving the creator route where appropriate.

### Duplicate-action cleanup

Remove generic actions that duplicate contextual row actions without a distinct purpose.

Broadcast rows should use lifecycle-specific copy:

- Draft: `Continue setup`
- Scheduled: `Run sound check` or `Manage schedule`
- Overdue: `Start or reschedule`
- Starting: `Check start progress`
- Live/reconnecting: `Manage live`
- Ending: `View ending status`
- Completed: `View recording` or `Create recording` when authorized
- Failed/cancelled: a safe recovery or details action based on actual allowed transitions

A page-level `Open Broadcast Studio` action may remain only when it has a clear, non-duplicative purpose and communicates what will be selected.

## Workstream 4 — Creator navigation and feature discoverability

### Navigation contract

Creator primary navigation should use one consistent vocabulary:

- Overview
- Broadcasts
- Backstage
- Recordings

Analytics or Stats remains hidden until trustworthy metrics, loading, empty, unauthorized and failure states are implemented.

### Recordings

`CreatorRecordingsPage` is a real API-backed workspace and must not be filtered out of all creator navigation once its authorized workflow is available.

Required behaviour:

- show Recordings to members who can view the relevant recording state;
- keep management controls role-aware;
- do not expose public replay actions for private recordings;
- display processing and failure states honestly;
- pass selected completed-broadcast context from Overview or Broadcasts where useful;
- hide or disable nothing solely to make the product look simpler when it removes the only discoverable route to a working feature.

### Analytics

- Do not display Analytics/Stats navigation merely because a placeholder route exists.
- Introduce navigation only after real measured definitions, API data, role authorization, loading, empty, partial and failure states exist.
- Never use invented charts or health scores.

### Terminology

Creator-facing terms:

- `Broadcasts` for creation and management;
- `Backstage` for call-ins, guests and on-stage participants;
- `Recordings` for recording jobs and visibility management;
- `Studio` for audio preparation and live control.

Listener-facing terms:

- `Discover`;
- `Live` or `Live now` only for verified live delivery;
- `Replays`.

Do not use `Streams` as a competing desktop concept. A narrow mobile label may use `Streams` only when space prevents `Broadcasts` and tests show that the meaning remains clear. Route names do not need to change to satisfy terminology alignment.

## Workstream 5 — Backstage information architecture

### Product goal

Backstage should feel like one operational desk for one selected broadcast, not several unrelated management panels and repeated selectors.

### Required layout

After context selection, organize existing functionality into:

1. **Call-ins** — pending, approved and rejected listener requests;
2. **Invited guests** — invitations, acceptance, waiting and admission states;
3. **On stage** — connected participants, publishing state, mute and remove actions.

The selected organisation/channel/broadcast appears once in a persistent context header or compact selector area.

### Interaction requirements

- Opening from a broadcast preselects the exact context.
- Polling or future real-time updates do not reset user selection, focus or open disclosure state.
- Partial failure remains section-specific. Participant-provider failure must not erase successfully loaded call-ins or invitations.
- Generated invitation links clearly explain that raw tokens are shown only when created and must be copied then.
- Destructive actions use explicit confirmation when accidental activation would materially disrupt a live event.
- Permission differences are stated in plain language.
- Mobile layout uses tabs, segmented sections or stacked disclosure based on tested usability; it must not create an unbounded wall of controls.

### Modal requirements

Backstage must use the same shared dialog behaviour as Studio and creator chat:

- initial focus;
- focus trap;
- Escape handling;
- Android/browser Back handling;
- background scroll lock;
- safe-area-aware full-height mobile layout;
- previous-focus restoration;
- no closure that can silently abandon a live-critical operation.

## Workstream 6 — Modal and overlay interaction standard

Create or extend shared hooks/components so Studio, Backstage, creator chat, call-in sheets and confirmation dialogs do not each implement incomplete versions of modal behaviour.

Every modal or bottom sheet must define:

- what opens it;
- initial focus target;
- title and description relationships;
- focus trap behaviour;
- Escape behaviour;
- backdrop behaviour;
- Android/browser Back behaviour;
- scroll locking;
- safe closure rules;
- focus restoration;
- nested-confirmation behaviour;
- virtual-keyboard layout;
- reduced-motion behaviour.

Do not blindly force every overlay into one visual component. Share behaviour and accessibility primitives while preserving task-appropriate layouts.

Required regression coverage:

- keyboard Tab and Shift+Tab containment;
- Escape closes only the topmost dismissible layer;
- Back closes a sheet/dialog before navigating away;
- blocked live-critical close explains the required safe action;
- focus returns to the triggering action;
- opening a second confirmation does not release focus to the page;
- body scrolling remains locked while the overlay is open;
- closing after session expiry returns to a valid authenticated or sign-in state.

## Workstream 7 — Mobile information density and responsive hierarchy

### Principle

Passing a no-horizontal-overflow assertion is necessary but not sufficient. The product must also minimize unnecessary vertical travel, keep the next action visible and avoid making each record occupy most of a phone screen.

### Global mobile rules

- Do not repeat the same page title in both shell and page content.
- Reduce mobile display-heading scale where it delays the primary task.
- Keep introductory copy concise; move deep technical explanation into contextual help or diagnostics.
- Use progressive disclosure for optional fields and technical detail.
- Keep labels visible and do not rely on placeholders as labels.
- Preserve at least 44px touch targets.
- Reserve bottom space for fixed navigation and call-in launchers.
- Use `100dvh` and safe-area insets for operational full-screen views.
- Keep the active form action reachable when the virtual keyboard is open.
- Test Android Chrome normal mode, Android desktop-site simulation and short-height landscape separately.

### Forms

Primary first-use fields stay visible. Optional fields may move behind `More options` after usability review:

- generated public slug;
- category;
- long description;
- advanced visibility explanation;
- technical recording metadata.

Do not hide a field when changing it is common or materially affects access.

Use a sticky submit/action area only when it does not cover validation messages or content and when it improves a genuinely long task.

### Lists and cards

- Clamp long descriptions in list contexts and provide a details destination.
- Allow names to wrap safely, but prevent one unbroken identifier from forcing overflow.
- Display generated URLs/slugs as compact copyable metadata.
- Avoid repeating organisation, channel and route information at full visual weight in every row.
- Keep status, title, schedule and primary action visible before secondary metadata.
- Preserve full text in accessible names, details views or expansion.

### Listener discovery

- Keep the audio-first value proposition, but reduce mobile hero height so live/upcoming content appears earlier.
- Use ordinary listener language first; move WebRTC/LL-HLS explanation to secondary copy or diagnostics.
- Keep live and scheduled sections visibly distinct.
- Retry failed discovery requests in place instead of requiring a full-page reload when safely possible.

### Studio

- Present setup as a clear task sequence rather than one extremely long undifferentiated page.
- Keep the current phase, selected broadcast and primary safe action visible.
- Collapse completed setup details when that helps a live operator, while retaining a way to inspect them.
- Do not hide warnings, no-signal state or delivery-recovery actions behind collapsed panels.
- Preserve sticky live-critical controls without covering status or confirmation content.

## Workstream 8 — Visual and interaction consistency

### Primary-action contrast defect

The bright-green primary button must never render with muted disabled-looking text. Audit all CSS layers, including coarse-pointer, responsive and manual-review overrides.

Required states for every button variant:

- enabled;
- hover where supported;
- active/pressed;
- focus-visible;
- loading;
- disabled;
- destructive;
- high-contrast/forced-colours compatibility where practical.

Use automated contrast checks and manual review in bright-screen conditions. Status must not depend on colour alone.

### Design-system consolidation

- Remove feature-local button styles when a shared variant can express the same state.
- Replace browser-dependent Unicode controls with the shared icon system.
- Keep icon-only controls labeled through `aria-label` and visible tooltips where useful.
- Define shared field, helper, error and disabled patterns.
- Keep form controls visually consistent across authentication, onboarding, Broadcasts, Studio, Backstage and Recordings.
- Do not create a large new component library merely to rename existing components.

### Motion

- Motion communicates state or hierarchy; it is not decoration for its own sake.
- Live waveform animation appears only for a truly live state.
- Loading indicators do not imply measurable percentage progress when none exists.
- Respect `prefers-reduced-motion`.
- Avoid motion that distracts a live operator from failure or recovery instructions.

## Workstream 9 — Authentication and account-language alignment

The authentication experience must support both listeners and creators.

Required copy behaviour:

- Registration does not describe every new account as a creator account before intent is known.
- Use neutral account language such as `Create your DigiStream account`.
- Explain that the account can listen and can set up a creator workspace when authorized.
- Google configuration absence remains an environment note, not a failure of email authentication.
- Password requirements, mismatched confirmation, API errors and loading remain clear.

Production-readiness follow-up:

- implement real password reset and recovery before claiming complete account management;
- add email verification only with real token, delivery and expiry handling;
- do not add dead `Forgot password` links before a functioning route exists.

## Workstream 10 — Recording and post-broadcast continuity

### Discoverability

After a completed broadcast, route the creator to existing recording capability through contextual actions instead of expecting them to know a hidden path.

### Required states

- no recording requested;
- recording requested/recording;
- uploading;
- processing;
- ready;
- failed with safe retry when supported;
- private;
- published;
- archived;
- deleted.

### Actions

- `Prepare recording` only for authorized completed broadcasts without an existing job;
- `View recording status` for active jobs;
- `Publish replay`, `Keep private`, `Archive` and restore actions only when allowed by current state;
- `Open member replay` for protected recordings;
- `Open unlisted replay` only through the exact valid route;
- `Open listener replay` for valid public replay;
- no public share action for private state;
- no replay action before the artifact is verified and authorized.

### Completion summary

Reuse existing Broadcasts and Recordings surfaces. Do not create a decorative disconnected completion dashboard.

Use real values only:

- duration from lifecycle timestamps;
- recording status from the recording API;
- peak listeners only after trustworthy audience measurement exists;
- share route only after visibility and artifact authorization permit it.

## Workstream 11 — Listener polish without weakening reliability

The listener experience is currently the strongest product area. Changes must be conservative and regression-heavy.

Preserve:

- exact lifecycle distinction;
- WebRTC-first and LL-HLS fallback;
- automatic bounded recovery;
- technical details behind disclosure;
- scheduled-event calendar and refresh actions;
- mute and mobile hardware-volume expectations;
- role-aware call-in behaviour;
- explicit route back to discovery.

Improve only where evidence supports it:

- reduce hero height and technical marketing copy on narrow screens;
- retry metadata/discovery in place;
- ensure the header navigation accurately reflects nested event state;
- maintain clear return-to-discovery action;
- keep call-in launcher reservation from covering content;
- ensure long event, organisation and channel names remain readable;
- preserve playback controls and status during chat/call-in layout changes.

Do not redesign the player merely for visual novelty.

## Workstream 12 — Routing and browser-history hardening

The current custom `window.location.pathname`, `pushState` and `popstate` approach may remain while routes are limited and well tested. Before introducing more deep links, evaluate a proper routing layer.

A routing migration is justified when it materially improves:

- nested creator/listener layouts;
- route parameters;
- selected-resource deep links;
- not-found handling;
- modal route state and Back behaviour;
- query-driven discovery filters;
- navigation focus and scroll restoration;
- refresh-safe Studio/Backstage context.

A migration must be bounded and regression-tested. It must not rewrite feature business logic or change authorization. Do not introduce a router only to replace a few stable conditionals.

## Workstream 13 — Accessibility acceptance

### Required automated checks

Add or strengthen automated coverage for:

- accessible names and role relationships;
- duplicate IDs;
- colour contrast where the selected tooling supports reliable analysis;
- keyboard-operable intent and onboarding choices;
- focus visibility;
- dialog focus containment and restoration;
- status not conveyed by colour alone;
- no inaccessible disabled-looking enabled primary action;
- no horizontal overflow at required viewports.

### Required manual checks

- keyboard-only new creator journey;
- keyboard-only listener playback and call-in flow;
- screen-reader announcement of setup steps and changing statuses;
- Android TalkBack review of bottom navigation and full-screen operational dialogs;
- 200% text zoom and browser zoom;
- reduced motion;
- bright sunlight/low-contrast screen review;
- long names, translated-length text and unbroken URLs;
- virtual keyboard open/closed;
- portrait and short-height landscape;
- physical Back button behaviour.

A component is not considered accessible solely because it contains ARIA attributes.

## Workstream 14 — Non-technical usability validation

Run observed task tests with people who did not build DigiStream.

### Creator tasks

- create an account and choose Broadcast audio;
- create a workspace and first channel;
- create a draft or schedule a broadcast;
- run a microphone check;
- understand the difference between private Studio and public delivery;
- go live and recover from a simulated delivery problem;
- end safely;
- find and prepare the recording;
- publish or keep the replay private.

### Listener tasks

- find a live broadcast;
- distinguish a scheduled event from a live event;
- start, pause and mute playback;
- understand buffering/reconnecting guidance;
- return to discovery;
- request to speak and understand pending status.

### Record

- time to first correct action;
- hesitation and backtracking;
- wrong or dead-end actions;
- terminology users misunderstand;
- whether the user can identify what is live and what is only prepared;
- whether the user can recover without coaching;
- mobile controls covered by keyboard, fixed navigation or overlays.

Critical findings must be fixed before decorative expansion.

## Dependency-ordered implementation sequence

Complete this programme through bounded pull requests after the onboarding and activation programme is fully implemented and verified.

1. **Workspace projection and state invariants**
   - replace hardcoded creator setup inputs with real API-backed state;
   - add returning-state and refresh tests;
   - do not change visuals beyond what is required to prove state correctness.

2. **State-aware Overview**
   - present one contextual next action;
   - remove dead Studio/Backstage/replay actions;
   - remove unavailable fake metric presentation.

3. **Contextual Studio and Backstage opening**
   - pass selected IDs and initial task;
   - validate stale/unauthorized context;
   - align Back and refresh behaviour.

4. **Navigation and discoverability**
   - expose Recordings when available;
   - keep Analytics hidden;
   - unify creator/listener vocabulary;
   - remove duplicated page headings.

5. **Broadcast action consolidation**
   - replace generic duplicate Studio controls with lifecycle-specific row actions;
   - keep one primary action per state.

6. **Backstage information architecture and shared modal behaviour**
   - organize Call-ins, Invited guests and On stage;
   - standardize focus, scroll lock, Back and restoration.

7. **Mobile density and progressive disclosure**
   - reduce unnecessary vertical travel;
   - compact list metadata;
   - keep long-form actions keyboard-safe;
   - preserve required information and touch sizes.

8. **Design-system contrast and interaction audit**
   - fix green primary text contrast;
   - standardize enabled, disabled, loading, focus and press states;
   - remove Unicode control inconsistencies.

9. **Authentication and post-broadcast continuity**
   - neutral account copy;
   - contextual recording/replay continuation;
   - no dead recovery links or fabricated metrics.

10. **Listener conservative polish and routing assessment**
    - in-place retry and mobile hero reduction;
    - migrate routing only if the evidence and accumulated route complexity justify it.

11. **Cross-flow accessibility and non-technical usability verification**
    - run the full automated matrix;
    - conduct manual and observed task testing;
    - fix critical findings.

12. **Obsolete-code and documentation reconciliation**
    - remove duplicated local state, CSS overrides, hidden routes and obsolete components made unnecessary by the programme;
    - update all authoritative docs with exact implemented status and remaining limitations.

Do not combine the whole programme into one giant pull request. Do not begin a later item while an earlier dependency remains contradictory unless the pull request documents the exact reason and preserves the overall order.

## Pull-request requirements

Every pull request must state:

- motivating product defect;
- affected roles and lifecycle states;
- existing components and APIs reused;
- why no duplicate surface was introduced;
- backend authority preserved;
- expected success path;
- blocked, unauthorized and failure paths;
- refresh/reconnect/session-expiry behaviour;
- desktop and mobile behaviour;
- accessibility behaviour;
- tests and manual evidence;
- documentation updated;
- known remaining limitations.

Required validation for affected work:

- Node 22 and Node 24 type checks;
- complete API tests;
- production builds;
- responsive Playwright for desktop Chromium, Android Chrome and Android desktop-site simulation;
- short-height landscape when the affected layout is operational or modal;
- browser and Android Back;
- virtual keyboard open/closed for affected forms;
- safe areas;
- reduced motion;
- long organisation, channel, broadcast and recording names;
- repeated/idempotent actions;
- stale session and CSRF recovery where applicable;
- no horizontal overflow;
- one contextual primary action;
- no fabricated data or lifecycle state.

Do not weaken an existing reliability, authorization, media, recording, replay, chat or tenant-isolation test to make a design change pass.

## Anti-rubbish review checklist

Reject the implementation when any answer below is `no`.

### Product state

- Does the screen derive its state from the API or verified browser/media evidence?
- Does the primary action succeed from the current state?
- Does refresh reconstruct the same valid task?
- Are scheduled, live, reconnecting, ending and completed states distinct?

### Reuse

- Is the implementation reusing the existing responsible component and API?
- Has it avoided a second dashboard, wizard, form, Studio, Backstage, Recordings or replay surface?
- Is new orchestration limited to selection, routing and presentation rather than copied business logic?

### Permissions

- Is the API still the authorization boundary?
- Are owner, admin, broadcaster, moderator, analyst and ordinary listener differences tested where relevant?
- Are unauthorized resources hidden through the existing private-not-found policy?

### Interaction

- Is there one clear primary action?
- Are loading, disabled, error and recovery states understandable?
- Does Back behave correctly?
- Is focus handled correctly?
- Does the virtual keyboard leave the required action reachable?

### Responsive design

- Does it work on a physical-size phone rather than merely avoiding overflow?
- Is unnecessary vertical travel reduced?
- Do long names and URLs remain usable?
- Do fixed controls reserve safe content space?

### Truthfulness

- Are counts, durations, readiness and playback claims backed by evidence?
- Are recording and replay actions real and authorized?
- Are missing capabilities honestly unavailable rather than simulated?

### Completion

- Are regression tests present?
- Are all required gates green?
- Are review threads resolved?
- Are docs aligned?
- Is the pull request bounded and accurately described?

## Documentation alignment

Every affected pull request must review and update the documents whose contracts changed, including as applicable:

- `AGENTS.md`;
- `README.md`;
- `PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`;
- `CREATOR_ONBOARDING_AND_ACTIVATION.md`;
- this document;
- `PRODUCT_SPECIFICATION.md`;
- `ROADMAP.md`;
- `CREATOR_BROADCAST_STUDIO.md`;
- listener playback, Backstage, chat, recording/replay, responsive-test and deployment documents.

Do not mark checklist items complete because a document or screenshot changed. Completion requires production code, tests and verified behaviour.

## Final product target

A new creator should experience DigiStream as one continuous product:

```text
Create account
-> choose to listen or broadcast
-> create workspace
-> create channel
-> create or schedule broadcast
-> prepare audio
-> verify listener delivery
-> go live
-> manage guests and call-ins
-> end safely
-> prepare and publish or protect replay
```

A returning creator should land on the exact next task, open operational workspaces with context already selected, and never be sent through a dead selector or hidden route.

A listener should quickly find live or upcoming audio, understand the true state, recover from ordinary network problems and participate without learning media-provider terminology.

The finished product should remain recognizably DigiStream. The success condition is not that it resembles a generic dashboard. The success condition is that every screen is truthful, connected, discoverable, accessible and efficient for a non-technical person using a real phone during a real live event.
