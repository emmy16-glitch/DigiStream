export type ListenerPlaybackQualitySample = {
  bufferingEvents: readonly number[];
  observedAt: number;
  playbackStartedAt: number | null;
};

export type ListenerPlaybackQualityEvidence = {
  bufferingEventsInWindow: number;
  observationDurationMs: number;
  unstable: boolean;
};

export const LISTENER_QUALITY_WINDOW_MS = 120_000;
export const LISTENER_QUALITY_MIN_OBSERVATION_MS = 30_000;
export const LISTENER_QUALITY_BUFFERING_THRESHOLD = 3;

export function pruneListenerBufferingEvents(
  events: readonly number[],
  observedAt: number,
  windowMs: number = LISTENER_QUALITY_WINDOW_MS,
): number[] {
  const lowerBound = observedAt - Math.max(0, windowMs);
  return events.filter(
    (eventAt) =>
      Number.isFinite(eventAt) && eventAt >= lowerBound && eventAt <= observedAt,
  );
}

export function listenerPlaybackQualityEvidence({
  bufferingEvents,
  observedAt,
  playbackStartedAt,
}: ListenerPlaybackQualitySample): ListenerPlaybackQualityEvidence {
  const recentEvents = pruneListenerBufferingEvents(bufferingEvents, observedAt);
  const observationDurationMs =
    playbackStartedAt === null || !Number.isFinite(playbackStartedAt)
      ? 0
      : Math.max(0, observedAt - playbackStartedAt);

  return {
    bufferingEventsInWindow: recentEvents.length,
    observationDurationMs,
    unstable:
      observationDurationMs >= LISTENER_QUALITY_MIN_OBSERVATION_MS &&
      recentEvents.length >= LISTENER_QUALITY_BUFFERING_THRESHOLD,
  };
}
