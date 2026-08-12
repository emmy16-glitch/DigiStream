const defaultModuleUrl =
  'https://cdn.jsdelivr.net/npm/livekit-client@2.21.0/dist/livekit-client.esm.mjs';

export type LiveKitLocalAudioTrack = {
  readonly mediaStreamTrack: MediaStreamTrack;
  readonly isMuted: boolean;
  mute(): Promise<void>;
  unmute(): Promise<void>;
  setDeviceId(deviceId: ConstrainDOMString): Promise<boolean>;
  stop(): void;
};

export type LiveKitRemoteTrack = {
  readonly kind: string;
  attach(): HTMLMediaElement;
  detach(): HTMLMediaElement[];
};

export type LiveKitRoom = {
  readonly localParticipant: {
    publishTrack(
      track: LiveKitLocalAudioTrack,
      options?: Record<string, unknown>,
    ): Promise<unknown>;
    unpublishTrack(track: LiveKitLocalAudioTrack): Promise<unknown>;
  };
  readonly canPlaybackAudio: boolean;
  connect(url: string, token: string): Promise<unknown>;
  disconnect(): Promise<void>;
  startAudio(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): LiveKitRoom;
};

export type LiveKitModule = {
  Room: {
    new (options?: Record<string, unknown>): LiveKitRoom;
    getLocalDevices(
      kind: MediaDeviceKind,
      requestPermissions?: boolean,
    ): Promise<MediaDeviceInfo[]>;
  };
  RoomEvent: {
    Reconnecting: string;
    Reconnected: string;
    Disconnected: string;
    MediaDevicesChanged: string;
    MediaDevicesError: string;
    TrackSubscribed: string;
    TrackUnsubscribed: string;
    AudioPlaybackStatusChanged: string;
  };
  Track: {
    Kind: { Audio: string };
    Source: { Microphone: string };
  };
  createLocalAudioTrack(options?: {
    autoGainControl?: boolean;
    channelCount?: number;
    deviceId?: ConstrainDOMString | undefined;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    sampleRate?: number;
  }): Promise<LiveKitLocalAudioTrack>;
};

let modulePromise: Promise<LiveKitModule> | null = null;

/** Validates only browser reachability; credentials and lifecycle stay server-authoritative. */
export function browserMediaEndpointProblem(endpoint: string): string | null {
  let url: URL;
  try { url = new URL(endpoint); } catch { return 'The Studio media endpoint returned by the server is invalid.'; }
  if (!['ws:', 'wss:'].includes(url.protocol)) return 'The Studio media endpoint must use a WebSocket address.';
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (window.location.protocol === 'https:' && url.protocol !== 'wss:') {
    return 'Private Studio needs a public wss:// LiveKit address when this page is opened over HTTPS.';
  }
  if (window.location.protocol === 'https:' && loopback) {
    return 'Private Studio is configured with a loopback media address that this phone cannot reach.';
  }
  return null;
}

export function loadLiveKitClient(): Promise<LiveKitModule> {
  if (!modulePromise) {
    const moduleUrl =
      import.meta.env.VITE_LIVEKIT_CLIENT_MODULE_URL ?? defaultModuleUrl;
    modulePromise = import(/* @vite-ignore */ moduleUrl).then(
      (module) => module as LiveKitModule,
    );
  }
  return modulePromise;
}
