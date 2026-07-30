const defaultOvenPlayerUrl =
  'https://cdn.jsdelivr.net/npm/ovenplayer@0.10.52/dist/ovenplayer.js';
const defaultHlsUrl =
  'https://cdn.jsdelivr.net/npm/hls.js@1.6.16/dist/hls.min.js';

export type OvenPlayerSource = {
  type: 'webrtc' | 'hls';
  file: string;
  label: string;
};

export type OvenPlayerStateChanged = {
  prevstate?: string;
  newstate?: string;
};

export type OvenPlayerInstance = {
  on(event: string, listener: (data?: unknown) => void): OvenPlayerInstance;
  off(event: string, listener?: (data?: unknown) => void): OvenPlayerInstance;
  play(): void;
  pause(): void;
  stop(): void;
  remove(): void;
  getState(): string;
  getCurrentSource(): OvenPlayerSource | null;
  setVolume(volume: number): void;
  getVolume(): number;
  setMute(muted: boolean): boolean;
  getMute(): boolean;
};

type OvenPlayerGlobal = {
  create(
    container: string | HTMLElement,
    options: {
      autoFallback?: boolean;
      autoStart?: boolean;
      controls?: boolean;
      disableSeekUI?: boolean;
      expandFullScreenUI?: boolean;
      loop?: boolean;
      mute?: boolean;
      showBigPlayButton?: boolean;
      sources: OvenPlayerSource[];
      title?: string;
      volume?: number;
      webrtcConfig?: {
        connectionTimeout?: number;
        timeoutMaxRetry?: number;
      };
    },
  ): OvenPlayerInstance;
};

declare global {
  interface Window {
    OvenPlayer?: OvenPlayerGlobal;
    Hls?: unknown;
  }
}

const scriptPromises = new Map<string, Promise<void>>();

function loadScript(url: string, globalReady: () => boolean): Promise<void> {
  if (globalReady()) return Promise.resolve();
  const existing = scriptPromises.get(url);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', () => {
      if (globalReady()) resolve();
      else reject(new Error(`The player library loaded from ${url} but did not initialize.`));
    });
    script.addEventListener('error', () => {
      scriptPromises.delete(url);
      reject(new Error(`The player library could not be loaded from ${url}.`));
    });
    document.head.append(script);
  });

  scriptPromises.set(url, promise);
  return promise;
}

export async function loadOvenPlayer(): Promise<OvenPlayerGlobal> {
  const hlsUrl = import.meta.env.VITE_HLS_CLIENT_URL ?? defaultHlsUrl;
  const ovenPlayerUrl =
    import.meta.env.VITE_OVENPLAYER_URL ?? defaultOvenPlayerUrl;

  await loadScript(hlsUrl, () => Boolean(window.Hls));
  await loadScript(ovenPlayerUrl, () => Boolean(window.OvenPlayer));

  if (!window.OvenPlayer) {
    throw new Error('OvenPlayer is unavailable after loading its browser bundle.');
  }
  return window.OvenPlayer;
}
