export type PlaybackTelemetryDescriptor = {
  sessionId: string;
  token: string;
  endpoint: string;
  heartbeatIntervalMs: number;
};

type TelemetryEvent =
  | 'started'
  | 'heartbeat'
  | 'paused'
  | 'buffering'
  | 'source_changed'
  | 'error'
  | 'ended';

type TelemetryProtocol = 'webrtc' | 'llhls';

type TelemetryPlayer = {
  on(event: string, listener: (data?: unknown) => void): unknown;
  getCurrentSource(): { type?: string } | null;
  remove(): void;
  stop(): void;
};

type DescriptorEnvelope = {
  telemetry?: unknown;
};

let pendingDescriptor: PlaybackTelemetryDescriptor | null = null;

function descriptorFrom(value: unknown, apiBaseUrl: string): PlaybackTelemetryDescriptor | null {
  if (!value || typeof value !== 'object') return null;
  const envelope = value as DescriptorEnvelope;
  if (!envelope.telemetry || typeof envelope.telemetry !== 'object') return null;
  const telemetry = envelope.telemetry as Record<string, unknown>;
  if (
    typeof telemetry.sessionId !== 'string' ||
    typeof telemetry.token !== 'string' ||
    typeof telemetry.endpoint !== 'string' ||
    typeof telemetry.heartbeatIntervalMs !== 'number' ||
    telemetry.heartbeatIntervalMs < 5_000 ||
    telemetry.heartbeatIntervalMs > 60_000
  ) {
    return null;
  }
  return {
    sessionId: telemetry.sessionId,
    token: telemetry.token,
    endpoint: `${apiBaseUrl}${telemetry.endpoint}`,
    heartbeatIntervalMs: telemetry.heartbeatIntervalMs,
  };
}

export function capturePlaybackTelemetryDescriptor(
  payload: unknown,
  apiBaseUrl: string,
): void {
  const descriptor = descriptorFrom(payload, apiBaseUrl);
  if (descriptor) pendingDescriptor = descriptor;
}

function sourceProtocol(player: TelemetryPlayer): TelemetryProtocol | null {
  const type = player.getCurrentSource()?.type;
  if (type === 'webrtc') return 'webrtc';
  if (type === 'hls') return 'llhls';
  return null;
}

export function instrumentPlaybackTelemetry<T extends TelemetryPlayer>(player: T): T {
  const descriptor = pendingDescriptor;
  pendingDescriptor = null;
  if (!descriptor) return player;

  let heartbeatTimer: number | null = null;
  let ended = false;
  let playing = false;
  let errorReportedSinceProgress = false;

  const send = (event: TelemetryEvent, keepalive = false) => {
    if (ended && event !== 'ended') return;
    const protocol = sourceProtocol(player);
    const body = JSON.stringify({
      token: descriptor.token,
      event,
      ...(protocol ? { protocol } : {}),
    });
    void fetch(descriptor.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      credentials: 'include',
      keepalive,
    }).catch(() => {
      // Telemetry must never interrupt listener playback or recovery.
    });
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer !== null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatTimer = window.setInterval(
      () => send('heartbeat'),
      descriptor.heartbeatIntervalMs,
    );
  };

  const reportError = () => {
    playing = false;
    stopHeartbeat();
    if (errorReportedSinceProgress) return;
    errorReportedSinceProgress = true;
    send('error');
  };

  const finish = (keepalive = false) => {
    if (ended) return;
    ended = true;
    playing = false;
    stopHeartbeat();
    send('ended', keepalive);
  };

  player.on('stateChanged', (raw) => {
    const state = raw && typeof raw === 'object'
      ? (raw as { newstate?: unknown }).newstate
      : undefined;
    if (state === 'playing') {
      errorReportedSinceProgress = false;
      playing = true;
      send('started');
      startHeartbeat();
      return;
    }
    if (state === 'paused') {
      playing = false;
      errorReportedSinceProgress = true;
      stopHeartbeat();
      send('paused');
      return;
    }
    if ((state === 'loading' || state === 'stalled') && playing) {
      playing = false;
      stopHeartbeat();
      send('buffering');
      return;
    }
    if (state === 'complete') finish();
    if (state === 'error') reportError();
  });
  player.on('sourceChanged', () => send('source_changed'));
  player.on('error', reportError);

  const originalRemove = player.remove.bind(player);
  player.remove = (() => {
    finish(true);
    originalRemove();
  }) as T['remove'];

  const originalStop = player.stop.bind(player);
  player.stop = (() => {
    finish(true);
    originalStop();
  }) as T['stop'];

  const pageHide = () => finish(true);
  window.addEventListener('pagehide', pageHide, { once: true });

  return player;
}
