# Listener resilience and plain-language connection states

This Phase 6A slice separates listener-facing connection guidance from technical transport diagnostics.

## Listener-facing states

The listener page uses observable browser and player evidence to present:

- **Ready** when a playable broadcast is waiting for the listener to start audio;
- **Stable** only after the player reports active playback;
- **Paused** after an explicit local pause;
- **Buffering** while an established session is stalled;
- **Reconnecting** while bounded automatic recovery is running;
- **Offline** when the browser reports that the device network is unavailable;
- **Unavailable** after recovery is exhausted or the broadcast lifecycle has failed;
- lifecycle-specific Upcoming, Preparing audio, Start delayed, Ended and Cancelled states when no live transport should exist.

These labels do not infer stream health from broadcast metadata alone. A broadcast being `live` makes playback eligible, but the UI does not call the listener connection Stable until the media player reports playback.

## Recovery behavior

DigiStream performs bounded automatic recovery before making manual retry the primary action. The current listener workflow retries a failed playback path up to three times with increasing delay. After those attempts are exhausted, the page presents an Unavailable state and offers Retry playback to request fresh short-lived access.

Device offline and application/API failures remain separate from media-path failures. Returning online refreshes broadcast state and resumes automatic recovery when an active session had already played.

## Technical diagnostics

WebRTC and LL-HLS names are hidden from the primary status copy. They remain available in a collapsed **Technical details** disclosure for support and debugging.

The disclosure may show:

- the selected transport or automatic selection state;
- the internal playback phase;
- the current broadcast presentation state;
- the latest safe error summary.

Signed playback URLs, tokens, object-storage keys and credentials must never appear in diagnostics.

## Mobile controls

On narrow mobile screens DigiStream keeps the primary play/pause action and mute control visible while collapsing the full volume slider. Listeners can still use device volume controls, and wider screens retain the precise in-page slider.

## Validation requirements

- Plain-language state mapping tests for stable, buffering, reconnecting, offline, unavailable and scheduled states.
- Browser checks that protocol names remain inside the collapsed diagnostics disclosure.
- Mobile checks that mute remains visible while the full volume slider is hidden.
- Existing lifecycle, call-in, replay and responsive regressions must remain green.
