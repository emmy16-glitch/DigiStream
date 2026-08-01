# Broadcast Studio UI migration

This slice migrates the existing creator Broadcast Studio and active live-control states onto the shared DigiStream design system. It deliberately preserves the existing authenticated API, LiveKit contribution, readiness verification and OvenMediaEngine delivery behaviour.

## Design source

The implementation follows:

- `DIGISTREAM_PRODUCT_DESIGN_BIBLE.md`, sections 4.5 and 4.6;
- `DESIGN_TOKENS.md`;
- `UI_FOUNDATION_IMPLEMENTATION.md`;
- `CREATOR_BROADCAST_STUDIO.md` for security, readiness and failure behaviour.

The approved pre-live studio and live-control references define hierarchy and visual direction. Illustrative listener counts, health scores, artwork, schedules and provider diagnostics are not copied into production UI unless backed by real API data.

## Included

- shared `AudioLevelMeter` component with an accessible meter role, dBFS readout, muted state and clipping treatment;
- token-driven studio cards, controls, fields and status language;
- explicit three-step readiness model: microphone, private studio, public listener delivery;
- plain-language stages instead of provider names in the primary interface;
- loading and empty states for organisations, channels and broadcasts;
- delayed silent-input guidance and explicit clipping guidance;
- precise `Hear studio audio` terminology for browser playback recovery;
- exact member listener-preview link for the selected broadcast;
- phase-responsive active live-control state;
- protected end-broadcast confirmation;
- prevention of silently closing a live or reconnecting studio;
- keyboard focus trapping, Escape handling and focus restoration;
- desktop, tablet and mobile layouts with mobile-critical controls kept reachable.

## Preserved media and security behaviour

The migration does not alter:

- short-lived LiveKit host credentials;
- microphone-only publishing grants;
- server-side participant and microphone verification;
- contribution and public-delivery readiness gates;
- idempotent broadcast start/end commands;
- 90-second delivery readiness polling;
- provider-secret boundaries;
- safe release of local media after completion.

## Required states represented

- session checking and authentication required;
- no organisations, channels or eligible broadcasts;
- microphone permission unavailable or denied;
- microphone checking and ready;
- no signal detected;
- clipping input;
- private studio connecting and connected;
- browser audio playback blocked;
- public delivery preparing;
- live;
- reconnecting;
- delivery failure with studio audio preserved;
- ended;
- destructive end confirmation.

## Responsive behaviour

- Desktop: setup rail beside the operational workspace.
- Tablet: setup fields use a two-column layout above the operational workspace.
- Mobile: all regions stack, the modal becomes a bottom sheet and live-critical actions remain in a sticky control area.

## Review and validation

Run:

```bash
npm run typecheck
npm run build
```

Review must also cover:

- keyboard traversal and focus restoration;
- microphone permission denied, silent and clipping states;
- live close protection and end confirmation;
- Android Chrome compact layout;
- tablet and desktop layouts;
- confirmation that every displayed value is real or explicitly unavailable.
