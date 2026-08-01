# Studio microphone meter envelope

This slice completes the Phase 6A requirement for a microphone meter with fast attack, slower release and immediate clipping peaks.

## Behaviour

The browser analyser still measures the real time-domain microphone samples. DigiStream now applies its own time-based display envelope after calculating RMS dBFS and the absolute sample peak.

- Attack time: `45 ms`
- Release time: `360 ms`
- Clipping threshold: `0.985` absolute sample amplitude
- Clipping visibility hold: `650 ms`
- Display range: `-60 dBFS` to `-6 dBFS`
- Measurement floor: `-100 dBFS`

A louder reading therefore moves the visible meter quickly, while a falling signal decays more slowly instead of flickering between adjacent states. The calculation uses elapsed time rather than a fixed number of animation frames, so equivalent audio produces comparable movement on devices with different frame rates.

Clipping is raised on the first near-full-scale peak. It remains visible briefly after the peak so the creator can notice and correct the overload. The hold affects only the warning presentation; DigiStream does not change microphone gain automatically.

## Contract and boundaries

The existing Studio contract remains unchanged:

- `level` is the bounded visual meter value;
- `decibels` is the smoothed dBFS value used by the explicit microphone-state model;
- `peak` is the immediate measured sample peak;
- `clipping` is the immediate-and-held overload state.

The change does not alter LiveKit publication, device selection, microphone permission, contribution readiness or public delivery authorization.

## Automated verification

`tests/ui/audio-meter-envelope.spec.ts` verifies:

- fast attack compared with release;
- slower release after a signal falls;
- comparable results across different simulated frame rates;
- clipping on the first overload peak;
- temporary clipping visibility after the overload ends;
- bounded dBFS-to-meter level mapping.

Physical microphone quality, operating-system gain, acoustic feedback and device-specific audio processing still require manual browser testing.
