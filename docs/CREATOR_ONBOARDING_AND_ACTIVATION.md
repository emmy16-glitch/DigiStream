# DigiStream creator onboarding and activation flow

## Authority and purpose

This document is the authoritative product and implementation contract for first-time activation, creator setup, Studio entry and the first completed-broadcast outcome in DigiStream. It complements `PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`, `PRODUCT_SPECIFICATION.md`, `ROADMAP.md`, `CREATOR_BROADCAST_STUDIO.md` and the approved design system.

When an existing screen, route, call to action, test or older document conflicts with this flow, contributors must realign the existing implementation. Do not create a second onboarding application, duplicate dashboard, duplicate Broadcasts page, duplicate channel manager, duplicate broadcast creator, duplicate Studio or duplicate replay surface.

The goal is to move a person to the correct listener or creator experience and move a new creator from account creation to a usable first broadcast without exposing impossible actions, internal lifecycle jargon or hidden prerequisites.

## Product principles

The product must always present the next valid action.

A listener must never be forced to create an organisation. A creator who has not created a channel must not be sent into Broadcast Studio and then told no channel exists. A creator who has no broadcast must not receive a primary `Open studio` action that leads to an unusable selector. The ordinary dashboard becomes the default landing experience only after the minimum creator setup is complete or the creator explicitly chooses to finish later.

DigiStream must not silently create public resources. The product opens the correct existing form automatically, but the creator confirms organisation, channel and broadcast details before each resource is created.

Every summary, readiness check, listener count, duration and recording status must come from real API-backed evidence. Omit or clearly mark unavailable data rather than fabricating it.

## Canonical end-to-end journey

```text
Create account
-> Choose Broadcast audio or Listen to broadcasts
-> Creator: create organisation (Step 1 of 3)
-> Create and activate first channel (Step 2 of 3)
-> Choose Go live now, Schedule for later, or Finish later (Step 3 of 3)
-> Create first broadcast when chosen
-> Prepare microphone and private Studio
-> Verify contribution and public listener delivery
-> Go live
-> End broadcast
-> Present truthful completion, recording and next-action state
```

## Step 1 — Account creation and intent

Reuse the existing authentication experience. After a successful first registration, ask:

```text
What would you like to do?

Broadcast audio
Listen to broadcasts
```

### Listen to broadcasts

- navigate to the existing listener discovery application;
- do not create an organisation, channel or broadcaster resource;
- do not show creator setup as a mandatory blocker;
- provide a later, explicit `Start broadcasting` entry point if the person changes intent;
- any required broadcaster capability remains API-authorized and must not be granted only by hiding or showing a button.

### Broadcast audio

- continue into the creator setup wizard;
- use the existing broadcaster capability and authorization model;
- in development, automatic broadcaster capability may remain as already defined by product policy;
- do not duplicate authentication or create a separate creator account type.

Returning authenticated users skip this first-use intent question when their actual API-backed state already determines the correct destination.

## Step 2 — Create organisation (setup Step 1 of 3)

Reuse the existing `OrganisationSetup` component and organisation API.

Present:

```text
Set up your creator workspace
Step 1 of 3
```

Fields:

- Organisation name
- Public slug, generated from the name and editable
- Logo, optional only after a real storage-backed organisation-branding API exists

Do not implement a fake local-only logo upload or store an image in browser state merely to make the form look complete. Until real organisation artwork storage exists, omit the logo control and retain it as an explicit follow-up requirement.

The primary button should read:

```text
Continue to channel setup
```

The submitted operation still creates the organisation through the existing API.

After successful creation:

- update authenticated creator workspace state;
- navigate to the existing `/creator/broadcasts` route;
- focus the first-channel setup heading;
- do not land on Overview first;
- do not open Broadcast Studio;
- do not require the creator to discover that a mobile navigation tab contains channel creation.

## Step 3 — Create first channel (setup Step 2 of 3)

Reuse `CreatorBroadcastsPage`. When the selected organisation has no channels, its existing channel form is the onboarding step and must open automatically.

Present:

```text
Create your first channel
Step 2 of 3
```

Explain the hierarchy:

```text
Organisation
  -> Channel
      -> Broadcast
```

Fields:

- Channel name
- Public slug, generated automatically and editable
- Category, optional
- Visibility: public, unlisted or private
- Description, optional

Example:

```text
Organisation: Layers of truth
Channel name: Sunday Services
Public URL: /layers-of-truth/sunday-services
Visibility: Public
```

### Owner or administrator

The human-facing primary action is:

```text
Create and activate channel
```

The implementation may preserve the existing backend lifecycle:

```text
draft -> pending_review -> active
```

Those transitions remain server-authorized, durable and tested. The new owner should not need to understand or manually operate internal states such as `draft` and `pending_review` merely to use the first channel.

If creation succeeds but activation fails:

- preserve the real created channel;
- show its actual state;
- provide one safe `Try activation again` action;
- never claim activation succeeded;
- never create another channel as a retry side effect.

### Broadcaster without approval permission

Create the draft through the existing API and explain that an owner or administrator must activate it. Do not bypass the permission matrix or simulate activation in the client.

## Step 4 — Create the first broadcast (setup Step 3 of 3)

After the first channel becomes active, reuse the existing broadcast creation implementation and reveal the next decision automatically. Do not create a separate broadcast-creation page or duplicate form.

Present:

```text
How would you like to start?
Step 3 of 3
```

The created organisation and channel are already selected.

### Go live now

Show or collect:

- Broadcast title
- Description, optional
- Visibility inherited from the selected channel and explained to the creator

Behaviour:

- create a draft broadcast through the existing broadcast API;
- keep the new channel and broadcast selected;
- after successful creation, open the existing Broadcast Studio;
- Studio still requires microphone preparation, private contribution and public-delivery verification before the lifecycle may become live.

### Schedule for later

Show or collect:

- Broadcast title
- Future local date
- Future local time
- Description, optional
- Visibility inherited from the selected channel

Behaviour:

- create the scheduled broadcast through the existing API;
- remain in the Broadcasts workspace;
- show exact local date and time;
- show the real shareable listener link when the route is valid and authorized;
- do not automatically open Studio;
- never infer `live` from the scheduled time.

### Finish later

Use a visually secondary action:

```text
I’ll create a broadcast later
```

Behaviour:

- route to creator Overview;
- preserve the organisation and active channel;
- make `Create your first broadcast` or `Continue setup` the primary action;
- do not promote `Open studio`, `Manage backstage` or another action that cannot yet succeed.

## Step 5 — Studio preparation and go-live verification

Only open the existing `CreatorBroadcastStudio` after a real broadcast exists.

Reuse the existing microphone permission, input selection, signal meter, private LiveKit contribution and delivery orchestration. Do not create a simplified second Studio.

Present one understandable readiness checklist based on real state:

```text
✓ Organisation selected
✓ Channel active
✓ Broadcast created
✓ Microphone permission granted
✓ Audio level checked
✓ Application server connected
○ Listener delivery ready
```

Checklist rules:

- completed items require actual API or browser evidence;
- `Application server connected` means the required API/session checks succeeded, not merely that the web page rendered;
- a moving microphone meter does not complete `Listener delivery ready`;
- private Studio connection does not complete `Listener delivery ready`;
- listener delivery becomes ready only after contribution and the public delivery path are independently verified;
- failed items show plain-language recovery and safe diagnostics without exposing secrets.

The primary Studio sequence is:

```text
Join private studio
-> publish and verify microphone contribution
-> start/check public delivery
-> Go live only after listener delivery is ready
```

The existing measured microphone states, no-signal detection, input selection, audio-level assessment and delivery-recovery behaviour remain authoritative.

## Step 6 — End of broadcast and next action

When the creator ends a broadcast, wait for the real lifecycle to become completed before presenting:

```text
Broadcast complete
```

The completion surface should reuse the existing Broadcasts, recording/replay and summary capabilities rather than create a disconnected completion page.

Show real values when available:

- Duration, derived from actual live-start and completion timestamps
- Peak listeners, only after a trustworthy measured audience metric exists
- Recording status, from the real recording lifecycle
- `Open replay`, only when an authorized playable recording exists
- `Share replay`, only when a valid public or unlisted replay route exists
- `Create another broadcast`, using the existing broadcast creation flow with the channel retained

Truthful fallbacks:

- if peak-listener measurement is not implemented, omit it or say `Audience summary unavailable`; never show `0` as invented evidence;
- if recording has not been requested, say so and show the authorized recording action when available;
- if recording is processing, show its real processing state;
- if recording failed, show its real failure and authorized retry path;
- if the recording is private, do not generate or promote a public share link;
- if no replay exists, do not show a dead `Open replay` action.

Completion does not require every future analytics feature to be built in the first onboarding pull request. Missing foundations must be recorded as bounded follow-up work and implemented before the corresponding metric or action is presented as available.

## Returning creator state model

The creator shell and Overview derive the primary action from real API-backed setup state.

| Creator state | Primary action | Destination |
| --- | --- | --- |
| First registration, intent unknown | Broadcast audio / Listen to broadcasts | Existing creator setup or listener discovery |
| No organisation | Create your organisation | Existing organisation form |
| Organisation, no channel | Create your first channel | Existing Broadcasts page with channel form open |
| Channel not active | Finish channel setup | Existing Broadcasts page and activation state |
| Active channel, no broadcast | Create your first broadcast | Existing Broadcasts page with first-broadcast choices visible |
| Draft broadcast | Prepare broadcast | Existing Studio with valid selection |
| Scheduled broadcast | Manage scheduled broadcast | Existing Broadcasts workspace or Studio when preparation is appropriate |
| Live or reconnecting broadcast | Manage live broadcast | Existing Studio |
| Completed broadcast without recording | View summary / Request recording when authorized | Existing Broadcasts or recording surface |
| Completed broadcast with real recording | Open replay or recording summary | Existing authorized replay/recording surface |

Do not render a prominent action that cannot succeed from the current state.

## Navigation alignment

The desktop destination remains `Broadcasts` and the route remains `/creator/broadcasts`.

The narrow-screen short label must be renamed from ambiguous `Live` to `Streams` or another approved label that clearly means creator broadcast management. `Live now` remains listener-facing language for a broadcast whose contribution and public delivery are verified.

Do not introduce a second route solely to rename the destination.

## Reuse and anti-duplication requirements

Implementation must reuse and realign:

- the existing authentication experience and listener discovery;
- `OrganisationSetup` in `apps/web/src/App.tsx`;
- `CreatorBroadcastsPage` for channel and broadcast creation;
- `CreatorBroadcastStudio` for microphone, private contribution and go-live verification;
- existing Broadcasts, recording and replay surfaces for completion;
- existing organisation, channel, broadcast, lifecycle, delivery and recording APIs;
- existing authorization services and private-not-found policy;
- shared `Button`, `StatePanel`, `StatusBadge`, shell, icon and form styles.

Prohibited approaches:

- a second creator dashboard;
- a copied onboarding application;
- a duplicate `/creator/onboarding` implementation that copies forms or business logic;
- a second channel-management page;
- a second broadcast-creation page;
- a second Studio;
- a disconnected fake completion or analytics page;
- client-side lifecycle bypasses;
- fabricated organisation, channel, broadcast, listener, metric, recording or readiness data;
- automatic public resource creation without creator confirmation;
- multiple competing primary actions for the same state.

A lightweight route or state orchestrator is acceptable only when it coordinates the existing components rather than copying them.

## Back, refresh and recovery behaviour

- Browser and Android Back move to the previous valid onboarding step or close Studio before leaving the workspace.
- Refresh restores the real next step from API data rather than fragile client-only wizard state.
- A failed channel activation preserves the created channel and exposes a safe retry.
- A failed broadcast creation preserves the organisation and channel.
- A failed Studio or delivery action preserves already healthy prerequisites where safe.
- Session expiry returns to authentication without pretending a submitted resource was created.
- Repeated submissions use existing conflict/idempotency behaviour and do not create duplicates.
- Returning users do not repeat completed setup merely because local browser state was cleared.

## Accessibility and mobile requirements

- The current setup step and total step count are announced accessibly.
- The next-step heading receives focus after route/state transitions when appropriate.
- The intent choices and Go live/Schedule choices are keyboard and screen-reader operable.
- The virtual keyboard does not cover the active form action.
- Fixed bottom navigation reserves safe-area-aware content space.
- Long organisation, channel and broadcast names wrap or truncate safely.
- Setup and readiness states do not depend on colour alone.
- Primary and disabled actions follow shared design-system contrast and interaction rules.
- The complete journey works on Android Chrome portrait, Android desktop-site simulation, short-height landscape and desktop Chromium.

## Required implementation sequence

Implement this as bounded, reviewable pull requests without losing the end-to-end contract:

1. Add regression tests for the broken current journey.
2. Add the first-registration `Broadcast audio` / `Listen to broadcasts` intent step by orchestrating existing destinations.
3. Present organisation setup as Step 1 of 3 and redirect successful creation to the existing Broadcasts route.
4. Make no-channel state automatically expose the existing Step 2 channel form.
5. Combine first-channel creation and authorized activation into one human-facing action.
6. Reveal Step 3 immediately after first-channel activation.
7. Add explicit Go live now, Schedule for later and Finish later choices using the existing form/API.
8. Make Overview calls to action state-aware and remove dead-end Studio entry points.
9. Add the Studio readiness checklist from real existing state and keep go-live authorization unchanged.
10. Align completed-broadcast presentation with real duration, recording and replay state; record missing measured audience summary as a bounded follow-up rather than inventing it.
11. Rename the mobile creator navigation label without changing the existing route.
12. Verify existing creators with channels, broadcasts and recordings keep their current management flow.
13. Align all relevant documentation before each affected merge.

Do not place the entire journey into one unsafe giant pull request when multiple independently testable slices are required. Do not move to unrelated decorative work while a required journey slice is incomplete without documenting the exact dependency.

## Documentation alignment required before merge

Every affected implementation pull request must review and update, where wording, ordering or completion state is affected:

- `README.md`;
- `docs/PRODUCT_SPECIFICATION.md`;
- `docs/PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`;
- `docs/ROADMAP.md`;
- `docs/CREATOR_BROADCAST_STUDIO.md`;
- recording/replay and analytics documentation when Step 6 is affected;
- approved product design documentation;
- responsive test documentation and the pull-request summary.

Do not mark a roadmap item complete merely because copy was changed. Completion requires real workflow and tests.

## Required automated acceptance coverage

### Listener choice

```text
Create account
-> choose Listen to broadcasts
-> reach existing listener discovery
-> no organisation is created
```

Also verify a listener can later enter the authorized creator path without a duplicate account.

### New creator journey

```text
Create account
-> choose Broadcast audio
-> create organisation
-> automatically reach first-channel form
-> create and activate channel
-> automatically reach first-broadcast choice
-> create draft with Go live now
-> existing Studio opens with valid prerequisites
```

Also cover Schedule for later and Finish later.

### Studio readiness

- no Studio entry without a real broadcast;
- checklist items reflect real state;
- microphone readiness does not imply listener delivery;
- `Go live` remains blocked until server-authorized lifecycle and public-delivery prerequisites succeed;
- delivery failure preserves healthy private contribution where safe.

### Completion

- completion appears only after real completed lifecycle state;
- duration is calculated from real timestamps;
- recording status matches the API;
- replay actions appear only for authorized playable artifacts;
- public sharing is absent for private recording state;
- unavailable audience metrics are not fabricated;
- `Create another broadcast` reuses the existing selected-channel flow.

### Returning creator journey

- first-use intent unknown;
- no organisation;
- organisation without channels;
- draft/pending channel;
- active channel without broadcasts;
- active channel with draft broadcast;
- scheduled broadcast;
- live/reconnecting broadcast;
- completed broadcast with and without a real recording.

### Safety and regression

- owner/admin activation succeeds only through authorized API transitions;
- broadcaster cannot self-approve when policy forbids it;
- cross-tenant access remains private not-found;
- refresh and browser Back preserve a valid state;
- only one contextual primary action is visible per state;
- repeated submissions do not duplicate resources;
- no horizontal overflow across the responsive Playwright matrix;
- existing listener, backstage, chat, recording and media boundaries remain unchanged.

## Completion gate

The activation journey is complete only when:

- a listener can reach discovery without creator setup;
- a new creator can reach a valid first Studio or scheduled broadcast without coaching or hidden navigation knowledge;
- Studio presents truthful readiness and cannot go live from missing prerequisites;
- ending the first broadcast leads to a truthful completion and recording/replay state;
- no duplicate pages, fake data or impossible primary actions were introduced.
