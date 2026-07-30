export type AudioMeterReading = {
  level: number;
  peak: number;
  decibels: number;
  clipping: boolean;
};

export type AudioMeterController = {
  stop(): void;
};

export function startAudioMeter(
  track: MediaStreamTrack,
  onReading: (reading: AudioMeterReading) => void,
): AudioMeterController {
  const AudioContextClass = window.AudioContext;
  const context = new AudioContextClass();
  const source = context.createMediaStreamSource(new MediaStream([track]));
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.72;
  source.connect(analyser);

  const samples = new Float32Array(analyser.fftSize);
  let animationFrame = 0;
  let clippedFrames = 0;
  let stopped = false;

  const read = () => {
    if (stopped) return;
    analyser.getFloatTimeDomainData(samples);
    let sumSquares = 0;
    let peak = 0;
    for (const sample of samples) {
      sumSquares += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    const decibels = rms > 0 ? 20 * Math.log10(rms) : -100;
    const level = Math.min(1, Math.max(0, (decibels + 60) / 54));
    clippedFrames = peak >= 0.985 ? clippedFrames + 1 : Math.max(0, clippedFrames - 1);
    onReading({
      level,
      peak,
      decibels,
      clipping: clippedFrames >= 3,
    });
    animationFrame = window.requestAnimationFrame(read);
  };

  animationFrame = window.requestAnimationFrame(read);
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      window.cancelAnimationFrame(animationFrame);
      source.disconnect();
      analyser.disconnect();
      void context.close();
    },
  };
}
