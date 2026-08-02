# DigiStream creator onboarding and activation flow

## Authority and purpose

This document is the authoritative product and implementation contract for first-time creator activation in DigiStream. It complements `PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`, `PRODUCT_SPECIFICATION.md`, `ROADMAP.md`, `CREATOR_BROADCAST_STUDIO.md` and the approved design system.

When an existing screen, route, call to action, test or older document conflicts with this flow, contributors must realign the existing implementation. Do not create a second onboarding application, duplicate dashboard, duplicate Broadcasts page or duplicate Studio.

The goal is to move a new creator from account creation to a usable first broadcast without exposing impossible actions, internal lifecycle jargon or hidden prerequisites.

## Product principle

The product must always present the next valid action.

A creator who has not created a channel must not be sent into Broadcast Studio and then told no channel exists. A creator who has no broadcast must not receive a primary `Open studio` action that leads to an unusable selector. The ordinary dashboard becomes the default landing experience only after the minimum creator setup is complete or the creator explicitly chooses to finish later.

DigiStream must not silently create public resources. The product opens the correct form automatically, but the creator confirms organisation, channel and broadcast details before each resource is created.

## Canonical first-time creator flow

```text
Create account
-> Create organisation
-> Create and activate first channel
-> Choose Go live now, Schedule for later, or Finish later
-> Create first broadcast when chosen
-> Prepare microphone and private Studio
-> Verify public delivery
-> Go live
-> Complete broadcast and present real replay/summary state
```

### 1. Account creation

The existing authentication experience remains the entry point. Listener routes remain available without forcing a visitor or listener to create an organisation.

For an authenticated user with broadcaster capability and no organisation, the creator workspace shows the existing organisation setup form.

### 2. Organisation setup

Reuse the existing `OrganisationSetup` component and organisation API.

After successful creation:

- update the authenticated creator workspace state;
- navigate to the existing `/creator/broadcasts` route;
- focus the first-channel setup heading;
- do not land on Overview first;
- do not open Broadcast Studio;
- do not require the creator to discover that the mobile `Live` tab contains channel creation.

The primary button copy should communicate continuation, for example `Continue to channel setup`, while the submitted operation still creates the organisation.

### 3. First channel setup

Reuse `CreatorBroadcastsPage`. When the selected organisation has no channels, its existing channel form is the onboarding step and should open automatically.

The first-channel presentation should explain the hierarchy:

```text
Organisation
  -> Channel
      -> Broadcast
```

Required fields remain channel name, generated/editable public slug and visibility. Category and description may remain optional.

For an organisation owner or administrator, the human-facing primary action is `Create and activate channel`. The implementation may preserve the existing backend lifecycle:

```text
draft -> pending_review -> active
```

Those transitions must remain server-authorized and tested, but the new owner should not need to perform three separate UI actions merely to activate their first channel. If activation fails after creation, show the real channel state and one safe retry action; never claim activation succeeded.

For a broadcaster who cannot approve channels, create the draft and explain that an owner or administrator must activate it. Do not bypass the permission matrix.

### 4. First broadcast choice

After the first channel becomes active, reuse the existing broadcast form and automatically reveal the next decision. Do not create a separate broadcast-creation page.

Present three explicit choices:

- `Go live now`
- `Schedule for later`
- `Finish later`

#### Go live now

- create a draft broadcast using the existing broadcast API;
- keep the new channel selected;
- after successful creation, open the existing Broadcast Studio with the new broadcast selected when possible;
- Studio still requires microphone preparation and delivery verification before the lifecycle may become live.

#### Schedule for later

- require a valid future local date and time;
- create the scheduled broadcast through the existing API;
- remain in the Broadcasts workspace;
- show the created broadcast, its exact local time and its real share/listener route when available;
- do not automatically open Studio.

#### Finish later

- route to the creator Overview;
- replace dead-end Studio actions with a clear `Create your first broadcast` or `Continue setup` action;
- preserve the completed organisation and channel.

## Returning creator state model

The creator shell and Overview must derive the primary action from real API-backed setup state.

| Creator state | Primary action | Destination |
| --- | --- | --- |
| No organisation | Create your organisation | Existing organisation form |
| Organisation, no channel | Create your first channel | Existing Broadcasts page with channel form open |
| Channel not active | Finish channel setup | Existing Broadcasts page and activation state |
| Active channel, no broadcast | Create your first broadcast | Existing Broadcasts page with broadcast choice visible |
| Draft or scheduled broadcast | Open Broadcast Studio / Manage broadcast | Existing Studio or Broadcasts workspace as appropriate |
| Live or reconnecting broadcast | Manage live broadcast | Existing Studio |
| Completed broadcast | View real recording or summary | Existing Replay/recording surface only when real data exists |

Do not render a prominent action that cannot succeed from the current state.

## Navigation alignment

The desktop destination remains `Broadcasts` and the route remains `/creator/broadcasts`.

The narrow-screen short label must be renamed from ambiguous `Live` to `Streams` or another approved label that clearly means creator broadcast management. `Live now` remains listener-facing language for a broadcast whose contribution and public delivery are verified.

Do not introduce a second route solely to rename the destination.

## Reuse and anti-duplication requirements

Implementation must reuse and realign:

- `OrganisationSetup` in `apps/web/src/App.tsx`;
- `CreatorBroadcastsPage` for channel and broadcast creation;
- `CreatorBroadcastStudio` for microphone, private contribution and go-live verification;
- existing organisation, channel and broadcast APIs;
- existing lifecycle and authorization services;
- shared `Button`, `StatePanel`, `StatusBadge`, shell, icon and form styles.

Prohibited approaches:

- a second onboarding dashboard;
- a duplicate `/creator/onboarding` implementation that copies organisation/channel/broadcast forms;
- a second channel-management page;
- a second broadcast-creation page;
- client-side lifecycle bypasses;
- fabricated organisation, channel, broadcast, listener or readiness data;
- automatic public resource creation without creator confirmation;
- multiple competing primary actions for the same empty state.

A lightweight route or state wrapper is acceptable only when it orchestrates the existing components rather than copying them.

## Back, refresh and recovery behaviour

- Browser and Android Back move to the previous valid onboarding step or close Studio before leaving the workspace.
- Refresh after organisation creation must restore the real next step from API data.
- A failed channel activation must preserve the created channel and expose a safe retry.
- A failed broadcast creation must preserve the organisation and channel.
- Session expiry must return to authentication without pretending the submitted resource was created.
- Repeated submissions must use existing conflict/idempotency behaviour and must not create duplicates.

## Accessibility and mobile requirements

- The next-step heading receives focus after route/state transitions when appropriate.
- The virtual keyboard must not cover the active form action.
- Fixed bottom navigation must reserve safe-area-aware content space.
- Long organisation, channel and broadcast names must wrap or truncate safely.
- The setup step and current state must not depend on colour alone.
- Primary and disabled actions follow the shared design-system contrast and interaction rules.
- The complete journey must work on Android Chrome portrait, Android desktop-site simulation, short-height landscape and desktop Chromium.

## Required implementation order

1. Add regression tests for the broken current journey.
2. Redirect successful organisation creation to the existing Broadcasts route.
3. Make no-channel state automatically expose the existing channel form.
4. Combine first-channel creation and authorized activation into one human-facing action.
5. Reveal the existing broadcast creation step immediately after first-channel activation.
6. Add explicit Go live now, Schedule for later and Finish later choices using the existing form/API.
7. Make Overview calls to action state-aware and remove dead-end Studio entry points.
8. Rename the mobile creator navigation label without changing the existing route.
9. Verify existing creators with channels and broadcasts keep their current management flow.
10. Align all relevant documentation before merge.

## Documentation alignment required before merge

The implementation pull request must review and update, where wording or completion state is affected:

- `README.md`;
- `docs/PRODUCT_SPECIFICATION.md`;
- `docs/PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`;
- `docs/ROADMAP.md`;
- `docs/CREATOR_BROADCAST_STUDIO.md`;
- the approved product design documentation;
- responsive test documentation and the pull-request summary.

Do not mark a roadmap item complete merely because copy was changed. Completion requires the real workflow and tests.

## Required automated acceptance coverage

### New creator journey

```text
Create account
-> create organisation
-> automatically reach first-channel form
-> create and activate channel
-> automatically reach first-broadcast choice
-> create draft with Go live now
-> existing Studio opens with valid prerequisites
```

Also cover `Schedule for later` and `Finish later`.

### Returning creator journey

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
- only one contextual create action is visible per empty/form state;
- no horizontal overflow across the responsive Playwright matrix;
- existing listener, backstage, chat, recording and media boundaries remain unchanged.

## Completion gate

This flow is complete only when a new creator can reach a valid first Studio or scheduled broadcast without coaching, hidden navigation knowledge, duplicate pages, fake data or an impossible primary action.
