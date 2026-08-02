import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  Broadcast,
  BroadcastResponse,
  ChannelListResponse,
  OrganisationListResponse,
  PublicBroadcast,
  PublicBroadcastResponse,
} from '@digistream/contracts';
import { Icon } from '../../design-system/Icon';
import { ApiClientError, apiRequest } from '../../lib/api-client';
import {
  isOverdueBroadcast,
  presentationLabel,
  presentationStatus,
} from '../../lib/broadcast-lifecycle';
import {
  listenerArtLabel,
  listenerCalendarHref,
  listenerCountdown,
} from './listener-lifecycle-presentation';
import { listenerConnectionPresentation } from './listener-connection-presentation';
import {
  listenerPlaybackQualityEvidence,
  pruneListenerBufferingEvents,
} from './listener-playback-quality';
import type { ListenerRoute } from './listener-route';
import {
  loadOvenPlayer,
  type OvenPlayerInstance,
  type OvenPlayerSource,
  type OvenPlayerStateChanged,
} from './oven-player';
import './listener-playback.css';
import './listener-lifecycle-trust.css';
import './listener-resilience.css';

type PlaybackResponse = {
  playback: {
    provider: 'ovenmediaengine';
    expiresAt: string;
    sources: Array<{
      protocol: 'webrtc' | 'llhls';
      url: string;
    }>;
  };
};

type ListenerBroadcast = {
  id: string;
  title: string;
  description: string | null;
  status: Broadcast['status'];
  scheduledStartAt: string | null;
  liveStartedAt: string | null;
  endedAt: string | null;
  organisation: {
    id: string;
    name: string;
    slug: string | null;
  };
  channel: {
    id: string;
    name: string;
    slug: string | null;
    category: string | null;
  };
};

type PlaybackPhase =
  | 'idle'
  | 'waiting'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'reconnecting'
  | 'ended'
  | 'error';

type ListenerBroadcastPageProps = {
  route: Extract<ListenerRoute, { kind: 'public-broadcast' | 'member-broadcast' }>;
};

const playableStatuses = new Set<Broadcast['status']>([
  'live',
  'reconnecting',
  'ending',
]);

function readableError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Playback could not be started.';
}

function formatDate(value: string | null): string {
  if (!value) return 'Time not announced';
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function normalisePublicBroadcast(broadcast: PublicBroadcast): ListenerBroadcast {
  return {
    id: broadcast.id,
    title: broadcast.title,
    description: broadcast.description,
    status: broadcast.status,
    scheduledStartAt: broadcast.scheduledStartAt,
    liveStartedAt: broadcast.liveStartedAt,
    endedAt: broadcast.endedAt,
    organisation: {
      id: broadcast.organisation.id,
      name: broadcast.organisation.name,
      slug: broadcast.organisation.slug,
    },
    channel: {
      id: broadcast.channel.id,
      name: broadcast.channel.name,
      slug: broadcast.channel.slug,
      category: broadcast.channel.category,
    },
  };
}

function statusCopy(broadcast: ListenerBroadcast | null): string {
  if (!broadcast) return 'Loading broadcast details…';
  if (broadcast.status === 'scheduled') {
    return isOverdueBroadcast(broadcast.status, broadcast.scheduledStartAt)
      ? 'The scheduled start time passed before this broadcast went live.'
      : `Scheduled for ${formatDate(broadcast.scheduledStartAt)}.`;
  }
  if (broadcast.status === 'starting') {
    return 'The creator is connecting the live audio path.';
  }
  if (broadcast.status === 'live') return 'Live audio is ready.';
  if (broadcast.status === 'reconnecting') {
    return 'The live source is reconnecting. Playback will recover automatically.';
  }
  if (broadcast.status === 'ending') return 'The broadcast is ending.';
  if (broadcast.status === 'completed') return 'This live broadcast has ended.';
  if (broadcast.status === 'cancelled') return 'This broadcast was cancelled.';
  if (broadcast.status === 'failed') return 'The broadcast ended because of a media failure.';
  return 'This broadcast is not available to listeners yet.';
}

export function ListenerBroadcastPage({ route }: ListenerBroadcastPageProps) {
  const [broadcast, setBroadcast] = useState<ListenerBroadcast | null>(null);
  const [phase, setPhase] = useState<PlaybackPhase>('loading');
  const [message, setMessage] = useState('Loading broadcast details…');
  const [error, setError] = useState('');
  const [activeProtocol, setActiveProtocol] = useState<'webrtc' | 'llhls' | null>(
    null,
  );
  const [volume, setVolumeState] = useState(() => {
    const stored = Number.parseInt(localStorage.getItem('digistream-listener-volume') ?? '82', 10);
    return Number.isFinite(stored) ? Math.min(100, Math.max(0, stored)) : 82;
  });
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signedInRequired, setSignedInRequired] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [clockNow, setClockNow] = useState(() => Date.now());

  const playerRef = useRef<OvenPlayerInstance | null>(null);
  const playbackRef = useRef<PlaybackResponse['playback'] | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const recoveryTimerRef = useRef<number | null>(null);
  const recoveryAttemptsRef = useRef(0);
  const hasPlayedRef = useRef(false);
  const playbackStartedAtRef = useRef<number | null>(null);
  const bufferingEventsRef = useRef<number[]>([]);
  const lastPlayerStateRef = useRef<string | null>(null);
  const [unstableConnection, setUnstableConnection] = useState(false);
  const mountedRef = useRef(true);
  const playerContainerIdRef = useRef(
    `digistream-listener-${Math.random().toString(36).slice(2, 12)}`,
  );

  const isMemberRoute = route.kind === 'member-broadcast';
  const isPlayable = broadcast ? playableStatuses.has(broadcast.status) : false;
  const shareUrl = window.location.href;

  const metadataPath = useMemo(() => {
    if (route.kind === 'public-broadcast') {
      return `/api/v1/broadcasts/${encodeURIComponent(
        route.organisationSlug,
      )}/${encodeURIComponent(route.channelSlug)}/${encodeURIComponent(
        route.broadcastSlug,
      )}`;
    }
    return `/api/v1/organisations/${encodeURIComponent(
      route.organisationId,
    )}/broadcasts/${encodeURIComponent(route.broadcastId)}`;
  }, [route]);

  const playbackPath = useMemo(() => {
    if (route.kind === 'public-broadcast') {
      return `${metadataPath}/playback`;
    }
    return `/api/v1/organisations/${encodeURIComponent(
      route.organisationId,
    )}/broadcasts/${encodeURIComponent(route.broadcastId)}/playback`;
  }, [metadataPath, route]);

  const resetPlaybackQuality = useCallback(() => {
    playbackStartedAtRef.current = null;
    bufferingEventsRef.current = [];
    lastPlayerStateRef.current = null;
    setUnstableConnection(false);
  }, []);

  const updatePlaybackQuality = useCallback((observedAt = Date.now()) => {
    bufferingEventsRef.current = pruneListenerBufferingEvents(
      bufferingEventsRef.current,
      observedAt,
    );
    setUnstableConnection(
      listenerPlaybackQualityEvidence({
        bufferingEvents: bufferingEventsRef.current,
        observedAt,
        playbackStartedAt: playbackStartedAtRef.current,
      }).unstable,
    );
  }, []);

  const removePlayer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (recoveryTimerRef.current !== null) {
      window.clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    const player = playerRef.current;
    playerRef.current = null;
    resetPlaybackQuality();
    try {
      player?.remove();
    } catch {
      // OvenPlayer may already have released its transport after a fatal error.
    }
  }, [resetPlaybackQuality]);

  const loadMetadata = useCallback(async (): Promise<ListenerBroadcast> => {
    setSignedInRequired(false);
    if (route.kind === 'public-broadcast') {
      const response = await apiRequest<PublicBroadcastResponse>(metadataPath);
      const normalised = normalisePublicBroadcast(response.broadcast);
      if (mountedRef.current) setBroadcast(normalised);
      return normalised;
    }

    try {
      const response = await apiRequest<BroadcastResponse>(metadataPath);
      const [organisations, channels] = await Promise.all([
        apiRequest<OrganisationListResponse>('/api/v1/organisations'),
        apiRequest<ChannelListResponse>(
          `/api/v1/organisations/${encodeURIComponent(
            route.organisationId,
          )}/channels`,
        ),
      ]);
      const organisation = organisations.organisations.find(
        (item) => item.id === route.organisationId,
      );
      const channel = channels.channels.find(
        (item) => item.id === response.broadcast.channelId,
      );
      const normalised: ListenerBroadcast = {
        id: response.broadcast.id,
        title: response.broadcast.title,
        description: response.broadcast.description,
        status: response.broadcast.status,
        scheduledStartAt: response.broadcast.scheduledStartAt,
        liveStartedAt: response.broadcast.liveStartedAt,
        endedAt: response.broadcast.endedAt,
        organisation: {
          id: route.organisationId,
          name: organisation?.name ?? 'Private organisation',
          slug: organisation?.slug ?? null,
        },
        channel: {
          id: response.broadcast.channelId,
          name: channel?.name ?? 'Private channel',
          slug: channel?.slug ?? null,
          category: channel?.category ?? null,
        },
      };
      if (mountedRef.current) setBroadcast(normalised);
      return normalised;
    } catch (requestError) {
      if (requestError instanceof ApiClientError && requestError.status === 401) {
        setSignedInRequired(true);
      }
      throw requestError;
    }
  }, [metadataPath, route]);

  const fetchPlayback = useCallback(async () => {
    const response = await apiRequest<PlaybackResponse>(playbackPath);
    playbackRef.current = response.playback;

    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    const expiresIn = new Date(response.playback.expiresAt).getTime() - Date.now();
    refreshTimerRef.current = window.setTimeout(() => {
      void apiRequest<PlaybackResponse>(playbackPath)
        .then((fresh) => {
          playbackRef.current = fresh.playback;
        })
        .catch(() => {
          // Active sessions can continue; retry will request a new descriptor if needed.
        });
    }, Math.max(10_000, expiresIn - 30_000));

    return response.playback;
  }, [playbackPath]);

  const scheduleRecovery = useCallback(() => {
    if (!navigator.onLine || recoveryTimerRef.current !== null) return;
    if (recoveryAttemptsRef.current >= 3) {
      setPhase('error');
      setMessage('Automatic recovery stopped. Tap retry to request fresh playback access.');
      return;
    }
    recoveryAttemptsRef.current += 1;
    setPhase('reconnecting');
    setMessage(`Reconnecting playback… attempt ${recoveryAttemptsRef.current} of 3.`);
    recoveryTimerRef.current = window.setTimeout(() => {
      recoveryTimerRef.current = null;
      void startPlayback(true);
    }, 1_500 * recoveryAttemptsRef.current);
  }, []);

  const createPlayer = useCallback(
    async (playback: PlaybackResponse['playback'], autoPlay: boolean) => {
      removePlayer();
      const OvenPlayer = await loadOvenPlayer();
      const sources: OvenPlayerSource[] = playback.sources
        .slice()
        .sort((left, right) =>
          left.protocol === right.protocol ? 0 : left.protocol === 'webrtc' ? -1 : 1,
        )
        .map((source) => ({
          type: source.protocol === 'webrtc' ? 'webrtc' : 'hls',
          file: source.url,
          label:
            source.protocol === 'webrtc'
              ? 'WebRTC · ultra-low latency'
              : 'LL-HLS · reliable fallback',
        }));

      if (!sources.length) throw new Error('The server returned no playable sources.');

      const player = OvenPlayer.create(playerContainerIdRef.current, {
        autoFallback: true,
        autoStart: false,
        controls: false,
        disableSeekUI: true,
        expandFullScreenUI: false,
        loop: false,
        mute: muted,
        showBigPlayButton: false,
        sources,
        title: broadcast?.title ?? 'DigiStream live audio',
        volume,
        webrtcConfig: {
          connectionTimeout: 8_000,
          timeoutMaxRetry: 1,
        },
      });
      playerRef.current = player;

      player.on('ready', () => {
        if (!mountedRef.current) return;
        setPhase('ready');
        setMessage('Playback is ready.');
        const source = player.getCurrentSource();
        setActiveProtocol(source?.type === 'webrtc' ? 'webrtc' : source ? 'llhls' : null);
        if (autoPlay) player.play();
      });
      player.on('stateChanged', (raw) => {
        if (!mountedRef.current) return;
        const state = raw as OvenPlayerStateChanged | undefined;
        const next = state?.newstate ?? player.getState();
        const previous = lastPlayerStateRef.current;
        lastPlayerStateRef.current = next;
        if (next === 'playing') {
          hasPlayedRef.current = true;
          if (playbackStartedAtRef.current === null) {
            playbackStartedAtRef.current = Date.now();
          }
          updatePlaybackQuality();
          recoveryAttemptsRef.current = 0;
          setError('');
          setPhase('playing');
          setMessage('You are listening live.');
        } else if (next === 'paused') {
          setPhase('paused');
          setMessage('Playback paused.');
        } else if (next === 'loading' || next === 'stalled') {
          if (
            hasPlayedRef.current &&
            previous !== 'loading' &&
            previous !== 'stalled'
          ) {
            bufferingEventsRef.current.push(Date.now());
            updatePlaybackQuality();
          }
          setPhase(hasPlayedRef.current ? 'buffering' : 'loading');
          setMessage(
            hasPlayedRef.current
              ? 'Buffering the live stream…'
              : 'Connecting to the live stream…',
          );
        } else if (next === 'complete') {
          setPhase('ended');
          setMessage('The live stream has ended.');
        } else if (next === 'error') {
          setError('The current playback path failed. DigiStream is trying a fresh signed source.');
          scheduleRecovery();
        }
      });
      player.on('sourceChanged', () => {
        const source = player.getCurrentSource();
        setActiveProtocol(source?.type === 'webrtc' ? 'webrtc' : source ? 'llhls' : null);
        setMessage(
          source?.type === 'webrtc'
            ? 'DigiStream selected the fastest healthy playback path.'
            : 'DigiStream switched to a steadier playback path.',
        );
      });
      player.on('volumeChanged', (value) => {
        if (typeof value === 'number') setVolumeState(value);
      });
      player.on('mute', () => setMuted(player.getMute()));
      player.on('error', () => {
        setError('Playback reported a media error.');
        scheduleRecovery();
      });
    },
    [broadcast?.title, muted, removePlayer, scheduleRecovery, updatePlaybackQuality, volume],
  );

  const startPlayback = useCallback(
    async (recovering = false) => {
      if (!online) {
        setPhase('reconnecting');
        setMessage('Your device is offline. Playback will retry when the connection returns.');
        return;
      }
      setBusy(true);
      if (!recovering) {
        setError('');
        setPhase('loading');
        setMessage('Requesting short-lived playback access…');
      }
      try {
        const current = await loadMetadata();
        if (!playableStatuses.has(current.status)) {
          removePlayer();
          setPhase(current.status === 'completed' ? 'ended' : 'waiting');
          setMessage(statusCopy(current));
          return;
        }
        const playback = await fetchPlayback();
        await createPlayer(playback, true);
      } catch (requestError) {
        if (requestError instanceof ApiClientError && requestError.code === 'BROADCAST_NOT_PLAYABLE') {
          setError('');
          setPhase('waiting');
          setMessage('The creator has not completed the public audio path yet.');
        } else {
          setError(
            requestError instanceof ApiClientError
              ? `Live audio delivery is unavailable: ${requestError.message}`
              : readableError(requestError),
          );
          setPhase('error');
          setMessage('The application is online, but the live audio path is unavailable.');
        }
      } finally {
        setBusy(false);
      }
    }, [createPlayer, fetchPlayback, loadMetadata, online, removePlayer]);

  useEffect(() => {
    mountedRef.current = true;
    setPhase('loading');
    setError('');
    void loadMetadata()
      .then((current) => {
        if (!mountedRef.current) return;
        setPhase(
          current.status === 'completed'
            ? 'ended'
            : playableStatuses.has(current.status)
              ? 'ready'
              : 'waiting',
        );
        setMessage(statusCopy(current));
      })
      .catch((requestError) => {
        if (!mountedRef.current) return;
        setError(readableError(requestError));
        setPhase('error');
      });

    return () => {
      mountedRef.current = false;
      removePlayer();
    };
  }, [loadMetadata, removePlayer]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadMetadata()
        .then((current) => {
          if (current.status === 'completed' || current.status === 'cancelled' || current.status === 'failed') {
            removePlayer();
            setPhase('ended');
            setMessage(statusCopy(current));
          } else if (!playerRef.current) {
            setPhase(playableStatuses.has(current.status) ? 'ready' : 'waiting');
            setMessage(statusCopy(current));
          }
        })
        .catch(() => undefined);
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [loadMetadata, removePlayer]);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'paused') return undefined;
    const timer = window.setInterval(() => updatePlaybackQuality(), 5_000);
    return () => window.clearInterval(timer);
  }, [phase, updatePlaybackQuality]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const offlineHandler = () => {
      setOnline(false);
      setPhase('reconnecting');
      setMessage('Your device is offline.');
    };
    const onlineHandler = () => {
      setOnline(true);
      setError('');
      if (hasPlayedRef.current) {
        scheduleRecovery();
        return;
      }
      void loadMetadata()
        .then((current) => {
          setPhase(
            current.status === 'completed'
              ? 'ended'
              : playableStatuses.has(current.status)
                ? 'ready'
                : 'waiting',
          );
          setMessage(statusCopy(current));
        })
        .catch((requestError) => {
          setError(readableError(requestError));
          setPhase('error');
          setMessage('Broadcast details could not be refreshed after the connection returned.');
        });
    };
    window.addEventListener('offline', offlineHandler);
    window.addEventListener('online', onlineHandler);
    return () => {
      window.removeEventListener('offline', offlineHandler);
      window.removeEventListener('online', onlineHandler);
    };
  }, [loadMetadata, scheduleRecovery]);

  async function refreshBroadcastStatus() {
    if (!online) {
      setPhase('reconnecting');
      setMessage('Your device is offline. Broadcast status will refresh when the connection returns.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const current = await loadMetadata();
      removePlayer();
      setPhase(
        current.status === 'completed' ||
        current.status === 'cancelled' ||
        current.status === 'failed'
          ? 'ended'
          : playableStatuses.has(current.status)
            ? 'ready'
            : 'waiting',
      );
      setMessage(statusCopy(current));
    } catch (requestError) {
      setError(readableError(requestError));
      setPhase('error');
      setMessage('Broadcast details could not be refreshed.');
    } finally {
      setBusy(false);
    }
  }

  function togglePlayback() {
    const player = playerRef.current;
    if (!player) {
      void startPlayback();
      return;
    }
    if (phase === 'playing' || phase === 'buffering') player.pause();
    else player.play();
  }

  function changeVolume(value: number) {
    const next = Math.min(100, Math.max(0, value));
    setVolumeState(next);
    localStorage.setItem('digistream-listener-volume', String(next));
    playerRef.current?.setVolume(next);
    if (next > 0 && muted) {
      playerRef.current?.setMute(false);
      setMuted(false);
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    playerRef.current?.setMute(next);
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage('Listener link copied.');
    } catch {
      setMessage('Copy the link from your browser address bar.');
    }
  }

  const primaryLabel =
    phase === 'playing' || phase === 'buffering'
      ? 'Pause'
      : phase === 'paused'
        ? 'Resume'
        : phase === 'reconnecting'
          ? 'Reconnecting…'
          : 'Listen live';
  const displayStatus = broadcast
    ? presentationStatus(
        broadcast.status,
        broadcast.scheduledStartAt,
        clockNow,
      )
    : null;
  const artLabel = listenerArtLabel(displayStatus);
  const countdown =
    broadcast &&
    (displayStatus === 'scheduled' || displayStatus === 'starting')
      ? listenerCountdown(broadcast.scheduledStartAt, clockNow)
      : null;
  const calendarHref =
    broadcast && displayStatus === 'scheduled' && countdown
      ? listenerCalendarHref(broadcast, shareUrl)
      : null;
  const connectionPresentation = listenerConnectionPresentation({
    activeProtocol,
    online,
    phase,
    playable: isPlayable,
    status: displayStatus,
    unstable: unstableConnection,
  });

  return (
    <div
      className={`listener-page listener-lifecycle-${displayStatus ?? 'loading'}`}
    >
      <section className="listener-shell" aria-live="polite">
        <div className="listener-stage">
          <div
            aria-hidden="true"
            className={`listener-orb ${displayStatus ?? 'loading'} ${phase === 'playing' ? 'playing' : ''}`}
            data-lifecycle-label={artLabel}
          >
            {Array.from({ length: 24 }, (_, index) => (
              <i key={index} style={{ '--bar-index': index } as React.CSSProperties} />
            ))}
          </div>
          <div id={playerContainerIdRef.current} className="listener-player-host" aria-hidden="true" />
          <span className={`listener-live-badge ${displayStatus ?? 'unknown'}`}>
            <i /> {displayStatus ? presentationLabel(displayStatus) : 'Loading'}
          </span>
        </div>

        <article className="listener-card">
          <p className="listener-kicker">
            {broadcast?.organisation.name ?? 'DigiStream'} · {broadcast?.channel.name ?? 'Live audio'}
          </p>
          <h1>{broadcast?.title ?? 'Loading broadcast…'}</h1>
          <p className="listener-description">
            {broadcast?.description ?? 'Live audio delivered through DigiStream.'}
          </p>

          {countdown ? (
            <div className="listener-countdown">
              <Icon name="calendar" />
              <strong>{countdown}</strong>
              <span>{formatDate(broadcast?.scheduledStartAt ?? null)}</span>
            </div>
          ) : null}

          <div className={`listener-status listener-status-${phase}`}>
            <div>
              <strong
                className="listener-connection-heading"
                data-tone={connectionPresentation.tone}
              >
                {connectionPresentation.label}
              </strong>
              <small>{connectionPresentation.guidance}</small>
              <small>{message}</small>
            </div>
          </div>

          {error ? <div className="listener-error" role="alert">{error}</div> : null}
          {signedInRequired ? (
            <div className="listener-private-notice">
              <strong>This is a private organisation broadcast.</strong>
              <span>Sign in through the creator studio with an organisation member account, then reopen this link.</span>
            </div>
          ) : null}

          <details className="listener-diagnostics">
            <summary>Technical details</summary>
            <div>
              <span>{connectionPresentation.technical}</span>
              <code>Playback phase: {phase}</code>
              <code>Broadcast state: {displayStatus ?? 'loading'}</code>
              {error ? <span>Latest error: {error}</span> : null}
            </div>
          </details>

          {isPlayable ? (
            <div className="listener-controls">
              <button
                className="listener-play-button"
                disabled={busy || signedInRequired || phase === 'reconnecting'}
                onClick={togglePlayback}
                type="button"
              >
                <Icon
                  name={
                    phase === 'playing' || phase === 'buffering'
                      ? 'pause'
                      : 'play'
                  }
                />
                {primaryLabel}
              </button>
              <button
                aria-label={muted ? 'Unmute' : 'Mute'}
                aria-pressed={muted}
                className="listener-icon-button"
                onClick={toggleMute}
                type="button"
              >
                <Icon name={muted || volume === 0 ? 'volume-muted' : 'volume'} />
              </button>
              <label className="listener-volume">
                <span className="sr-only">Volume</span>
                <input
                  aria-label="Volume"
                  max="100"
                  min="0"
                  onChange={(event) => changeVolume(Number(event.target.value))}
                  type="range"
                  value={muted ? 0 : volume}
                />
                <output>{muted ? 0 : Math.round(volume)}%</output>
              </label>
            </div>
          ) : null}

          {!isPlayable &&
          (displayStatus === 'scheduled' ||
            displayStatus === 'starting' ||
            displayStatus === 'overdue' ||
            displayStatus === 'draft') ? (
            <div className="listener-waiting-actions">
              <button
                disabled={busy}
                onClick={() => void refreshBroadcastStatus()}
                type="button"
              >
                <Icon name="refresh" />
                Refresh broadcast status
              </button>
              {calendarHref ? (
                <a download="digistream-broadcast.ics" href={calendarHref}>
                  <Icon name="calendar" />
                  Add to calendar
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="listener-secondary-actions">
            {isPlayable && phase === 'error' ? (
              <button onClick={() => void startPlayback(true)} type="button">
                <Icon name="refresh" />
                Retry playback
              </button>
            ) : null}
            <button onClick={() => void copyShareLink()} type="button">
              <Icon name="copy" />
              Copy listener link
            </button>
            <a href="/listen">
              <Icon name="arrow-right" />
              Back to discovery
            </a>
          </div>

          <dl className="listener-details">
            <div>
              <dt>
                {displayStatus === 'scheduled' || displayStatus === 'starting'
                  ? 'Starts'
                  : 'Scheduled'}
              </dt>
              <dd>{formatDate(broadcast?.scheduledStartAt ?? null)}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{broadcast?.channel.category ?? 'General'}</dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd>{isMemberRoute ? 'Organisation members' : 'Public or unlisted link'}</dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
}
