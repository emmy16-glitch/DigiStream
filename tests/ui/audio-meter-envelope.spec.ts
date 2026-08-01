import { expect, test } from '@playwright/test';
import {
  audioLevelFromDecibels,
  createAudioMeterEnvelope,
} from '../../apps/web/src/features/broadcasting/audio-meter';

test('microphone envelope uses fast attack and slower release', () => {
  const attackEnvelope = createAudioMeterEnvelope({
    attackMs: 45,
    releaseMs: 360,
  });
  attackEnvelope.update({ decibels: -60, peak: 0.01, timestampMs: 0 });
  const attacked = attackEnvelope.update({
    decibels: -6,
    peak: 0.5,
    timestampMs: 100,
  });

  const releaseEnvelope = createAudioMeterEnvelope({
    attackMs: 45,
    releaseMs: 360,
  });
  releaseEnvelope.update({ decibels: -6, peak: 0.5, timestampMs: 0 });
  const released = releaseEnvelope.update({
    decibels: -60,
    peak: 0.01,
    timestampMs: 100,
  });

  const attackMovement = attacked.decibels - -60;
  const releaseMovement = -6 - released.decibels;

  expect(attacked.decibels).toBeGreaterThan(-13);
  expect(released.decibels).toBeGreaterThan(-22);
  expect(attackMovement).toBeGreaterThan(releaseMovement * 2.5);
});

test('microphone envelope is time-based instead of frame-count based', () => {
  function readAfter(stepMs: number) {
    const envelope = createAudioMeterEnvelope({ attackMs: 45 });
    envelope.update({ decibels: -60, peak: 0.01, timestampMs: 0 });
    let reading = envelope.update({
      decibels: -12,
      peak: 0.4,
      timestampMs: stepMs,
    });
    for (let timestampMs = stepMs * 2; timestampMs <= 240; timestampMs += stepMs) {
      reading = envelope.update({ decibels: -12, peak: 0.4, timestampMs });
    }
    return reading;
  }

  const sixtyFramesPerSecond = readAfter(16);
  const twentyFiveFramesPerSecond = readAfter(40);

  expect(
    Math.abs(
      sixtyFramesPerSecond.decibels - twentyFiveFramesPerSecond.decibels,
    ),
  ).toBeLessThan(0.35);
});

test('clipping reacts on the first overload peak and remains visible briefly', () => {
  const envelope = createAudioMeterEnvelope({
    clippingThreshold: 0.985,
    clippingHoldMs: 650,
  });

  const overload = envelope.update({
    decibels: -2,
    peak: 0.99,
    timestampMs: 100,
  });
  const held = envelope.update({
    decibels: -18,
    peak: 0.2,
    timestampMs: 500,
  });
  const cleared = envelope.update({
    decibels: -18,
    peak: 0.2,
    timestampMs: 800,
  });

  expect(overload.clipping).toBe(true);
  expect(held.clipping).toBe(true);
  expect(cleared.clipping).toBe(false);
});

test('meter level mapping remains bounded and uses the documented speech range', () => {
  expect(audioLevelFromDecibels(-100)).toBe(0);
  expect(audioLevelFromDecibels(-60)).toBe(0);
  expect(audioLevelFromDecibels(-33)).toBeCloseTo(0.5, 5);
  expect(audioLevelFromDecibels(-6)).toBe(1);
  expect(audioLevelFromDecibels(2)).toBe(1);
});
