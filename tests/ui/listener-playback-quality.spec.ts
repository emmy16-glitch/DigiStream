import { expect, test } from '@playwright/test';
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
