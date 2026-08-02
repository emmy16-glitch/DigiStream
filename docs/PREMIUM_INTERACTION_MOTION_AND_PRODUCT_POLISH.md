# DigiStream premium interaction, motion and product-polish system

## Authority, timing and purpose

This document is the authoritative implementation contract for the interaction design, microinteractions, motion design, tactile feedback, loading behavior, transition choreography and final product-polish programme for DigiStream.

It begins only after both of the following programmes are implemented, merged, verified and reconciled with their documentation:

1. [`CREATOR_ONBOARDING_AND_ACTIVATION.md`](CREATOR_ONBOARDING_AND_ACTIVATION.md)
2. [`PRODUCT_DESIGN_AND_FLOW_HARDENING.md`](PRODUCT_DESIGN_AND_FLOW_HARDENING.md)

The earlier programmes establish the correct product journey, real API-backed state, contextual navigation, mobile information architecture, discoverability, accessibility foundations and truthful lifecycle behavior. This programme then makes those correct flows feel immediate, tactile, coherent and refined.

Do not use this document to decorate an unfinished or contradictory workflow. Motion cannot hide missing functionality, duplicate navigation, dead actions, fake state, weak authorization, incorrect lifecycle behavior or inaccessible interaction. Correctness and reliability remain more important than animation.

This programme is not a request to make DigiStream resemble a gaming interface, a generic glass dashboard or a collection of visual effects. It defines a restrained, premium interaction language appropriate for a real audio-broadcasting product used on desktop and low-to-mid-range Android devices.

## Product objective

Every DigiStream interaction should feel:

- immediate when the user touches, clicks or presses a control;
- tactile without pretending the screen is a physical object;
- calm during setup and account tasks;
- focused and trustworthy during a live broadcast;
- immersive but unobtrusive while listening;
- reassuring during loading, recovery and failure;
- consistent across mouse, keyboard, touch and assistive technology;
- efficient on constrained devices and networks;
- recognizable as DigiStream rather than copied from another product.

The product must not merely look polished in a static screenshot. It must remain polished while loading, validating, reconnecting, failing, recovering, navigating backward, using the virtual keyboard, switching devices, using reduced motion and running on a real phone.

## Relationship to existing design and product contracts

This document complements rather than replaces:

- the shared design tokens and component system;
- product-quality and reliability requirements;
- creator onboarding and activation;
- product-design and flow hardening;
- Studio, listener, Backstage, chat, recording and replay contracts;
- accessibility and responsive requirements;
- API authorization and lifecycle rules.

The existing responsible surface continues to own each task:

- authentication owns sign-in and account creation;
- `OrganisationSetup` owns workspace creation;
- `CreatorBroadcastsPage` owns channels and broadcasts;
- `CreatorBroadcastStudio` owns microphone, contribution, delivery and live control;
- `CreatorBackstageWorkspace` owns call-ins, invitations and participants;
- `CreatorRecordingsPage` owns recording and replay management;
- listener discovery, live playback and replay remain their existing surfaces.

This programme adds shared interaction behavior and journey choreography around those surfaces. It must not copy their forms, state machines, API calls or business rules into a parallel “premium” implementation.

## Meaning of premium quality

Premium quality means deliberate consistency, not maximum visual effect.

A premium interaction:

- responds immediately;
- communicates the control state clearly;
- preserves spatial and task context;
- avoids layout jumps;
- uses motion to explain what changed;
- gives errors a safe recovery path;
- feels equally intentional with keyboard and touch;
- remains fast on real hardware;
- stops or simplifies motion for users who request reduced motion;
- never claims that something succeeded before real evidence exists.

A product is not premium merely because it uses blur, gradients, glow, spring animation or large illustrations. Those techniques may be used only when they strengthen hierarchy, state or continuity and do not harm readability, performance or accessibility.

## Core interaction principles

### Immediate acknowledgement

Every user action receives an immediate local response, normally within the same animation frame or the next one.

Examples:

- a button enters its pressed state before the network request finishes;
- a toggle begins a safe local transition only when optimistic behavior is reversible;
- a submitted form keeps the button stable and shows progress inside it;
- a selected card gains focus/selection treatment immediately;
- a bottom sheet follows the user’s drag rather than waiting until release.

Immediate acknowledgement does not mean immediate success. The UI distinguishes:

1. input received;
2. operation in progress;
3. operation verified;
4. operation failed or requires recovery.

### Truthful completion

A success animation appears only after the relevant operation is confirmed.

- Channel activation success requires the real authorized lifecycle transition.
- `Listener delivery ready` requires verified public delivery.
- `Live` requires the real live lifecycle and delivery state.
- Recording success requires the real recording state.
- Replay availability requires an authorized playable artifact.
- Copy-to-clipboard success requires the browser operation to succeed.

Never use a green checkmark merely because a request was submitted.

### Spatial continuity

Transitions should help the user understand where content came from and where it went.

- Opening Studio from a broadcast should preserve that broadcast context.
- Expanding a card should feel connected to the selected card rather than teleporting to an unrelated blank state.
- Opening mobile chat or call-in should preserve the listener’s playback position and return point.
- Browser and Android Back should reverse the current layer before leaving the underlying route.
- Shared shell and navigation elements should remain stable during ordinary route changes.

Spatial continuity must not create fragile animation dependencies. The destination must remain correct if motion is disabled, interrupted or skipped.

### Hierarchy before spectacle

Motion supports existing visual hierarchy.

- Primary actions receive stronger but still restrained feedback.
- Secondary actions receive lighter feedback.
- Destructive actions use deliberate confirmation and clear consequence, not playful movement.
- Live-critical warnings attract attention without persistent flashing.
- Background status changes should not steal focus from the operator.

### Calm by default, energy when meaningful

DigiStream should be calm during authentication, setup, scheduling, browsing and recording management.

Higher energy is reserved for meaningful moments:

- microphone signal becoming healthy;
- public delivery becoming ready;
- a broadcast becoming genuinely live;
- a listener recovering from a connection interruption;
- a recording becoming playable.

Even these moments remain controlled. No confetti, fireworks, excessive particle effects or celebratory screens are appropriate for starting a serious live broadcast.

### Input-modality parity

Every interaction must work with:

- mouse;
- keyboard;
- touch;
- Android Back;
- screen reader and accessibility services.

Hover may enhance discoverability but cannot be the only way to reveal a required action. Touch users must receive a pressed response. Keyboard users must receive visible focus and predictable focus movement.

### Reduced motion is a complete mode

`prefers-reduced-motion: reduce` is not satisfied by shortening one transition.

Reduced-motion behavior must:

- remove large spatial movement;
- remove parallax, continuous decorative motion and scale pulses;
- replace morphing or sliding with simple opacity/state changes when appropriate;
- keep loading and live state understandable without animation;
- preserve focus and route behavior;
- avoid auto-playing waveform decoration unrelated to real audio evidence.

## Motion architecture and token system

Motion must be tokenized in the shared design system rather than implemented as arbitrary feature-local durations.

### Duration tokens

Use semantic tokens, with the exact implementation values validated on physical devices.

Suggested starting ranges:

| Token | Intended use | Starting range |
| --- | --- | --- |
| `motion-instant` | pressed acknowledgement, tiny colour/state response | 80–120 ms |
| `motion-control` | button, toggle, checkbox, focus and small icon transition | 140–180 ms |
| `motion-surface` | card, menu, tooltip, disclosure | 160–220 ms |
| `motion-overlay` | dialog, popover, bottom sheet settle | 220–320 ms |
| `motion-workspace` | major contextual workspace entry/exit | 260–400 ms |
| `motion-status` | meaningful state confirmation | 180–300 ms |

These are budgets, not targets that every animation must consume. Use the shortest duration that remains understandable.

### Easing tokens

Define shared semantic easing rather than scattering cubic-bezier values.

Required concepts:

- `ease-standard`: ordinary in-place state change;
- `ease-enter`: surface entering and settling;
- `ease-exit`: surface leaving quickly without lingering;
- `ease-emphasized`: meaningful transition such as Studio mode change;
- `spring-sheet`: directly manipulated bottom-sheet release;
- `ease-linear`: only for genuinely continuous indicators such as indeterminate progress rotation.

Avoid bouncy spring behavior for authentication, error messages, destructive confirmation and live-critical state.

### Distance and scale tokens

Keep movement restrained.

- Tiny icon movement: normally 1–3 px.
- Small surface entry: normally 4–12 px.
- Press compression: normally scale 0.98–0.995 depending on control size.
- Hover elevation: slight shadow/border change, not dramatic card enlargement.
- Full-screen workspace transitions: use modest directional movement only when it explains navigation.

Do not scale text independently from its control. Avoid large zoom transitions that can cause motion discomfort or raster blur.

### Stagger rules

Stagger may be used for a small related group entering together, such as a short first-use choice set.

Rules:

- maximum useful delay between related items should remain small;
- do not stagger long tables, broadcast lists or live status updates;
- do not delay access to the primary action while decorative items enter;
- disable or collapse staggering under reduced motion;
- dynamic data refresh must not replay an entrance animation for the entire list.

## Interaction-state model

Every interactive component must define at least:

- default;
- hover where supported;
- focus-visible;
- pressed/active;
- loading/in progress;
- disabled;
- success where appropriate;
- error where appropriate;
- reduced-motion behavior;
- coarse-pointer/touch behavior;
- high-contrast/forced-colours behavior where practical.

No component is complete if only the default and hover state are designed.

## Buttons

### Visual behavior

Enabled buttons should respond with a restrained combination of:

- surface or border emphasis;
- slight elevation on hover;
- immediate compression on press;
- clear focus-visible ring;
- stable width during loading and success confirmation.

The primary green button must always use clearly readable foreground contrast. An enabled primary action must never look disabled because responsive CSS changed the text to a muted colour.

### Press behavior

- Press response begins immediately on pointer/touch down.
- Releasing outside the target cancels the action and restores the state.
- The button must not remain visually pressed during a long network operation.
- The transition from pressed to loading should be continuous and layout-stable.
- Double submission must be blocked through UI state and existing idempotency/conflict handling.

### Loading behavior

- Keep the original button width.
- Preserve enough label context, for example `Creating channel…`, `Starting delivery…`, or `Ending broadcast…`.
- Use an inline activity indicator rather than replacing the entire page.
- Do not show percentage unless progress is measured.
- Do not disable unrelated safe navigation unless the operation requires it.

### Success behavior

A brief in-place confirmation may appear for operations such as:

- link copied;
- invitation created;
- schedule saved;
- recording visibility updated.

The success state should return to a stable useful label or transition to the next valid screen. Do not leave a permanent checkmark that hides the next action.

### Destructive and live-critical buttons

Actions such as `End broadcast`, remove participant, archive recording or delete content require deliberate treatment.

- Use consequence-specific wording.
- Use confirmation when accidental activation would cause meaningful harm.
- Do not use playful bounce, shake or celebratory animation.
- Keep the cancel/safe action obvious.
- During the real operation, preserve status and prevent duplicate submission.
- If the operation fails, restore a clear retry state without pretending the action completed.

## Icon buttons

- Use the shared icon system, not browser-dependent Unicode symbols.
- Keep hit targets at least 44 × 44 CSS pixels where practical on touch surfaces.
- Hover may reveal a tooltip after a short delay.
- Focus must reveal the same accessible name immediately.
- Press feedback should affect the button surface, not only the icon colour.
- Icons may rotate or morph only when the relationship is obvious, such as chevron expansion or play/pause.
- Never animate an icon continuously merely to make the toolbar look active.

## Toggles, checkboxes and segmented controls

### Toggle behavior

A high-quality toggle changes thumb position, track state and semantic label coherently.

- The transition is short and natural.
- Focus-visible remains clear around the whole control.
- The label communicates the state independently of colour.
- Touching the label activates the same control.
- Disabled state is visibly distinct and explains why when needed.

### Server-backed toggles

For actions such as publishing a replay, enabling chat or changing visibility:

- use optimistic updates only when rollback is safe and understandable;
- otherwise hold the control in a pending state until the API confirms;
- prevent repeated changes while the current transition is unresolved;
- on failure, return to the actual state and show a nearby recovery message;
- do not silently change a public/private state;
- require confirmation where the consequence is significant.

### Segmented controls

- The selection indicator may slide between adjacent options.
- Text and focus state must remain readable during movement.
- Keyboard arrow behavior should follow the correct control pattern.
- On narrow screens, do not create horizontally clipped segments; use wrapping, scroll with clear affordance, or a different control.

## Form fields and validation

### Focus behavior

- Border, label and helper treatment should transition together.
- Focus must not depend on placeholder disappearance.
- Labels remain visible.
- The active field should scroll into a keyboard-safe viewport on mobile.
- Focus animation must remain restrained and fast.

### Validation behavior

- Validate at the appropriate time: immediate for formatting where helpful, on blur for ordinary fields, and on submit for server authority.
- Error text appears near the affected field.
- Reserve or manage space to reduce violent layout shifts.
- Do not shake the entire form for routine validation errors.
- Move focus to the first invalid field after submit when appropriate.
- Announce errors accessibly.

### Password controls

- Password visibility uses a proper labeled icon button.
- Switching visibility must preserve cursor position and input value.
- Password requirements update calmly without flickering.
- Confirmation mismatch is explained inline.

### Slug and URL fields

- Generated slugs may animate their update subtly only while automatic generation is active.
- Once the user edits the slug, do not continue overwriting it.
- Copy actions provide brief verified confirmation.
- Long URLs remain compact and accessible without causing overflow.

## Cards and list rows

### Clickable cards

Desktop behavior may include:

- subtle border emphasis;
- slight elevation;
- pointer cursor;
- clearly revealed secondary action affordance;
- equivalent keyboard focus state.

Mobile behavior includes:

- immediate touch-down state;
- no hover-only required actions;
- clear distinction between opening the card and pressing a nested action;
- safe tap targets without accidental activation.

### Layout stability

- Secondary actions appearing on hover must not shift title or metadata.
- Async status refresh must not reorder a list unexpectedly while the user interacts unless the product meaning requires it.
- Newly added content may enter near its insertion point, but the whole list must not replay.
- Long descriptions should be clamped in lists with a clear details route.

### Selected and live rows

- Selected context may use a persistent accent border/background.
- Truly live rows may use a restrained live indicator.
- Scheduled rows must not pulse or use live animation.
- Reconnecting should differ from live and offline without aggressive flashing.

## Navigation and route transitions

### Stable shell

The creator or listener shell should remain stable across ordinary destination changes.

- Navigation selection updates immediately.
- Main content may use a restrained opacity/position transition.
- Avoid blank flashes and full-app remounts.
- Preserve or intentionally restore scroll based on route meaning.
- Move focus to a meaningful page heading after a full destination change.

### Mobile bottom navigation

- Touch response begins immediately.
- The selected indicator changes clearly.
- Do not animate every icon independently.
- Preserve safe-area spacing.
- Do not allow a floating launcher to cover the selected destination or content.
- Re-tapping the current destination may scroll to top only when that behavior is intentional and tested.

### Contextual workspace entry

Studio, Backstage and other operational workspaces should enter from contextual actions without forcing resource reselection.

- The selected broadcast identity is visible early.
- The transition may emphasize moving into a focused operational mode.
- Background creator navigation becomes visually quieter.
- Closing returns to the originating route and useful scroll/focus position.
- If the originating resource no longer exists or is unauthorized, return safely to the nearest valid management state.

## Menus, popovers, tooltips and disclosures

- Menus open near their trigger and preserve trigger relationship.
- Initial focus follows the correct pattern.
- Exit should be slightly faster than entry.
- Tooltips do not contain required actions or important instructions.
- Disclosure chevrons may rotate while the content expands/collapses.
- Height animation must not cause major performance problems; use measured approaches or simple content reveal.
- Dynamic technical diagnostics should not repeatedly animate when values update.
- Closing restores focus to the trigger.

## Dialogs and bottom sheets

Use the shared overlay behavior defined by the product-flow hardening programme.

### Dialog entry and exit

- Desktop dialogs may combine slight scale and opacity.
- Mobile full-screen dialogs should avoid unnecessary scale; use restrained vertical or opacity movement.
- Exit is shorter and does not delay the user.
- Reduced-motion mode uses minimal opacity/state change.

### Bottom-sheet gestures

For safe dismissible sheets:

- the sheet follows the finger during drag;
- backdrop response remains proportional and restrained;
- release velocity and position determine settle/dismiss;
- the sheet snaps to valid positions rather than stopping arbitrarily;
- scrolling content and dragging the sheet do not fight each other;
- Android Back closes the topmost sheet before route navigation.

For live-critical or unsaved work:

- swipe dismissal may be blocked or require confirmation;
- the interface explains the safe exit path;
- dragging must not accidentally end or abandon a broadcast.

### Accessibility

- focus trap;
- initial focus;
- title/description relationships;
- Escape handling;
- focus restoration;
- body scroll lock;
- virtual keyboard handling;
- no focus loss during nested confirmation.

## Toasts, banners and inline feedback

### Toast use

Use toasts for brief, non-blocking confirmation such as:

- copied link;
- preference saved;
- invitation link created.

Do not use a toast as the only explanation for:

- authentication failure;
- channel activation failure;
- Studio delivery failure;
- recording processing failure;
- permission denial;
- destructive-action failure.

Those states require persistent contextual feedback.

### Motion

- Toast enters from a consistent location.
- It must not cover bottom navigation, call-in launcher, Studio action bar or virtual keyboard.
- Exit does not remove information before screen-reader users can access it.
- Multiple toasts should queue or consolidate rather than stack uncontrollably.

### Banners

Persistent recovery or degraded-service banners should update in place. Do not repeatedly slide them in on every poll.

## Loading, progress and perceived performance

A premium product uses the correct loading pattern for the task.

### Skeletons

Use skeletons when:

- the content structure is known;
- the expected wait is long enough that preserving layout helps;
- the skeleton accurately resembles the final structure.

Rules:

- do not skeleton every icon and tiny label;
- avoid shimmering large portions continuously on low-end devices;
- use reduced or static placeholders under reduced motion;
- replace sections progressively without large jumps;
- do not show skeletons for actions that should use existing cached content plus a refresh indicator.

### Inline activity indicators

Use for:

- button submission;
- one card refreshing;
- one invitation being generated;
- one recording action.

The rest of the page remains usable unless safety requires otherwise.

### Stage indicators

Use named stages where exact percentage is unavailable but the workflow has real stages.

Examples:

```text
Requesting microphone access
Checking audio signal
Connecting private studio
Verifying microphone contribution
Starting public delivery
Checking listener playback
Ready to go live
```

Each stage advances only from real evidence. Do not assign invented percentages.

### Determinate progress

Use percentage only for measurable work such as bytes uploaded or a backend job that publishes trustworthy progress.

- Show the measurement source clearly where helpful.
- Do not let progress go backward without explanation.
- If progress becomes indeterminate, communicate the state change.
- Preserve retry and completed work when possible.

### Background refresh

- Keep existing content visible.
- Use a subtle refresh state.
- Do not blank a page for every poll.
- Avoid replaying entrance animations on unchanged data.
- Notify the user only when a meaningful state changes.

## Authentication choreography

Authentication should feel calm, neutral and reliable for both listeners and creators.

### Login and registration switching

- Switch modes without a harsh full-page flash.
- Preserve shared shell/brand elements.
- Use a short content transition.
- Move focus to the new form heading or first meaningful field.
- Do not slide an entire page dramatically across the screen.

### Submission

- Submit button enters a stable loading state.
- Fields remain readable.
- Duplicate submission is blocked.
- Server errors appear contextually.
- Successful authentication transitions into the actual next route based on API-backed intent/setup state.

### Successful entry

The transition into DigiStream should feel like entering the workspace, but it must remain fast.

- Avoid an artificial splash delay.
- Keep brand continuity.
- Load the shell and next actionable state as soon as possible.
- Use a brief transition only after authentication is verified.

### Mobile keyboard

- Active input and submit action remain reachable.
- Switching login/register does not leave the keyboard attached to a removed field.
- Password managers and autofill are not broken by animation or remounting.

### Errors

- Routine invalid credentials do not shake the whole screen.
- Rate-limit or suspicious-attempt states remain persistent and understandable.
- Network failure is distinguished from incorrect credentials.
- A retry does not erase entered email unnecessarily.

## Creator onboarding choreography

This programme must not alter the authoritative onboarding sequence.

### Intent choice

- `Broadcast audio` and `Listen to broadcasts` may enter as one short related set.
- Hover/focus/touch clearly communicates that each card is actionable.
- Selection receives immediate feedback.
- The destination transition follows the chosen path without creating fake account state.

### Step transitions

- Step indicator updates with the real completed state.
- The next step heading receives focus.
- Completed information may collapse into a compact summary.
- Back reveals the previous valid step without losing durable created resources.
- Refresh reconstructs the same step without replaying all introductory animation.

### Resource creation

- Generated slug updates smoothly but does not distract.
- Create-and-activate uses real loading stages where available.
- If creation succeeds and activation fails, the visual state clearly preserves the created channel and exposes safe retry.
- Do not reverse the UI to an empty form as if nothing was created.

### Finish later

The transition to Overview should emphasize the next valid action, not display a generic celebratory dashboard.

## Creator Overview choreography

Overview answers what is happening, what to do next and what is blocked.

- The primary next-action card enters or updates without moving unrelated cards unnecessarily.
- Important lifecycle changes update in place.
- A newly live or reconnecting state may receive a brief status emphasis.
- Metric placeholders do not animate when no real metric exists.
- Cards do not all float or glow on hover.
- Returning from Studio or Backstage restores context and scroll/focus.

## Broadcasts workspace choreography

### Channel and broadcast forms

- Opening a form should reveal it near the action that triggered it.
- Focus moves to the form heading or first invalid/required field.
- Collapsing optional fields preserves entered values.
- Submission uses stable inline loading.
- Successful creation inserts or updates the real list item without replaying the whole list.

### Lifecycle-specific row actions

Row-action motion should reinforce the action, not hide lifecycle differences.

- `Continue setup` opens the exact draft context.
- `Run sound check` moves into Studio preparation.
- `Start or reschedule` exposes valid overdue actions.
- `Manage live` enters focused live-operation mode.
- `View recording` moves into the real recording context.

Generic page-level Studio actions must not compete with contextual row actions.

### Scheduling

- Date/time validation appears inline.
- Schedule success updates the exact local time in place.
- Upcoming state remains visually calm.
- Never use a pulsing live indicator for scheduled content.

## Broadcast Studio choreography

Studio is the most operationally sensitive area. Motion must improve comprehension without distracting the creator.

### Preparation mode

Present a clear sequence:

1. select/confirm organisation, channel and broadcast;
2. request microphone permission;
3. choose input device;
4. check signal quality;
5. connect private Studio;
6. verify contribution;
7. start/check public delivery;
8. enable Go live only when ready.

Completed steps may transition into compact summaries. The current step remains prominent.

### Microphone meter

The meter is functional evidence, not decoration.

- Use fast attack and slower release as defined by the audio requirements.
- Clipping peaks appear immediately.
- No-signal state remains clear.
- Reduced-motion mode does not disable necessary signal evidence; it simplifies nonessential animation while preserving accurate level indication.
- Do not add unrelated waveform motion when no signal exists.

### Device switching

- Update only the affected controls/status.
- Preserve healthy states where valid.
- Show a concise pending state.
- On failure, restore or explain the real device state.
- Do not reset the entire Studio unless technically required.

### Contribution and delivery stages

Each stage updates from real evidence.

- Private contribution success may receive a brief confirmation.
- Public delivery remains separate.
- Delivery failure preserves healthy contribution where safe.
- Recovery actions appear near the failed stage.
- No fake circular percentage.

### Ready state

When public listener delivery is verified:

- the checklist changes clearly;
- `Go live` gains appropriate prominence;
- the change may use one brief emphasized transition;
- do not start a permanent glow or pulse around the button.

### Going live

The real transition to live may produce one controlled moment:

- status changes to Live;
- duration begins from the authoritative start time;
- nonessential setup controls become quieter or collapse;
- live-critical controls and health become more prominent;
- the change is announced accessibly;
- no confetti, fireworks, particle field or dramatic screen flash.

### Live operation mode

- Keep motion minimal.
- Status updates in place.
- Warnings receive brief attention emphasis, then remain readable.
- Do not continuously pulse the entire interface.
- Audience or quality values update without counting animations that delay accuracy.
- Critical controls stay stable so muscle memory is preserved.

### Reconnecting and recovery

- Reconnecting is visibly distinct from live and failed.
- Use restrained activity feedback.
- Explain preserved work and current retry behavior.
- Avoid repeatedly restarting the same entrance animation on each retry.
- Recovery to live receives a brief confirmation.

### Ending

- `End broadcast` uses deliberate confirmation.
- The ending state updates in place.
- Controls that are no longer safe become clearly unavailable.
- Do not dismiss Studio before the server confirms the terminal state unless the product explicitly supports background completion and communicates it.
- Completion transitions into the existing summary/recording path.

## Backstage choreography

### Context entry

Opening from a broadcast should enter with the exact broadcast selected and place focus in the correct section: Call-ins, Invited guests or On stage.

### Call-ins

- New requests may receive a brief non-disruptive entrance emphasis.
- The list should not jump while the producer is acting on another request.
- Approve/reject operations update the individual row.
- Pending, approved and rejected are distinct without relying on colour.
- Polling must not replay animations for unchanged rows.

### Invitations

- Invitation creation uses inline loading.
- The generated link appears with clear copy action.
- Copy success is brief and verified.
- Expired or revoked states update without removing audit context unexpectedly.

### On-stage participants

- Join and leave may animate subtly to preserve list continuity.
- Mute/remove actions update only the participant row.
- A participant disappearing after removal should not cause surrounding controls to jump unpredictably.
- Live-critical participant warnings remain persistent after the initial emphasis.

## Recordings and replay choreography

### Recording lifecycle

States update honestly:

- recording;
- uploading;
- processing;
- ready;
- failed;
- published;
- private;
- archived;
- deleted.

Use stage/status changes rather than fake percentage when no progress metric exists.

### Ready state

When a recording becomes playable:

- update the row/card in place;
- reveal valid actions without shifting the entire page dramatically;
- use one brief success confirmation;
- do not automatically publish or open the replay.

### Visibility changes

- Private/public/unlisted changes use server-backed pending states.
- Explain consequences.
- Confirm significant public exposure when appropriate.
- Roll back visually if the API rejects the change.
- Public share controls appear only after the new state is confirmed.

### Replay opening

The transition from recording management to replay should preserve the selected artifact identity. Returning should restore the recording list context.

## Listener discovery choreography

### Initial load

- Preserve page structure with restrained placeholders.
- Keep hero motion minimal.
- Live and upcoming sections appear progressively without shifting the whole page.
- Do not animate every broadcast card as a separate spectacle.

### Hero

The audio-first value proposition may use subtle ambient visual treatment, but:

- it must not delay discovery content;
- it must not consume most of a phone viewport;
- it must stop or simplify under reduced motion;
- it must not imply that a scheduled broadcast is live;
- it must not continuously consume significant CPU/GPU.

### Card interaction

- Live cards receive a restrained true-live indicator.
- Upcoming cards remain calm and clearly scheduled.
- Hover/focus/touch feedback is consistent.
- Pressing a card transitions to the exact event without a full white/blank flash.

### Refresh and error

- Retry in place when safe.
- Preserve existing content during background refresh.
- Do not reload the entire application for an ordinary metadata retry.
- Recovery confirmation is subtle.

## Listener playback choreography

The listener area should feel immersive but never distract from audio.

### Player-state transitions

- Play and pause icons may morph or crossfade.
- Buffering uses restrained activity feedback.
- Reconnecting is distinct from paused and unavailable.
- Automatic fallback updates status without exposing provider jargon by default.
- Controls remain stable to avoid accidental presses.

### Live indicator

A subtle pulse is allowed only when:

- the broadcast lifecycle is live or reconnecting as defined by product rules;
- public delivery has been verified;
- reduced-motion mode receives a static equivalent.

Scheduled, completed and unavailable broadcasts must not use the live pulse.

### Volume and mute

- Volume changes respond immediately.
- Mute state is unmistakable.
- Mobile layout respects hardware-volume expectations and avoids a large permanent slider when inappropriate.
- No decorative animation should imply volume changed before the real media element state changes.

### Buffering and recovery

- Automatic recovery occurs before manual retry becomes primary.
- Status changes update in place.
- Repeated buffering may advance to Unstable based on real evidence.
- Recovery to Stable uses brief confirmation.
- Technical diagnostics remain secondary.

### Playback expiry

Refreshing signed playback should preserve listening context where possible. Do not flash the whole player or reset volume without necessity.

## Listener call-in and chat choreography

### Call-in launcher

- Visible only when the current role/state permits it.
- Does not cover playback controls or bottom navigation.
- Press response is immediate.
- Hide the launcher while its sheet is open.

### Request sheet

- Opens as a safe-area-aware bottom sheet on mobile.
- Follows valid gesture behavior.
- Keeps listening active when technically permitted.
- Preserves entered fields through progress.
- Success transitions to a clear pending state within the same sheet.
- Duplicate/rate-limit/closed/expired states remain understandable.

### Chat

- Opening chat preserves playback.
- Scheduled broadcasts show a compact non-interactive state rather than animating a fake composer.
- New messages should not force-scroll a user reading older messages.
- A new-message indicator may enter subtly.
- Typing or presence animation is not introduced until the real feature exists.

## Haptic feedback

Haptics are optional progressive enhancement, not required for core understanding.

Use only where platform support and user expectations permit.

Potential appropriate uses:

- light confirmation for a safe toggle or selection;
- stronger but restrained confirmation for a deliberate live-critical action after success;
- warning feedback for a blocked action.

Rules:

- do not trigger vibration for every button;
- do not use haptics as the only feedback;
- respect platform and accessibility settings;
- avoid haptics during continuous audio-level changes;
- do not simulate success before server confirmation;
- test on physical Android devices.

## Sound feedback

DigiStream is an audio product, so interface sounds require exceptional caution.

Default rule: do not add general UI sound effects.

Any future sound cue must:

- have a clear operational purpose;
- never enter the broadcast or recording audio path;
- respect mute/accessibility preferences;
- avoid interfering with listener content or Studio monitoring;
- have a visible equivalent;
- be tested with headphones, speakers and screen readers.

## Empty, success, warning and error states

### Empty states

- One clear title.
- One concise explanation.
- One useful primary action when authorized.
- Minimal decorative motion.
- No oversized illustration that pushes the action below the fold.

### Success states

- Confirm meaningful completion.
- Keep the confirmation close to the affected object.
- Transition to the next valid task.
- Avoid a toast for every minor action.

### Warning states

- Use brief attention emphasis, then remain stable.
- Explain consequence and recovery.
- Do not pulse indefinitely.
- Do not rely on yellow/orange colour alone.

### Error states

- Explain what failed.
- Preserve successful work.
- Show the safe retry boundary.
- Distinguish network, permission, lifecycle, provider and validation failure.
- Avoid generic `Something went wrong` when typed error information exists.
- Do not repeatedly shake or flash.

## Performance and low-end Android requirements

Premium interaction that drops frames or overheats a phone is not premium.

### Rendering rules

- Prefer transform and opacity for motion where appropriate.
- Avoid animating large layout properties continuously.
- Avoid expensive full-screen blur during live playback or Studio operation.
- Limit large box-shadow and filter animation.
- Do not animate many list items simultaneously.
- Pause nonessential off-screen animation.
- Avoid continuous JavaScript animation loops when CSS or browser media events suffice.

### Device constraints

Test on at least one real low-to-mid-range Android device when possible.

Verify:

- authentication with keyboard open;
- long onboarding forms;
- discovery scrolling;
- listener playback while opening call-in/chat;
- Studio meter and checklist;
- Backstage updates;
- recording list transitions;
- reduced motion;
- Android desktop-site mode;
- background/foreground return.

### Frame and responsiveness expectations

- Input acknowledgement must remain immediate.
- Ordinary transitions should target smooth rendering under realistic device load.
- A dropped frame must not leave a control stuck in an incorrect state.
- Live-critical actions must not wait for a decorative animation to finish.
- Long tasks run independently of presentation animation.

### Network constraints

- Motion must not assume immediate API response.
- Pending states remain understandable for slow requests.
- Offline/reconnect transitions preserve content.
- Do not replay success animation after reconnect unless a real state changed.

## Accessibility requirements

### Keyboard

- Visible focus for every interactive control.
- Focus order follows visual/task order.
- Route transitions move focus intentionally.
- Dialogs and sheets trap and restore focus.
- No action depends on hover.
- Space/Enter behavior follows native semantics.

### Screen readers

- Announce meaningful state changes such as live, reconnecting, delivery ready, recording ready and operation failure.
- Avoid announcing rapid meter changes continuously.
- Loading indicators have appropriate labels.
- Success confirmation does not disappear before being announced.
- Motion does not reorder the accessibility tree unpredictably.

### Reduced motion

Automated and manual checks must verify:

- no large route slides;
- no decorative live pulse;
- static skeleton or simplified loading behavior;
- no parallax;
- preserved functional audio meter evidence;
- correct focus and status communication.

### Contrast and forced colours

- Motion states must remain understandable if shadows, gradients or transparency disappear.
- Focus and selected states must remain visible.
- Enabled and disabled controls must remain distinct.
- Live/scheduled/reconnecting differences must not depend on animation or colour alone.

### Zoom and text size

- 200% zoom does not clip animated surfaces.
- Text enlargement does not cause motion paths to overlap content.
- Bottom sheets and dialogs remain scrollable.
- Sticky actions do not cover validation or status text.

## Implementation architecture

### Shared primitives first

Implement shared foundations before feature-specific polish:

- semantic motion tokens;
- reduced-motion utilities;
- pressed/hover/focus/loading button behavior;
- overlay transitions and gesture utilities;
- stable skeleton/progress primitives;
- status-announcement utility;
- safe list-item insertion/update patterns;
- tested transition wrapper for route/content changes where justified.

Do not introduce a new animation framework unless native CSS, Web Animations API and existing React patterns cannot satisfy the requirements cleanly.

### Dependency policy

Before adding a motion library, document:

- exact missing capability;
- bundle-size impact;
- tree-shaking behavior;
- accessibility/reduced-motion support;
- server/build compatibility;
- maintenance health;
- mobile performance;
- why a small local primitive is insufficient.

Do not add a large library merely to animate opacity, transform or a simple bottom sheet.

### State-driven motion

Animations must derive from real state transitions, not arbitrary timeouts.

Bad:

```text
request sent -> wait 800 ms -> show success
```

Required:

```text
request sent -> pending presentation
API/lifecycle evidence confirms success -> success presentation
API/lifecycle evidence confirms failure -> recovery presentation
```

Timers may control the duration of a visual confirmation after the real state is known, but cannot invent the state.

### Interruption safety

Every transition must tolerate:

- route change;
- component unmount;
- repeated input;
- network completion during animation;
- reduced-motion changes;
- browser tab backgrounding;
- Android Back;
- session expiry.

Do not leave scroll locked, focus lost or controls disabled after interruption.

## Dependency-ordered implementation programme

Implement through bounded pull requests after the two earlier mandatory programmes are complete.

### 1. Motion inventory and baseline measurements

- Inventory all current transitions, hover states, focus states, loaders, skeletons, dialogs, sheets, animated meters and live indicators.
- Identify duplicated CSS and contradictory durations.
- Capture baseline bundle size, layout shift, input responsiveness and representative mobile recordings.
- Record existing reduced-motion behavior.
- Do not change the visual language significantly in this inventory pull request.

### 2. Shared motion tokens and reduced-motion foundation

- Add semantic duration, easing, distance and scale tokens.
- Add shared reduced-motion rules.
- Remove arbitrary feature-local values where safe.
- Add tests or static checks for token usage where practical.
- Verify no functional meter/progress evidence is accidentally removed.

### 3. Control-state polish

- Standardize Button, LinkButton, IconButton, toggles, checkboxes, segmented controls and form focus/validation.
- Fix primary contrast across all responsive layers.
- Add stable loading and success states.
- Verify mouse, keyboard and touch parity.

### 4. Overlay and gesture polish

- Apply shared entry/exit behavior to dialogs, Studio, Backstage, chat and call-in sheets.
- Add safe sheet drag where appropriate.
- Verify focus, Back, scroll lock, keyboard and interruption safety.
- Do not allow gesture dismissal of unsafe live-critical state.

### 5. Navigation and spatial continuity

- Stabilize shell transitions.
- Preserve contextual origin and return focus/scroll.
- Remove route flashes and unnecessary remounts.
- Add major workspace transitions only where they clarify context.

### 6. Authentication and onboarding polish

- Add calm login/register transitions.
- Refine field, validation and submit feedback.
- Add state-driven onboarding step transitions.
- Preserve autofill, keyboard and refresh behavior.

### 7. Broadcasts and Overview polish

- Refine card/list interaction.
- Add stable insertion/update behavior.
- Improve contextual form reveal.
- Apply lifecycle-specific action feedback.
- Avoid reanimating entire data sets on refresh.

### 8. Studio operational choreography

- Build preparation-stage transitions from real state.
- Refine microphone evidence presentation.
- Add controlled ready/live/reconnecting/ending transitions.
- Preserve live-operation stability and performance.
- Test with physical microphone and real media stack where available.

### 9. Backstage operational choreography

- Refine call-in, invitation and participant row updates.
- Preserve focus and selection during polling/realtime change.
- Add restrained new-request emphasis.
- Test participant operations during an active broadcast.

### 10. Listener discovery and playback polish

- Refine discovery loading and card interaction.
- Reduce hero motion/height where needed.
- Refine player-state transitions and recovery feedback.
- Preserve playback during chat and call-in interactions.
- Verify signed playback refresh and fallback states.

### 11. Recording and replay polish

- Refine lifecycle-stage presentation.
- Add stable ready/failed/visibility transitions.
- Preserve authorized action boundaries.
- Maintain context between recording management and replay.

### 12. Performance, accessibility and physical-device acceptance

- Run automated reduced-motion, focus, contrast and overflow checks.
- Test low-to-mid-range Android performance.
- Test constrained network and background/foreground behavior.
- Perform screen-reader and TalkBack review.
- Fix critical regressions before decorative additions.

### 13. Non-technical usability and refinement

Observe real users completing creator and listener tasks.

Record:

- whether interactions feel immediate;
- whether animation explains or confuses;
- missed actions;
- accidental touches;
- perceived waiting time;
- misunderstanding of live versus ready versus scheduled;
- failure recovery;
- motion discomfort;
- keyboard and bottom-sheet problems.

Remove or simplify motion that does not improve task performance.

### 14. Obsolete-style and documentation reconciliation

- Remove superseded local transitions, duplicated loaders and contradictory overrides.
- Update component documentation and visual regression references.
- Record remaining limitations.
- Do not mark the programme complete while any core surface still uses contradictory control states or unsafe motion.

## Required test matrix

Every affected pull request must include appropriate automated and manual evidence.

### Automated browser coverage

- desktop Chromium;
- Android Chrome emulation;
- Android desktop-site simulation;
- reduced-motion emulation;
- touch/coarse-pointer mode;
- keyboard navigation;
- short-height landscape for overlays/Studio;
- 200% zoom or representative enlarged text;
- no horizontal overflow;
- stable action width during loading;
- no duplicate submission;
- Back closes top layer correctly;
- focus restoration;
- no live pulse on scheduled content;
- no success before API confirmation;
- animation interruption does not leave locked body or disabled controls.

### Visual regression coverage

Capture representative states:

- authentication default/focus/error/loading;
- onboarding intent and each step;
- creator Overview primary states;
- Broadcasts draft/scheduled/live/completed rows;
- Studio permission/no-signal/good/clipping/delivery-ready/live/reconnecting/ending;
- Backstage call-in/guest/on-stage states;
- Recordings processing/ready/failed/private/published;
- listener discovery live/upcoming/error;
- player buffering/reconnecting/stable/unavailable;
- call-in sheet and chat;
- reduced-motion variants.

Visual snapshots do not replace behavior tests.

### Physical-device/manual coverage

- low-to-mid-range Android phone;
- touch press feedback;
- virtual keyboard;
- Android Back;
- drag/dismiss sheet behavior;
- playback while opening overlays;
- microphone meter;
- foreground/background transition;
- bright-screen contrast;
- reduced motion where device/browser supports it;
- actual perceived responsiveness.

## Performance acceptance gates

A pull request must not merge when it introduces any of the following without a documented and accepted reason:

- delayed input acknowledgement;
- significant frame drops during ordinary interaction;
- continuous high-cost animation during playback or Studio operation;
- large bundle increase for minor effects;
- full-screen blur/filter animation on low-end devices;
- layout shift that moves the active control;
- page-wide skeleton replay on background refresh;
- motion that blocks a live-critical action;
- animation that continues off-screen unnecessarily;
- excessive battery or CPU use observed during physical-device testing.

## Anti-gimmick rules

Reject changes that:

- animate every component merely because motion tokens exist;
- add confetti, fireworks or particle celebrations;
- add permanent glow around primary actions;
- pulse scheduled broadcasts;
- use a live waveform without real audio evidence;
- use fake progress percentages;
- delay navigation to display an animation;
- hide required actions until hover;
- use parallax in operational workspaces;
- make every card scale or float dramatically;
- use excessive glass blur that harms readability/performance;
- use spring bounce for errors or destructive actions;
- shake forms for routine validation;
- add UI sound effects without a documented operational need;
- add haptics to every control;
- copy another product’s distinctive visual identity;
- make Studio resemble a gaming dashboard;
- replace plain-language status with decorative animation;
- remove content or focus before assistive technology can perceive it.

## Anti-rubbish implementation checklist

Reject a product-polish pull request unless all relevant answers are yes.

### Purpose

- Does every animation explain state, hierarchy, continuity or feedback?
- Would the task remain understandable with motion disabled?
- Is the interaction improvement more important than its visual novelty?

### Truthfulness

- Does success wait for real confirmation?
- Are loading and progress representations accurate?
- Is live animation restricted to verified live delivery?
- Are recording and replay transitions based on real states?

### Interaction

- Is acknowledgement immediate?
- Are loading widths and layouts stable?
- Does repeated input remain safe?
- Can the transition be interrupted without leaving broken state?
- Does Back close the correct layer?
- Is focus restored?

### Input parity

- Is required behavior available without hover?
- Is keyboard focus as clear as hover?
- Does touch receive pressed feedback?
- Does the virtual keyboard preserve the task?
- Are screen-reader announcements appropriate?

### Accessibility

- Is reduced motion complete and tested?
- Is meaning independent of animation and colour?
- Does 200% zoom remain usable?
- Do focus trap and restoration work?
- Are rapid functional values, such as the meter, prevented from flooding announcements?

### Performance

- Was the change tested on a realistic phone profile?
- Does it avoid expensive continuous effects?
- Does it preserve playback and Studio responsiveness?
- Is any new dependency justified?
- Does background refresh avoid replaying motion?

### Product integrity

- Does the change reuse existing components and real state?
- Has it avoided a duplicate “premium” surface?
- Does it preserve API authority and lifecycle rules?
- Does it preserve the earlier onboarding and product-hardening contracts?

### Completion

- Are automated tests present?
- Is physical-device/manual evidence recorded where needed?
- Are visual regressions reviewed in reduced-motion and touch modes?
- Are docs updated?
- Are remaining limitations stated honestly?

## Pull-request reporting requirements

Every pull request in this programme must document:

- the exact interaction defect or inconsistency;
- the user task affected;
- the real state transition being represented;
- shared tokens/primitives reused or introduced;
- mouse, keyboard and touch behavior;
- reduced-motion behavior;
- loading, failure and interruption behavior;
- mobile and performance impact;
- accessibility impact;
- automated tests;
- physical-device/manual evidence where applicable;
- bundle-size or dependency impact;
- screenshots/video evidence where useful;
- documentation updated;
- known remaining limitations.

Do not describe a change as `premium`, `modern`, `delightful` or `smooth` without explaining the measurable task or interaction improvement.

## Completion definition

This programme is complete only when:

- motion tokens and reduced-motion behavior are shared and consistently used;
- buttons, toggles, fields, cards, navigation and overlays have complete interaction states;
- authentication and onboarding feel continuous without breaking autofill, focus or keyboard behavior;
- Overview and Broadcasts update without unnecessary page/list replay;
- Studio has calm preparation, truthful readiness, controlled live transition and stable live operation;
- Backstage updates participants and requests without disruptive jumps;
- listener discovery and playback feel responsive while preserving reliability and truthfulness;
- recording/replay transitions preserve authorization and context;
- no scheduled content uses live animation;
- no fake progress or premature success remains;
- reduced-motion, keyboard, screen-reader and TalkBack acceptance passes;
- low-to-mid-range Android acceptance shows no critical performance regression;
- non-technical users understand interactions and recover without coaching;
- obsolete local animations and contradictory CSS are removed;
- all authoritative documents agree with the implemented behavior.

## Final product target

DigiStream should feel like one carefully engineered product across every surface.

A user should notice that:

- buttons respond instantly;
- toggles and fields behave naturally;
- loading never feels mysterious;
- route changes preserve context;
- Studio clearly progresses from preparation to verified live delivery;
- listening remains stable while secondary panels open;
- errors preserve work and explain recovery;
- mobile gestures feel familiar;
- nothing moves without purpose;
- the product remains fast and calm on a real phone.

The desired impression is not “this website has many animations.”

The desired impression is:

> Every detail responds exactly as expected, the product always communicates what is happening, and the entire experience feels deliberate, trustworthy and high quality.
