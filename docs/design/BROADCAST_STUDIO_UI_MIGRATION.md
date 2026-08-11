# Broadcast Studio UI migration

This slice migrates the existing creator Broadcast Studio and active live-control states onto the shared DigiStream hybrid design system while preserving the existing authenticated API, LiveKit contribution, readiness verification and OvenMediaEngine delivery behaviour.

## Current design authority

For Studio UI implementation, use this order:

1. `DIGISTREAM_UI_CONSTITUTION.md`;
2. `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
3. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
4. `DESIGN_TOKENS.md`;
5. `UI_FOUNDATION_IMPLEMENTATION.md`;
6. relevant Studio reference screens for composition/journey intent;
7. `CREATOR_BROADCAST_STUDIO.md` for security, readiness and failure behaviour.

The older `DIGISTREAM_PRODUCT_DESIGN_BIBLE.md` remains useful for product intent where compatible, but any legacy dark/emerald visual guidance inside it is superseded by the current Constitution.

External pattern reference: `https://beautiful-ui-five.vercel.app/`

## Studio hybrid visual rule

- preserve the cream dotted DigiStream creator shell/outer canvas;
- allow the central Studio workspace to use a large solid white/warm-white/neutral surface to reduce visual noise;
- use dusty pink as the brand anchor;
- use supporting accent tints sparingly for context grouping;
- keep live/success/warning/danger/info colours semantic;
- adapt Beautiful UI Task Rows, Loading State, Context Cards, Tool Chips and Approval Card patterns where they fit real Studio state;
- do not apply heavy hard-offset shadows to every readiness/control block;
- do not turn Studio into an AI-agent interface.

## Included responsibilities

- accessible `AudioLevelMeter` with measured dBFS readout, muted state and clipping treatment;
- token-driven Studio panels, controls, fields and status language;
- explicit readiness model separating microphone, private Studio and public listener delivery;
- plain-language stages rather than provider names in the primary interface;
- loading/empty states for organisations, channels and broadcasts;
- delayed silent-input guidance and explicit clipping guidance;
- precise `Hear studio audio` terminology for browser playback recovery;
- exact member listener-preview link for the selected broadcast;
- phase-responsive active live-control state;
- protected end-broadcast confirmation;
- prevention of silently closing a live or reconnecting Studio;
- keyboard focus trapping, Escape handling and focus restoration;
- desktop/tablet/mobile layouts with mobile-critical controls reachable.

## Beautiful UI pattern mapping

### Task Rows

Use for real readiness/recovery stages such as:

```text
Microphone              Ready
Private Studio          Connected
Public delivery         Preparing
```

or during failure:

```text
Microphone              Ready
Private Studio          Connected
Public delivery         Reconnecting
```

Do not fabricate stages or percentages.

### Loading State

Use for real asynchronous waits such as connection, permission/device discovery, delivery preparation or authoritative lifecycle command completion.

### Context Cards

Use for compact selected organisation/channel/broadcast context and secondary technical details.

### Tool Chips

Use only for secondary diagnostics such as selected microphone/transport/recovery detail. Provider/infrastructure noise should not dominate the normal creator UI.

### Approval Card / confirmation

Use for live-critical/destructive decisions such as ending a broadcast. Use consequence-specific copy and explicit action labels.

## Preserved media and security behaviour

The migration does not alter:

- short-lived LiveKit host credentials;
- microphone-only publishing grants;
- server-side participant and microphone verification;
- contribution and public-delivery readiness gates;
- idempotent broadcast start/end commands;
- delivery readiness polling/reconciliation;
- provider-secret boundaries;
- safe release of local media after completion.

## Required states represented

- session checking and authentication required;
- no organisations/channels/eligible broadcasts;
- microphone permission unavailable/denied;
- microphone checking/ready;
- no signal detected;
- clipping input;
- private Studio connecting/connected;
- browser audio playback blocked;
- public delivery preparing;
- live;
- reconnecting;
- delivery failure with private Studio audio preserved;
- ended;
- destructive end confirmation.

## Responsive behaviour

- Desktop: compact setup/context region beside or above the operational workspace according to available width.
- Tablet: controls reorganize without hiding readiness hierarchy.
- Mobile: regions stack/progressively disclose; live-critical action/state remain reachable.
- Short-height landscape: critical state/actions remain above fixed/sticky obstruction.
- Virtual keyboard: does not hide any active form field that Studio exposes.

## Colour behavior

The cream/dotted shell provides identity. Central Studio panels should usually remain neutral for concentration.

Supporting accent colours are optional and secondary. A lavender/sky/mint/amber tint never replaces actual live/success/warning/danger semantics.

## Review and validation

Run applicable checks including:

```bash
npm run typecheck
npm run build
```

Also cover:

- relevant unit/API tests;
- Studio Playwright acceptance;
- keyboard traversal/focus restoration;
- microphone permission denied/silent/clipping states;
- live close protection/end confirmation;
- Android Chrome compact layout;
- short-height landscape;
- Android desktop-site/zoom coverage where CI requires it;
- confirmation that every displayed value/state is real or explicitly unavailable.
