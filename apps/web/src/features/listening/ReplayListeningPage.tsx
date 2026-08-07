import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  PublicReplay,
  PublicReplayResponse,
  RecordingPlaybackAccessResponse,
} from '@digistream/contracts';
import { Button, StatePanel, StatusBadge } from '../../design-system/components';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import type { ListenerRoute } from './listener-route';
import './replay-listening.css';

type ReplayRoute = Extract<
  ListenerRoute,
  { kind: 'public-replay' | 'member-replay' }
>;

type ReplayListeningPageProps = {
  route: ReplayRoute;
};

function formatDate(value: string | null): string {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(value: number): string {
  const totalSeconds = Math.max(0, Math.round(value / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatSize(value: number): string {
  if (value < 1_024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'];
  let amount = value / 1_024;
  let unit = 0;
  while (amount >= 1_024 && unit < units.length - 1) {
    amount /= 1_024;
    unit += 1;
  }
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${units[unit]}`;
}

function readableError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'This replay could not be loaded.';
}

function replayEndpoint(route: ReplayRoute): string {
  if (route.kind === 'member-replay') {
    return `/api/v1/organisations/${encodeURIComponent(route.organisationId)}/replays/${encodeURIComponent(route.recordingId)}`;
  }
  return `/api/v1/replays/${encodeURIComponent(route.organisationSlug)}/${encodeURIComponent(route.channelSlug)}/${encodeURIComponent(route.broadcastSlug)}`;
}

function accessEndpoint(route: ReplayRoute, replay: PublicReplay): string {
  if (route.kind === 'member-replay') {
    return `/api/v1/organisations/${encodeURIComponent(route.organisationId)}/recordings/${encodeURIComponent(replay.recordingId)}/access`;
  }
  return `${replayEndpoint(route)}/access`;
}

export function ReplayListeningPage({ route }: ReplayListeningPageProps) {
  const [replay, setReplay] = useState<PublicReplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [accessExpiresAt, setAccessExpiresAt] = useState('');
  const [accessLoading, setAccessLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadReplay = useCallback(async () => {
    setLoading(true);
    setError('');
    setPlaybackUrl('');
    setAccessExpiresAt('');
    try {
      const response = await apiRequest<PublicReplayResponse>(replayEndpoint(route));
      setReplay(response.replay);
    } catch (requestError) {
      setReplay(null);
      setError(readableError(requestError));
    } finally {
      setLoading(false);
    }
  }, [route]);

  useEffect(() => {
    void loadReplay();
  }, [loadReplay]);

  useEffect(() => {
    if (!accessExpiresAt) return undefined;
    const remaining = new Date(accessExpiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      setPlaybackUrl('');
      setPlaybackError('Your playback access expired. Start listening again to continue.');
      return undefined;
    }
    const timer = window.setTimeout(() => {
      audioRef.current?.pause();
      setPlaybackUrl('');
      setPlaybackError('Your playback access expired. Start listening again to continue.');
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [accessExpiresAt]);

  async function startListening() {
    if (!replay) return;
    setAccessLoading(true);
    setPlaybackError('');
    try {
      const response = await apiRequest<RecordingPlaybackAccessResponse>(
        accessEndpoint(route, replay),
        route.kind === 'member-replay'
          ? { method: 'POST', body: jsonBody({ mode: 'playback' }) }
          : { method: 'POST' },
      );
      setPlaybackUrl(response.access.url);
      setAccessExpiresAt(response.access.expiresAt);
    } catch (requestError) {
      setPlaybackUrl('');
      setAccessExpiresAt('');
      setPlaybackError(readableError(requestError));
    } finally {
      setAccessLoading(false);
    }
  }

  const accessLabel = useMemo(() => {
    if (!replay) return '';
    if (replay.access === 'unlisted') return 'Unlisted replay';
    if (replay.access === 'member') return 'Members-only replay';
    return 'Public replay';
  }, [replay]);

  if (loading) {
    return (
      <div className="replay-listening-page">
        <StatePanel kind="loading" title="Loading replay">
          DigiStream is checking whether this replay is available.
        </StatePanel>
      </div>
    );
  }

  if (!replay) {
    return (
      <div className="replay-listening-page">
        <StatePanel
          actionLabel="Try again"
          kind="error"
          onAction={() => void loadReplay()}
          title="Replay unavailable"
        >
          {error || 'This replay is unavailable or you may not have access.'}
        </StatePanel>
      </div>
    );
  }

  return (
    <article className="replay-listening-page">
      <header className="replay-listening-hero">
        <div className="replay-listening-signal" aria-hidden="true">
          {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
        </div>
        <div className="replay-listening-heading">
          <div className="replay-listening-badges">
            <StatusBadge tone="success">Replay ready</StatusBadge>
            <StatusBadge tone={replay.access === 'public' ? 'info' : 'neutral'}>
              {accessLabel}
            </StatusBadge>
          </div>
          <span>{replay.channel.name} · {replay.organisation.name}</span>
          <h1>{replay.title}</h1>
          <p>{replay.description ?? 'Listen again to this completed broadcast.'}</p>
        </div>
      </header>

      <section className="replay-player-panel" aria-labelledby="replay-player-title">
        <div>
          <span className="listener-kicker">Audio replay</span>
          <h2 id="replay-player-title">Listen to the recording</h2>
          <p>Start listening when you’re ready.</p>
        </div>

        {playbackUrl ? (
          <div className="replay-audio-shell">
            <audio
              controls
              onError={() => {
                setPlaybackError(
                  'The recording stopped loading. Playback access may have expired or the service may be temporarily unavailable.',
                );
              }}
              preload="metadata"
              ref={audioRef}
              src={playbackUrl}
            >
              Your browser does not support HTML audio playback.
            </audio>
            <small>
              Playback access expires {formatDate(accessExpiresAt)}. Start listening again to continue if it expires.
            </small>
          </div>
        ) : (
          <Button
            icon="headphones"
            loading={accessLoading}
            onClick={() => void startListening()}
            variant="primary"
          >
            Start listening
          </Button>
        )}

        {playbackError ? (
          <div className="replay-playback-error" role="alert">
            <strong>Playback is not ready</strong>
            <span>{playbackError}</span>
            <Button onClick={() => void startListening()} variant="secondary">
              Try playback again
            </Button>
          </div>
        ) : null}
      </section>

      <section className="replay-details-grid" aria-label="Replay details">
        <article>
          <span>Duration</span>
          <strong>{formatDuration(replay.media.durationMs)}</strong>
        </article>
        <article>
          <span>Format</span>
          <strong>{replay.media.format.toUpperCase()}</strong>
        </article>
        <article>
          <span>File size</span>
          <strong>{formatSize(replay.media.sizeBytes)}</strong>
        </article>
        <article>
          <span>Published</span>
          <strong>{formatDate(replay.publishedAt ?? replay.endedAt)}</strong>
        </article>
      </section>
    </article>
  );
}
