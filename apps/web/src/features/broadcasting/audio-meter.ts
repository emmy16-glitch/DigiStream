export type AudioMeterReading = {
  level: number;
  peak: number;
  decibels: number;
  clipping: boolean;
};

export type AudioMeterController = {
  stop(): void;
};

export type AudioMeterEnvelopeOptions = {
  attackMs?: number;
  releaseMs?: number;
  clippingThreshold?: number;
  clippingHoldMs?: number;
  floorDecibels?: number;
};

export type AudioMeterEnvelopeSample = {
  decibels: number;
  peak: number;
  timestampMs: number;
};

export type AudioMeterEnvelope = {
  update(sample: AudioMeterEnvelopeSample): AudioMeterReading;
  reset(): void;
};

const DEFAULT_ATTACK_MS = 45;
const DEFAULT_RELEASE_MS = 360;
const DEFAULT_CLIPPING_THRESHOLD = 0.985;
const DEFAULT_CLIPPING_HOLD_MS = 650;
const DEFAULT_FLOOR_DECIBELS = -100;
const METER_FLOOR_DECIBELS = -60;
const METER_CEILING_DECIBELS = -6;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function positiveDuration(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

export function audioLevelFromDecibels(decibels: number): number {
  const finiteDecibels = Number.isFinite(decibels)
    ? decibels
    : DEFAULT_FLOOR_DECIBELS;
  return clamp(
    (finiteDecibels - METER_FLOOR_DECIBELS) /
      (METER_CEILING_DECIBELS - METER_FLOOR_DECIBELS),
    0,
    1,
  );
}

export function createAudioMeterEnvelope(
  options: AudioMeterEnvelopeOptions = {},
): AudioMeterEnvelope {
  const attackMs = positiveDuration(options.attackMs, DEFAULT_ATTACK_MS);
  const releaseMs = positiveDuration(options.releaseMs, DEFAULT_RELEASE_MS);
  const clippingHoldMs = positiveDuration(
    options.clippingHoldMs,
    DEFAULT_CLIPPING_HOLD_MS,
  );
  const clippingThreshold = clamp(
    options.clippingThreshold ?? DEFAULT_CLIPPING_THRESHOLD,
    0,
    1,
  );
  const floorDecibels = Math.min(
    0,
    Number.isFinite(options.floorDecibels)
      ? (options.floorDecibels as number)
      : DEFAULT_FLOOR_DECIBELS,
  );

  let smoothedDecibels = floorDecibels;
  let lastTimestampMs: number | null = null;
  let clippingUntilMs = Number.NEGATIVE_INFINITY;

  return {
    update(sample) {
      const timestampMs = Number.isFinite(sample.timestampMs)
        ? sample.timestampMs
        : lastTimestampMs ?? 0;
      const rawDecibels = clamp(
        Number.isFinite(sample.decibels) ? sample.decibels : floorDecibels,
        floorDecibels,
        0,
      );
      const peak = clamp(Number.isFinite(sample.peak) ? sample.peak : 0, 0, 1);

      if (lastTimestampMs === null || timestampMs < lastTimestampMs) {
        smoothedDecibels = rawDecibels;
      } else {
        const elapsedMs = clamp(timestampMs - lastTimestampMs, 0, 1_000);
        const timeConstantMs =
          rawDecibels >= smoothedDecibels ? attackMs : releaseMs;
        const blend = elapsedMs === 0
          ? 0
          : 1 - Math.exp(-elapsedMs / timeConstantMs);
        smoothedDecibels += (rawDecibels - smoothedDecibels) * blend;
      }

      if (peak >= clippingThreshold) {
        clippingUntilMs = timestampMs + clippingHoldMs;
      }

      lastTimestampMs = timestampMs;
      return {
        level: audioLevelFromDecibels(smoothedDecibels),
        peak,
        decibels: smoothedDecibels,
        clipping:
          peak >= clippingThreshold || timestampMs < clippingUntilMs,
      };
    },
    reset() {
      smoothedDecibels = floorDecibels;
      lastTimestampMs = null;
      clippingUntilMs = Number.NEGATIVE_INFINITY;
    },
  };
}

export function startAudioMeter(
  track: MediaStreamTrack,
  onReading: (reading: AudioMeterReading) => void,
): AudioMeterController {
  const AudioContextClass = window.AudioContext;
  const context = new AudioContextClass();
  const source = context.createMediaStreamSource(new MediaStream([track]));
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);

  const samples = new Float32Array(analyser.fftSize);
  const envelope = createAudioMeterEnvelope();
  let animationFrame = 0;
  let stopped = false;

  const read = (timestampMs: number) => {
    if (stopped) return;
    analyser.getFloatTimeDomainData(samples);
    let sumSquares = 0;
    let peak = 0;
    for (const sample of samples) {
      sumSquares += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    const decibels = rms > 0 ? 20 * Math.log10(rms) : DEFAULT_FLOOR_DECIBELS;
    onReading(envelope.update({ decibels, peak, timestampMs }));
    animationFrame = window.requestAnimationFrame(read);
  };

  animationFrame = window.requestAnimationFrame(read);
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      window.cancelAnimationFrame(animationFrame);
      envelope.reset();
      source.disconnect();
      analyser.disconnect();
      void context.close();
    },
  };
}
