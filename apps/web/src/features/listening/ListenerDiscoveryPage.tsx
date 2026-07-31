import { useEffect, useState } from 'react';
import type {
  PublicBroadcast,
  PublicBroadcastListResponse,
} from '@digistream/contracts';
import { StatePanel, StatusBadge, type StatusTone } from '../../design-system/components';
import { Icon } from '../../design-system/Icon';
import { ApiClientError, apiRequest } from '../../lib/api-client';
import { publicListenerPath } from './listener-route';
import './listener-playback.css';

function formatDate(value: string | null): string {
  if (!value) return 'Time not announced';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Live broadcasts could not be loaded.';
}

function broadcastTone(status: PublicBroadcast['status']): StatusTone {
  if (status === 'live') return 'live';
  if (status === 'reconnecting' || status === 'starting' || status === 'ending') return 'warning';
  if (status === 'scheduled') return 'info';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  if (status === 'completed') return 'success';
  return 'neutral';
}

function BroadcastTile({ broadcast }: { broadcast: PublicBroadcast }) {
  const path = publicListenerPath({
    organisationSlug: broadcast.organisation.slug,
    channelSlug: broadcast.channel.slug,
    broadcastSlug: broadcast.slug,
  });

  return (
    <a className="listener-discovery-card" href={path}>
      <div className="listener-discovery-signal" aria-hidden="true">
        {Array.from({ length: 11 }, (_, index) => <i key={index} />)}
      </div>
      <div className="listener-discovery-copy">
        <StatusBadge tone={broadcastTone(broadcast.status)}>
          {broadcast.status === 'live' ? 'Live now' : broadcast.status.replaceAll('_', ' ')}
        </StatusBadge>
        <h2>{broadcast.title}</h2>
        <p>{broadcast.description ?? 'Live audio on DigiStream.'}</p>
        <div>
          <strong>{broadcast.channel.name}</strong>
          <span>{broadcast.organisation.name}</span>
          <small>{formatDate(broadcast.scheduledStartAt ?? broadcast.liveStartedAt)}</small>
        </div>
      </div>
      <Icon className="listener-discovery-arrow" name="arrow-right" size={22} />
    </a>
  );
}

export function ListenerDiscoveryPage() {
  const [broadcasts, setBroadcasts] = useState<PublicBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await apiRequest<PublicBroadcastListResponse>(
          '/api/v1/broadcasts?limit=40',
        );
        if (!active) return;
        setBroadcasts(response.broadcasts);
        setError('');
      } catch (requestError) {
        if (active) setError(errorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const live = broadcasts.filter((broadcast) =>
    broadcast.status === 'live' || broadcast.status === 'reconnecting' || broadcast.status === 'ending',
  );
  const upcoming = broadcasts.filter((broadcast) =>
    broadcast.status === 'scheduled' || broadcast.status === 'starting',
  );

  return (
    <div className="listener-discovery-page">
      <section className="listener-discovery-hero">
        <span className="listener-kicker">Listen anywhere</span>
        <h1>Live audio without the heavy video.</h1>
        <p>
          Join public broadcasts from churches, organisations, communities and creators. DigiStream starts with WebRTC for minimal delay and falls back automatically when the network needs a steadier path.
        </p>
      </section>

      {error ? (
        <div className="listener-discovery-section">
          <StatePanel
            actionLabel="Retry"
            kind="error"
            onAction={() => window.location.reload()}
            title="Public broadcasts could not be loaded"
          >
            {error}
          </StatePanel>
        </div>
      ) : null}

      <section className="listener-discovery-section">
        <header>
          <div>
            <span className="listener-kicker">On air</span>
            <h2>Live now</h2>
          </div>
          <span>{live.length} broadcast{live.length === 1 ? '' : 's'}</span>
        </header>
        <div className="listener-discovery-grid">
          {live.map((broadcast) => <BroadcastTile broadcast={broadcast} key={broadcast.id} />)}
          {loading ? (
            <StatePanel kind="loading" title="Loading live broadcasts">
              DigiStream is checking public channels for active audio.
            </StatePanel>
          ) : null}
          {!loading && !error && live.length === 0 ? (
            <StatePanel kind="empty" title="No public broadcast is live right now">
              Upcoming events appear below and this page refreshes automatically.
            </StatePanel>
          ) : null}
        </div>
      </section>

      <section className="listener-discovery-section">
        <header>
          <div>
            <span className="listener-kicker">Coming up</span>
            <h2>Scheduled broadcasts</h2>
          </div>
          <span>{upcoming.length} upcoming</span>
        </header>
        <div className="listener-discovery-grid">
          {upcoming.map((broadcast) => <BroadcastTile broadcast={broadcast} key={broadcast.id} />)}
          {!loading && !error && upcoming.length === 0 ? (
            <StatePanel kind="empty" title="No public events are scheduled yet">
              Creators can schedule future broadcasts from Broadcast Studio.
            </StatePanel>
          ) : null}
        </div>
      </section>
    </div>
  );
}
