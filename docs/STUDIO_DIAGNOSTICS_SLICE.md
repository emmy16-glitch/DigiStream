# Phase 6A Studio diagnostics slice

This slice fixes the first confirmed root cause behind the generic **Studio action failed** alert and replaces the microphone meter's ambiguous labels with explicit measured states and recovery guidance.

## Root cause fixed

The creator UI allowed a draft broadcast to be selected and prepared in the private Studio. The contribution-token service, however, rejected draft broadcasts. The only UI operation that moved a draft into `starting` was **Go live**, while **Go live** required an existing private Studio connection.

That created a circular workflow:

1. join private Studio;
2. contribution token rejects the draft;
3. Go live cannot run without the private Studio connection;
4. the creator receives a generic failure instead of a recoverable path.

Private contribution access is now permitted for `draft`, `scheduled`, `starting`, `live` and `reconnecting` broadcasts. Public contribution readiness remains restricted to `starting`, `live` and `reconnecting`, so opening a private Studio for a draft does not make public delivery live or bypass lifecycle commands.

## Microphone state model

The Studio classifies the selected input using measured dBFS, persistent silence, mute state and the media-track lifecycle:

- **Not tested** — no microphone track has been opened.
- **Checking** — permission or a stable signal measurement is still pending.
- **No signal** — the measured input remains at or below `-60 dBFS` for at least four seconds.
- **Quiet** — audio is present below `-36 dBFS`.
- **Good** — the signal is between `-36 dBFS` and `-12 dBFS`.
- **Loud** — the signal is above `-12 dBFS` without clipping.
- **Clipping** — repeated near-full-scale peaks or a reading at or above `-1 dBFS`.
- **Muted** — the published local microphone track is muted.
- **Device disconnected** — the active track ended or the selected device disappeared from the browser's input list.

No-signal, clipping, muted, disconnected, untested and checking states block **Go live**. Quiet, good and loud states remain honest warnings or ready states without silently changing gain.

## Device lifecycle

The Studio listens for both the active media track's `ended` event and browser `devicechange` events. A disconnected or removed microphone:

- stops being treated as ready;
- produces a persistent device-disconnected state;
- blocks public delivery;
- shows direct recovery guidance;
- removes track and browser event listeners during cleanup or device replacement.

## Failure diagnostics

The generic failure title is replaced with the actual failed stage, including:

- creator session;
- workspace data;
- Studio software loading;
- microphone permission or device access;
- contribution authorisation;
- private Studio connection;
- microphone publication;
- broadcast lifecycle transition;
- contribution verification;
- public delivery start or verification;
- Studio playback;
- safe broadcast end.

For API failures the alert preserves the error code, HTTP status and server request ID. The creator receives stage-specific recovery guidance instead of provider credentials or an undifferentiated error.

## Automated coverage

The API contribution tests now prove that:

- an authorised host can receive private contribution credentials for a draft broadcast;
- tenant and role isolation remain enforced;
- completed broadcasts are still rejected;
- contribution readiness remains tied to an active lifecycle state.

`tests/ui/studio-diagnostics.spec.ts` verifies:

- every measured microphone classification boundary;
- which microphone states block public delivery;
- preservation of diagnostic stage, API code, HTTP status and request ID;
- browser microphone-permission and device-disconnection recovery guidance.

## Deliberate boundary

Automated tests cannot prove physical microphone quality, operating-system gain, audible monitoring, real LiveKit connectivity or OvenMediaEngine public delivery. Those remain manual checks in an HTTPS Codespace or production-like environment with the media services running.
