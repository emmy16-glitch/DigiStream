# DigiStream product quality and reliability standard

## Purpose and authority

This document is the authoritative quality standard for DigiStream's listener, creator, guest, backstage and administrative experiences. It exists so human contributors and AI coding agents make consistent decisions instead of repeatedly introducing the same state, mobile-layout, language and reliability mistakes.

When this document conflicts with a decorative mock-up or a generic UI suggestion, this document wins unless a later approved product decision explicitly changes it.

DigiStream quality is judged in this order:

1. Reliability and honest communication of state
2. Correct authorization, ownership and lifecycle behaviour
3. Plain language for non-technical users
4. Consistent interaction and visual hierarchy
5. Restrained, meaningful motion and polish

A visually attractive interface that reports the wrong state, exposes the wrong action or fails silently is not production quality.

## Product context

DigiStream may be used during a church service, community programme, meeting or other live event where the operator is not a media engineer and where a failure matters immediately. The interface must remain understandable during poor connectivity, microphone problems, delivery delays, authentication failures and partial service outages.

The primary test is not whether the interface looks impressive on a perfect connection. The primary test is whether a non-technical person can trust what DigiStream says and recover when something goes wrong.

## Non-negotiable principles

### The UI must tell the truth

- A scheduled time never means a broadcast is live.
- A microphone level never proves public delivery is ready.
- A connected LiveKit room never proves listeners can hear audio.
- A green control must not appear enabled when it cannot be used.
- A disabled control must not look like the primary action.
- A listener-only action must not be shown to an owner or authorised production user when a management action is more appropriate.
- Incomplete product areas must not appear as functioning navigation merely to make the product look larger.
- Mock values, fake listener counts, fake health values and fake analytics are prohibited.

### The API remains authoritative

Role-aware UI improves clarity but is not a security boundary. The backend must independently verify authentication, organisation membership, role, ownership, broadcast lifecycle, visibility and media readiness for every protected action.

Hiding a button is not authorization.

### Partial failures are expected states

DigiStream must design for:

- offline devices;
- unstable mobile networks;
- WebRTC connection failure;
- LL-HLS fallback;
- buffering;
- source interruption;
- contribution-room reconnection;
- delivery delay or failure;
- expired signed playback access;
- microphone permission denial;
- silent or disconnected inputs;
- session expiry;
- chat reconnection;
- duplicate or rate-limited call-in requests.

These are normal product states with explicit copy and recovery paths, not generic edge cases.

## Broadcast state presentation

The listener and creator interfaces must use the stored broadcast lifecycle and verified media readiness. The following states must remain visually and functionally distinct.

### Scheduled

Meaning: the event is planned but public audio is not available.

Required presentation:

- Use `Upcoming` or `Scheduled`, never `Live`.
- Show the exact date and local time.
- A simple text countdown such as `Starts in 1h 36m` may be shown.
- Refresh metadata automatically so the page can transition without reload.
- Allow appropriate secondary actions such as `Add to calendar` and `Copy listener link`.
- Hide play, pause, mute, volume and retry-playback controls.
- Hide the active chat composer and character counter.
- Do not display permanent `LIVE` artwork.

Avoid arbitrary circular percentage progress. A countdown must represent real time remaining, not an unexplained percentage.

### Starting

Meaning: the creator or media system is preparing the contribution and public-delivery path.

Required presentation:

- Use wording such as `The broadcast is starting` or `Connecting the live audio path`.
- Show bounded waiting or progress feedback without claiming listeners can hear audio.
- Do not show the final live state until contribution and delivery readiness are both confirmed.

### Live

Meaning: contribution and public delivery are verified and listener playback access is available.

Required presentation:

- Use clear `Live now` treatment.
- Enable player controls.
- Animate the audio brand visual only when motion is appropriate and the state is truly live.
- Show listener-friendly connection status.
- Allow chat and call-in features only when their separate policies permit them.

### Reconnecting

Meaning: the live event remains active but one media or network path is recovering.

Required presentation:

- Do not silently return to a neutral state.
- Explain what is happening in plain language.
- Show bounded retry progress when known, for example `Reconnecting audio, attempt 2 of 3`.
- Keep the user informed when DigiStream changes to a more reliable playback path.
- Preserve already working parts of the experience where safe.

### Ending

Meaning: the creator has requested shutdown but delivery cleanup is still occurring.

Required presentation:

- Stop accepting actions that assume a normal live state.
- Explain that the broadcast is ending.
- Do not immediately claim completion until the lifecycle confirms it.

### Completed

Meaning: live delivery has ended successfully.

Required presentation:

- Remove live controls.
- Show replay only when a real authorised recording exists.
- Do not show an empty or fake Replay experience.

### Cancelled or failed

Required presentation:

- State the outcome clearly.
- Provide the next meaningful action: return to discovery, contact the organiser, retry a safe operation or open diagnostics for an authorised creator.
- Do not expose provider secrets, raw internal errors or implementation identifiers.

## Listener playback experience

### Connection honesty

The listener player should translate media and network data into a small set of truthful states:

- Stable
- Unstable connection
- Buffering
- Reconnecting
- Offline
- Playback unavailable
- Broadcast ended

A low data-rate number in a phone status bar is not sufficient evidence of poor playback. Quality labels must be based on player or transport evidence such as packet loss, jitter, round-trip time, repeated reconnects, buffering duration, segment download delay, time since the last audio packet or verified transport failure.

Technical details may be available in an expandable diagnostics area, but the primary interface must use plain language.

### Playback recovery

- WebRTC is attempted first when supported and healthy.
- LL-HLS is the reliability fallback.
- Recovery attempts must be bounded.
- A fresh signed playback descriptor should be requested when necessary.
- The UI must explain automatic recovery before presenting manual retry.
- `Retry playback` becomes the primary action only after playback has actually failed.
- Retry must not appear for a scheduled broadcast.

### Mobile controls

- Hardware volume buttons are the expected primary mobile volume control.
- Keep mute accessible.
- Hide or collapse the full volume slider on narrow screens.
- A desktop or tablet player may retain a visible slider.
- Fixed controls must not cover event details, chat or footer content.

### Listener navigation

Individual event pages need a clear route back to discovery, in addition to browser navigation. Navigation must not claim `Live now` is active for a scheduled event. Use an `Upcoming` concept, a neutral event-detail state or a broader label such as `Broadcasts`.

## Role-aware listener and creator actions

The visible action must match the signed-in user's relationship to the broadcast.

### Visitor or ordinary listener

May see actions such as:

- Listen when playable
- Copy link
- Add to calendar
- Sign in to chat
- Request to speak when call-ins are open

### Organisation owner, admin or broadcaster

On their own organisation broadcast, replace listener-only call-in promotion with an operational action such as:

- Manage broadcast
- Open studio
- Open backstage

Do not show an owner a prominent `Request to speak` action on their own event unless a later explicit product policy allows owners to enter the listener call-in flow.

### Moderator and analyst

Actions must reflect their permission matrix. Analysts must not receive operational controls. Moderators should receive only approved interaction and moderation controls.

Every role-aware rendering decision must have a matching API authorization test.

## Request-to-speak and call-in standard

### Closed launcher

- The launcher may be fixed above the bottom safe area.
- The page must reserve enough bottom space so it cannot cover content.
- It must not overlap the broadcast status, chat heading, player controls or footer.

### Open mobile panel

On narrow screens, render the form or status as a real bottom sheet or full-height modal instead of keeping the complete panel inside the fixed launcher container.

Required behaviour:

- Hide the launcher while the panel is open.
- Add a backdrop.
- Lock background scrolling.
- Use dynamic viewport units and `env(safe-area-inset-bottom)`.
- Allow the panel body to scroll internally.
- Keep the submit or status action reachable when the keyboard is open.
- Use `window.visualViewport` only as a compatibility fallback, not as the primary layout solution.

### Form behaviour

- Pre-fill display name and email from the signed-in account when available.
- Keep those values editable.
- Leave fields empty for anonymous listeners.
- Make borders visible in bright environments.
- Use a consistent high-contrast focus state.
- Do not collect information that is not required by product policy.

### Submission feedback

- Keep the panel visible while submitting.
- Show a progress state on the submit action.
- Confirm successful submission briefly.
- Transition into the persistent pending-status view instead of abruptly closing.
- Do not auto-collapse before the listener understands that approval is pending.
- Continue bounded status refresh and preserve the tracking token according to the security design.

### Producer-side flow

The creator backstage workspace is the producer-side half of call-ins. Documentation and UI must make the full flow understandable:

`listener request -> producer review -> approve or reject -> guest invitation -> waiting room -> admit -> guest microphone joins backstage`

Do not claim the producer flow is missing without first checking the backstage implementation. Improve discoverability when the feature exists but is hard to find.

## Broadcast chat standard

### Scheduled or read-only state

Do not show a full disabled composer, bright send button and `0/1000` counter.

Replace them with a compact status such as:

`Chat will open when the broadcast starts.`

Hide transport-recovery language when chat is not yet open unless a real error requires action.

### Live writable state

- Show the composer and counter.
- Keep disabled and sending states visually distinct.
- Store messages durably before relying on real-time delivery.
- Recover committed history after socket interruption.

### Completed state

- Present chat history if policy allows it.
- Remove the active composer.

## Creator studio standard

The mobile workflow should remain understandable as:

1. Select broadcast
2. Prepare audio
3. Verify and go live

### Microphone states

The studio must distinguish:

- Permission required
- Permission denied
- Listening for input
- No signal
- Signal detected
- Quiet
- Good
- Loud
- Clipping
- Muted
- Device disconnected

Do not use `Listening` as the final status when the meter remains at zero or near silence for a sustained interval.

### Audio language

Use a human-readable assessment first and technical data second:

`Good signal · -18.4 dBFS`

`Too quiet · -50.5 dBFS`

`No signal detected`

The raw dBFS number may remain for experienced users but must not be the only explanation.

### Meter behaviour

Smooth the underlying signal with a fast attack and slower release. Do not hide clipping peaks. Merely adding a CSS height transition is not a substitute for signal smoothing when the meter is class-based.

### Studio errors

An error such as `Live contribution access is temporarily unavailable` must be traced to its authentication, authorization, configuration or media cause. The UI should offer a safe retry or status action only after the failed operation is understood.

- Avoid duplicate close and dismiss actions.
- Preserve an already connected microphone or contribution room when public delivery alone fails, where safe.
- Use request IDs or diagnostics for support without exposing secrets.

### Browser history and closing

Opening the studio should create a navigable history or route state. Browser and Android Back should close the studio before leaving the creator workspace. Do not implement a custom edge-swipe recognizer that conflicts with operating-system gestures.

## Navigation and incomplete product areas

Navigation must represent real product capabilities.

- Use `Backstage` or `Guests` instead of an ambiguous mobile label such as `People` when the destination is guest and call-in operations.
- Hide Replay until recording storage, processing and authorised replay exist.
- Hide Stats until trustworthy analytics and definitions exist.
- Do not render multiple competing create-broadcast entry points in the same state.
- Use one clear primary action per empty state.
- Remove internal values such as `Version 0` or lifecycle counters from end-user cards.

## Visual hierarchy and mobile layout

### Typography

Preserve DigiStream's strong editorial event-title style. Do not automatically reduce event titles to generic 28–32 pixel card headings.

Instead:

- use responsive `clamp()` sizing;
- maintain readable line height;
- allow safe wrapping;
- prevent clipping and overlap;
- test long titles and localisation.

Fix the layout cause before destroying the brand hierarchy.

### Fixed and sticky elements

Every fixed bottom navigation, player action or call-in launcher requires matching content clearance.

Use safe-area-aware spacing such as:

```css
padding-bottom: calc(var(--fixed-control-clearance) + env(safe-area-inset-bottom));
```

Test with Android gesture navigation, three-button navigation, iPhone safe areas and an open virtual keyboard.

### Buttons

Enabled primary action:

- saturated accent background;
- high-contrast dark text;
- normal press feedback.

Disabled action:

- muted surface or significantly reduced emphasis;
- muted text and border;
- no active transform;
- `cursor: not-allowed` where relevant.

Do not combine a bright green primary background with dim grey text.

### Press feedback

Use restrained, consistent feedback across controls, for example a small scale or brightness change over approximately 80–120ms. Respect `prefers-reduced-motion`.

### Inputs and focus

- Input boundaries must remain visible in dark mode and bright sunlight.
- Use the same focus ring colour, width and offset everywhere.
- Do not rely on glow alone; preserve a clear border and accessible contrast.

### Cards and empty states

Do not force every semantic state into one identical card style.

- Solid cards may represent real content.
- Dashed or subdued containers may represent an empty area.
- Error, warning and success surfaces must remain distinct.

Standardise radii, spacing, type hierarchy, icon sizing and border contrast without erasing meaning.

### Icons

Use the shared DigiStream icon system instead of raw Unicode symbols such as `◉`, `◖`, `▶` and `×` where a supported icon exists. Browser-dependent symbols create inconsistent sizing and alignment.

## Plain-language translation standard

Primary end-user copy should translate implementation terms.

| Internal or technical wording | Primary user wording | Optional secondary detail |
| --- | --- | --- |
| WebRTC | Low-latency audio | WebRTC in diagnostics |
| LL-HLS | Reliable audio fallback | LL-HLS in diagnostics |
| WebRTC -> LL-HLS | Switching to a more reliable audio path | Protocol names in diagnostics |
| dBFS | Quiet, Good, Loud or Clipping | Raw dBFS value |
| lifecycle version | No user-facing equivalent | Internal diagnostics only |
| contribution token failure | Studio access could not be prepared | Request ID for support |
| delivery not ready | Public audio is still starting | Provider detail for authorised operators |

Jargon is allowed in developer documentation and diagnostics, not as the only explanation shown to a worship-team volunteer or ordinary listener.

## Motion standard

Motion is secondary to correctness and must use one consistent language.

Prioritise motion for meaningful moments:

- scheduled becomes starting;
- starting becomes live;
- live becomes reconnecting;
- reconnecting recovers;
- live ends;
- a call-in request is successfully submitted or approved.

Generic press feedback and meter polish may be added after these state transitions are correct.

Requirements:

- consistent durations and easing curves;
- no decorative animation that falsely suggests live activity;
- no motion required to understand state;
- complete reduced-motion support;
- avoid large, prolonged animations during urgent recovery.

## Reliability verification

### Existing foundation

DigiStream already includes a real media smoke path that verifies:

`LiveKit room -> audio publisher -> LiveKit Egress -> OvenMediaEngine -> signed LL-HLS manifest`

Contributors must not describe DigiStream as only a UI mock-up without checking the media stack, smoke workflow, backstage flow and API implementation.

### Required additional resilience tests

The existing happy-path smoke test does not replace failure testing. Add and record tests for:

- browser WebRTC failure followed by successful LL-HLS playback;
- temporary listener network loss and recovery without page reload;
- high latency, packet loss and jitter;
- repeated buffering and bounded retries;
- creator contribution disconnect and reconnect;
- publisher audio-source loss;
- OvenMediaEngine delivery interruption;
- signed playback expiry during an active session;
- mobile browser background and foreground transitions;
- Android Chrome, desktop Chrome, Firefox and Safari;
- low-end devices and constrained CPU or memory;
- multiple listeners and measured capacity;
- creator and listener views agreeing on the same lifecycle state.

### Observability

Production-quality failures require:

- structured logs;
- correlation or request IDs;
- media lifecycle events;
- player and contribution phase metrics;
- buffering and fallback counters;
- latency, jitter and packet-loss measurements where available;
- alerts with actionable context;
- no secrets or raw private tokens in logs.

## PWA and native-feeling delivery

A manifest, service worker, icons, standalone mode and real HTTPS domain can improve the installed experience, but PWA work follows core reliability and deployment readiness.

An installable unstable streaming product is not premium.

PWA completion requires:

- web app manifest;
- production icons and launch metadata;
- service worker with a deliberately limited offline shell;
- safe update behaviour;
- real-domain HTTPS deployment;
- correct deep-link routing;
- no attempt to cache protected or short-lived media URLs incorrectly.

## Non-technical usability validation

Before a real service, test with someone who did not build DigiStream.

Give the person a phone and ask them, without coaching, to:

1. Find the scheduled event.
2. Open the creator workspace.
3. Select the organisation, channel and broadcast.
4. Prepare the microphone.
5. Interpret the audio status.
6. Join the studio.
7. Start public delivery.
8. Confirm when listeners can hear them.
9. Recover from a simulated connection or delivery failure.
10. End the broadcast.

Record where they hesitate, choose the wrong action or misunderstand the state. Correct those problems before adding decorative features.

Also test the listener and call-in flow with a separate non-technical person.

## Instructions for AI coding agents and reviewers

Before changing DigiStream:

1. Read this document, `PRODUCT_SPECIFICATION.md`, `ROADMAP.md` and the feature-specific documentation.
2. Inspect the current branch and current implementation. The default branch may not match an active Codespace or unmerged feature branch.
3. Do not claim a feature is missing until repository code and documentation have been checked. Call-in producer controls and media smoke infrastructure already exist.
4. Do not overwrite a newer UI with an older default-branch implementation.
5. Preserve verified backend security and lifecycle boundaries while changing presentation.
6. Prefer state-derived rendering over CSS-only hiding.
7. Never add fake data to make an empty screen appear complete.
8. Hide incomplete navigation areas instead of creating misleading shells.
9. Keep primary copy non-technical and move diagnostics to a secondary surface.
10. Update documentation and tests in the same pull request when behaviour changes.
11. Describe exactly what was tested, including failure paths.
12. Do not merge unexplained media, authorization or lifecycle failures.

## Pull-request quality checklist

Every listener, creator, chat, guest or media UI pull request should answer:

- Which lifecycle and network states are supported?
- Does every visible action match the signed-in role?
- Can fixed elements overlap content or the keyboard?
- Are scheduled and live states unmistakably different?
- Are incomplete controls hidden?
- Is primary wording understandable without media-engineering knowledge?
- Are retry actions bounded and safe?
- Does the backend still independently authorize the operation?
- Are reduced motion, keyboard focus and mobile safe areas handled?
- Were long titles, empty states, errors and slow connections tested?
- Does the creator state agree with the listener state?
- Were documentation and automated tests updated?

## Implementation priority

### Priority 0: trust and blockers

- Trace `Studio action failed` to its real cause.
- Make owner, admin and broadcaster listener pages role-aware.
- Separate scheduled, starting, live, reconnecting and completed listener controls.
- Remove scheduled `LIVE` artwork.
- Add no-signal and disconnected-input studio states.
- Correct misleading enabled and disabled controls.
- Prevent fixed controls from covering content.

### Priority 1: resilience proof

- Run and preserve the current media smoke evidence.
- Add browser-level WebRTC-to-LL-HLS failure testing.
- Test contribution, delivery and network interruptions.
- Add production-grade observability and plain-language recovery states.

### Priority 2: comprehension and consistency

- Replace jargon-first copy.
- Rename ambiguous navigation.
- Hide Replay and Stats until implemented.
- Improve backstage and call-in discoverability.
- Standardise focus, icons, spacing and state surfaces.

### Priority 3: restrained polish

- Text countdown and calendar action.
- Meaningful live and recovery transitions.
- Consistent press feedback.
- Signal smoothing.
- PWA installation after production reliability is proven.
