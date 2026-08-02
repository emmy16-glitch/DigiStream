import { expect, test } from '@playwright/test';
import { listenerConnectionPresentation } from '../../apps/web/src/features/listening/listener-connection-presentation';
import {
  LISTENER_QUALITY_BUFFERING_THRESHOLD,
  LISTENER_QUALITY_MIN_OBSERVATION_MS,
  listenerPlaybackQualityEvidence,
  pruneListenerBufferingEvents,
} from '../../apps/web/src/features/listening/listener-playback-quality';

test('playback quality remains stable without enough measured observation', () => {
  const observedAt = 100_000;
  const evidence = listenerPlaybackQualityEvidence({
    bufferingEvents: [92_000, 95_000, 99_000],
    observedAt,
    playbackStartedAt: observedAt - LISTENER_QUALITY_MIN_OBSERVATION_MS + 1,
  });

  expect(evidence.bufferingEventsInWindow).toBe(
    LISTENER_QUALITY_BUFFERING_THRESHOLD,
  );
  expect(evidence.unstable).toBe(false);
});

test('repeated measured buffering marks an established session unstable', () => {
  const observedAt = 200_000;
  const evidence = listenerPlaybackQualityEvidence({
    bufferingEvents: [130_000, 160_000, 190_000],
    observedAt,
    playbackStartedAt: 100_000,
  });

  expect(evidence.bufferingEventsInWindow).toBe(3);
  expect(evidence.observationDurationMs).toBe(100_000);
  expect(evidence.unstable).toBe(true);
});

test('old, future and invalid buffering events cannot affect the result', () => {
  const observedAt = 300_000;
  const events = pruneListenerBufferingEvents(
    [100_000, 180_000, 250_000, 300_001, Number.NaN],
    observedAt,
  );

  expect(events).toEqual([180_000, 250_000]);
  expect(
    listenerPlaybackQualityEvidence({
      bufferingEvents: events,
      observedAt,
      playbackStartedAt: 100_000,
    }).unstable,
  ).toBe(false);
});

test('quality returns to stable after buffering evidence ages out', () => {
  const playbackStartedAt = 100_000;
  expect(
    listenerPlaybackQualityEvidence({
      bufferingEvents: [140_000, 150_000, 160_000],
      observedAt: 170_000,
      playbackStartedAt,
    }).unstable,
  ).toBe(true);

  expect(
    listenerPlaybackQualityEvidence({
      bufferingEvents: pruneListenerBufferingEvents(
        [140_000, 150_000, 160_000],
        300_001,
      ),
      observedAt: 300_001,
      playbackStartedAt,
    }).unstable,
  ).toBe(false);
});

test('measured instability is secondary to active playback failure states', () => {
  expect(
    listenerConnectionPresentation({
      activeProtocol: 'webrtc',
      online: true,
      phase: 'playing',
      playable: true,
      status: 'live',
      unstable: true,
    }).label,
  ).toBe('Unstable connection');

  expect(
    listenerConnectionPresentation({
      activeProtocol: 'webrtc',
      online: true,
      phase: 'buffering',
      playable: true,
      status: 'live',
      unstable: true,
    }).label,
  ).toBe('Buffering');

  expect(
    listenerConnectionPresentation({
      activeProtocol: 'webrtc',
      online: false,
      phase: 'playing',
      playable: true,
      status: 'live',
      unstable: true,
    }).label,
  ).toBe('Offline');
});
