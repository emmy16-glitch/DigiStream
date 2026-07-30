import { useEffect, useState } from 'react';
import type {
  PublicBroadcast,
  PublicBroadcastListResponse,
} from '@digistream/contracts';
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
        <span className={`listener-discovery-status ${broadcast.status}`}>
          <i /> {broadcast.status === 'live' ? 'Live now' : broadcast.status.replace('_', ' ')}
        </span>
        <h2>{broadcast.title}</h2>
        <p>{broadcast.description ?? 'Live audio on DigiStream.'}</p>
        <div>
          <strong>{broadcast.channel.name}</strong>
          <span>{broadcast.organisation.name}</span>
          <small>{formatDate(broadcast.scheduledStartAt ?? broadcast.liveStartedAt)}</small>
        </div>
      </div>
      <span className="listener-discovery-arrow" aria-hidden="true">→</span>
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
    <main className="listener-page listener-discovery-page">
      <header className="listener-header">
        <a className="listener-brand" href="/">
          <span aria-hidden="true">D</span>
          DigiStream
        </a>
        <a className="listener-discover-link" href="/">Creator dashboard</a>
      </header>

      <section className="listener-discovery-hero">
        <span className="listener-kicker">Listen anywhere</span>
        <h1>Live audio without the heavy video.</h1>
        <p>
          Join public broadcasts from churches, organisations, communities and creators. DigiStream starts with WebRTC for minimal delay and falls back automatically when the network needs a steadier path.
        </p>
      </section>

      {error ? <div className="listener-error listener-discovery-error" role="alert">{error}</div> : null}

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
          {!loading && live.length === 0 ? (
            <div className="listener-empty-state">
              <strong>No public broadcast is live right now.</strong>
              <span>Upcoming events appear below and this page refreshes automatically.</span>
            </div>
          ) : null}
          {loading ? <div className="listener-empty-state">Loading live broadcasts…</div> : null}
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
          {!loading && upcoming.length === 0 ? (
            <div className="listener-empty-state">
              <strong>No public events are scheduled yet.</strong>
              <span>Creators can schedule broadcasts from the DigiStream studio.</span>
            </div>
          ) : null}
        </div>
      </section>

      <footer className="listener-footer">
        Public discovery shows public channels only. Unlisted broadcasts remain accessible through their exact listener link, while private broadcasts require organisation membership.
      </footer>
    </main>
  );
}
