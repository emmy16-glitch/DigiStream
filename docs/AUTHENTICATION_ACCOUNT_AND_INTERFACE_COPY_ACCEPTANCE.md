# DigiStream authentication, account access and interface copy acceptance

## Purpose and authority

This document records focused acceptance requirements discovered during mobile review of the current DigiStream creator experience. It supplements, and does not replace, the following owners:

1. `PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md` remains authoritative for product-facing truth, plain language, accessibility, mobile behaviour and recovery.
2. `PRODUCT_SPECIFICATION.md` remains authoritative for users, roles, lifecycle, security and business scope.
3. `ARCHITECTURE.md` remains authoritative for API, session, authorization and trust boundaries.
4. `ROADMAP.md` remains authoritative for implementation status and order.

Nothing in this document is an implementation claim. A requirement remains incomplete until production code, tests and repository gates prove it.

## Review finding

The creator workspace currently has authentication and sign-out behaviour, but constrained mobile presentation can make account access and sign-out difficult to discover. Text labels may disappear while several icon-only actions compete in the top bar. A user should never have to guess which small icon signs them out.

Several onboarding, empty-state and status screens also use more explanatory text than is necessary for the immediate decision. Correct information should remain, but operational screens should sound like a human product, not a generated product brief.

These findings must be handled as Programme 1 acceptance work rather than treated as decorative polish.

## Authentication entry acceptance

### Logged-out state

A logged-out visitor opening a protected creator route must receive a clear authentication screen containing:

- a visible `Sign in` heading;
- email and password fields when email authentication is supported;
- an explicit `Create account` route when registration is supported;
- a real password-recovery route only after password recovery is implemented;
- provider sign-in controls only when the provider is actually configured;
- plain-language validation, loading, offline and server-failure states;
- no access to protected creator data before authentication succeeds.

The page must not ask the user to choose an organisation role during sign-in. Roles, creator capability, memberships and workspace access come from the authoritative server account after authentication.

### Already-authenticated state

An authenticated user may be taken directly to the correct workspace or listener destination, but the interface must still provide an obvious route to the current account and sign-out action.

The product should make the following clear without forcing the user to infer it from personalised copy:

- who is signed in;
- whether the current destination is the Creator workspace or Listener application;
- where account actions are located;
- how to sign out.

### Session expiry and return

When a session expires:

- explain that the session ended and the user needs to sign in again;
- accept only a validated same-origin DigiStream return destination;
- restore the safe creator or listener route after successful authentication;
- never claim that unsaved microphone, media or local form state survived;
- reject external, protocol-relative, malformed and non-authorized return targets;
- preserve tenant and private-not-found behaviour after reauthentication.

## Account and sign-out discoverability

### Required account entry

Desktop, tablet and mobile Creator experiences must provide a discoverable `Account`, `Profile` or current-user entry.

The entry must:

- include a text label on narrow screens or expose a clearly labelled menu trigger whose accessible name is visible through ordinary interaction;
- show the current user name or email inside the account surface;
- remain reachable at 200% zoom, in Android floating-window or desktop-site layouts, and on short-height screens;
- use a minimum 44 by 44 CSS-pixel target where touch interaction applies;
- have visible keyboard focus;
- not depend on horizontal overflow, hover, a hidden icon meaning, or an unlabeled avatar;
- remain available from every protected Creator page.

A generic user icon by itself is not sufficient when the same header also contains chat, Backstage, listener and other icon-only actions.

### Account menu contents

The account surface must contain:

- the signed-in user identity;
- `Profile` or `Account settings` only when those destinations are implemented;
- a text-labelled `Sign out` action;
- no placeholder actions that do not work.

`Sign out` must remain directly understandable. Do not rename it to an ambiguous icon, `Exit`, or another term that could mean closing a panel.

### Sign-out behaviour

A successful sign-out must:

- call the authoritative logout endpoint;
- invalidate the server session rather than only clearing client state;
- remove protected creator data from the active UI;
- return to an appropriate authentication or public destination;
- prevent browser Back from restoring usable protected content;
- update other open tabs or force them to re-check the session before protected actions;
- show a recoverable failure state when the logout request cannot be completed safely;
- avoid duplicate logout requests from repeated taps.

## Human interface copy standard

### Core rule

Operational copy must help the user make the current decision. It should not read like architecture documentation, marketing copy or an AI-generated explanation.

A normal screen should usually contain:

1. one clear heading;
2. one short supporting sentence when the heading alone is not enough;
3. one primary action for the current state;
4. secondary detail only when it helps the user decide or recover.

### Copy to avoid

Avoid:

- repeating the product name in every status paragraph;
- explaining the complete workflow on every screen;
- generic phrases such as `continue into the existing setup`, `from the connected workspace`, or `DigiStream could not complete that request` when the product knows the actual failed operation;
- long introductory paragraphs above obvious forms;
- unnecessary words such as `authoritative`, `contextual`, `existing`, `connected`, `workflow`, `resource`, `lifecycle` or provider names in ordinary user copy;
- congratulatory or promotional language during failures;
- technical implementation descriptions in empty states;
- multiple sentences that repeat what the button already says;
- copy that claims readiness, connection, recording, delivery or success without verified evidence.

### Preferred copy pattern

Use direct, specific language.

Instead of:

> Create and activate your first channel, then prepare a broadcast from the connected broadcasts workspace.

Prefer:

> Create a channel to start broadcasting.

Instead of:

> Listen without creating a workspace, or continue into the existing creator setup to broadcast audio.

Prefer:

> Choose whether you want to listen or create a broadcast.

Instead of:

> DigiStream could not complete that request.

Prefer an operation-specific message when known, for example:

> Your channels could not load.

The supporting recovery action should then say `Try again`, `Sign in again`, `Choose another microphone`, `Return to broadcasts` or another concrete next action.

### Screen-by-screen copy audit

Programme 1 acceptance must review at least:

- sign in and registration;
- session-expired return;
- Creator Overview;
- organisation setup;
- first-channel setup;
- first-broadcast choices;
- Broadcasts;
- Studio microphone and delivery states;
- Backstage and call-in states;
- completed-broadcast actions;
- Recordings and Replay;
- listener discovery, scheduled, live, reconnecting, unavailable and completed states;
- account and sign-out surfaces.

Existing truthful technical details may remain in diagnostics or help text. The primary heading, status and action must remain short and natural.

## Data and analytics requirements

Authentication and account analytics may record safe product events such as:

- `login_page_viewed`;
- `login_submitted`;
- `login_succeeded`;
- `login_failed` with a safe error category;
- `session_expired`;
- `reauthentication_succeeded`;
- `account_menu_opened`;
- `logout_submitted`;
- `logout_succeeded`;
- `logout_failed` with a safe error category.

Allowed dimensions include authentication method, broad device class, route category, safe failure category and elapsed time. Never include passwords, complete email addresses in event names, session tokens, reset tokens, provider secrets or private return URLs in analytics.

Product analytics must not become the authentication security boundary. API audit and security logging remain separate from product event collection.

## Automated acceptance requirements

Add regression coverage for:

- logged-out access to protected Creator routes;
- successful email and configured provider authentication;
- invalid credentials without account enumeration;
- duplicate-submit prevention;
- session expiry and validated same-origin return;
- malformed, external and unauthorized return-target rejection;
- clear account access on desktop, phone, 200% zoom and short-height layouts;
- a visible text-labelled sign-out action in the account surface;
- keyboard opening, focus containment, Escape and browser/Android Back where the account surface is modal or sheet-based;
- successful server session invalidation;
- protected-data removal after logout;
- Back navigation after logout;
- refresh, multi-tab and stale-session behaviour;
- offline/API-failure recovery;
- concise copy snapshots or semantic assertions for the reviewed screens;
- no hidden placeholder account actions.

## Manual evidence

The following remain manual evidence and must not be claimed by automated tests alone:

- whether an ordinary user can find sign in and sign out without coaching;
- physical Android Chrome, floating-window and desktop-site behaviour;
- TalkBack or another physical screen-reader review;
- comprehension of onboarding and failure copy by a non-technical creator and listener;
- bright-environment contrast and physical touch comfort.

Critical findings from those checks must return to the implementation backlog before Programme 1 is declared fully accepted.

## Completion rule

This acceptance area is complete only when:

- authentication entry is clear;
- account access and sign out are discoverable on every supported viewport;
- logout invalidates the real session and protected state does not return through Back;
- session expiry returns safely after reauthentication;
- operational screen copy is concise, specific and human;
- all automatable requirements pass repository gates;
- remaining physical/manual evidence is reported separately and truthfully.
