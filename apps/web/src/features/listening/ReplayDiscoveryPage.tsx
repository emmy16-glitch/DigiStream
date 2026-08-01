import { useEffect, useState } from 'react';
import type { PublicReplay, PublicReplayListResponse } from '@digistream/contracts';
import { StatePanel, StatusBadge } from '../../design-system/components';
import { Icon } from '../../design-system/Icon';
import { ApiClientError, apiRequest } from '../../lib/api-client';
import { publicReplayPath } from './listener-route';
import './replay-listening.css';

function formatDate(value: string | null): string {
  if (!value) return 'Publication time unavailable';
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
  return 'Published replays could not be loaded.';
}

function ReplayCard({ replay }: { replay: PublicReplay }) {
  return (
    <a
      className="replay-discovery-card"
      href={publicReplayPath({
        organisationSlug: replay.organisation.slug,
        channelSlug: replay.channel.slug,
        broadcastSlug: replay.slug,
      })}
    >
      <div className="replay-card-signal" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
      </div>
      <div className="replay-card-copy">
        <div className="replay-card-badges">
          <StatusBadge tone="success">Replay</StatusBadge>
          {replay.channel.category ? (
            <StatusBadge tone="neutral">{replay.channel.category}</StatusBadge>
          ) : null}
        </div>
        <h2>{replay.title}</h2>
        <p>{replay.description ?? 'Recorded audio published on DigiStream.'}</p>
        <div className="replay-card-source">
          <strong>{replay.channel.name}</strong>
          <span>{replay.organisation.name}</span>
        </div>
        <div className="replay-card-meta">
          <span>{formatDuration(replay.media.durationMs)}</span>
          <span>{replay.media.format.toUpperCase()}</span>
          <span>{formatSize(replay.media.sizeBytes)}</span>
          <small>{formatDate(replay.publishedAt ?? replay.endedAt)}</small>
        </div>
      </div>
      <Icon className="replay-card-arrow" name="arrow-right" size={22} />
    </a>
  );
}

export function ReplayDiscoveryPage() {
  const [replays, setReplays] = useState<PublicReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await apiRequest<PublicReplayListResponse>(
          '/api/v1/replays?limit=60',
        );
        if (!active) return;
        setReplays(response.replays);
        setError('');
      } catch (requestError) {
        if (active) setError(readableError(requestError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="replay-discovery-page">
      <section className="replay-discovery-hero">
        <span className="listener-kicker">Listen again</span>
        <h1>Published audio replays, ready when you are.</h1>
        <p>
          Replay completed broadcasts without exposing private storage. DigiStream creates a short-lived listening link only after you choose a recording.
        </p>
      </section>

      <section className="replay-discovery-section" aria-labelledby="published-replays-title">
        <header>
          <div>
            <span className="listener-kicker">Replay library</span>
            <h2 id="published-replays-title">Published recordings</h2>
          </div>
          <span>{replays.length} replay{replays.length === 1 ? '' : 's'}</span>
        </header>

        {error ? (
          <StatePanel
            actionLabel="Retry"
            kind="error"
            onAction={() => window.location.reload()}
            title="Published replays could not be loaded"
          >
            {error}
          </StatePanel>
        ) : null}

        {loading ? (
          <StatePanel kind="loading" title="Loading published replays">
            DigiStream is checking verified recording and visibility state.
          </StatePanel>
        ) : null}

        {!loading && !error && replays.length === 0 ? (
          <StatePanel kind="empty" title="No public replay has been published yet">
            Completed recordings appear here only after a creator publishes a verified artifact.
          </StatePanel>
        ) : null}

        <div className="replay-discovery-grid">
          {replays.map((replay) => (
            <ReplayCard key={replay.recordingId} replay={replay} />
          ))}
        </div>
      </section>
    </div>
  );
}
