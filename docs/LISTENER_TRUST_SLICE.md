# Phase 6A listener trust slice

This slice applies the first implementation from the product-quality and reliability gate. It fixes listener and creator presentation problems that made scheduled or role-specific states look more capable than they really were.

## Included

- Nested broadcast pages no longer mark the top-level **Live now** navigation item as active merely because an event route is open.
- Scheduled event pages visually present an upcoming state instead of permanent live artwork.
- Scheduled pages hide playback, mute, volume and retry controls while preserving the exact listener link.
- Public scheduled and starting broadcasts use a compact chat status instead of a disabled composer, bright send control and character counter.
- Request-to-speak is shown only while a public broadcast is live or reconnecting, unless an existing request is still being tracked.
- Signed-in owners, administrators and broadcasters see **Manage broadcast** instead of the listener call-in launcher on their organisation's event.
- Moderators receive **Open backstage** and analysts receive no operational call-in action.
- Signed-in listener name and email are pre-filled when a listener is eligible to submit a request.
- The mobile request form is a real modal bottom sheet with a backdrop, scroll lock, focus trapping, Escape support, safe-area padding and internally scrollable content.
- The launcher is removed while the panel is open.
- Submission keeps the panel open, confirms success and moves into persistent request-status tracking.
- Creator navigation hides Replay and Stats until their complete authorised product flows are ready.
- Mobile **People** navigation is renamed **Backstage**.
- Internal broadcast lifecycle versions are no longer shown in end-user broadcast cards.

## Security and authorization boundary

Role-aware rendering is only a presentation rule. Existing API authorization remains authoritative for organisation, broadcast, studio, backstage and call-in operations.

The public event UI obtains the signed-in session and organisation memberships from existing authenticated API routes. It does not trust a role supplied by the browser or route.

## Browser coverage

`tests/ui/listener-trust.spec.ts` verifies:

- scheduled broadcasts expose no live playback, retry or call-in controls;
- scheduled chat uses the compact opening-time state;
- nested scheduled routes do not mark **Live now** as active;
- an organisation owner receives **Manage broadcast** instead of **Request to speak**;
- the mobile request panel hides the launcher, locks background scrolling and stays visible after successful submission;
- pending request status remains visible after submission.

The existing creator responsive suite continues to validate desktop Chromium, Android Chrome and Android Desktop-site simulation.

## Deliberate boundary

This slice does not yet implement browser-level WebRTC failure injection, LL-HLS fallback proof, no-signal microphone classification or the root-cause fix for the current Studio access failure. Those remain the next Phase 6A slices.
