import { useEffect, useMemo, useState } from 'react';
import type {
  PublicBroadcast,
  PublicBroadcastListResponse,
} from '@digistream/contracts';
import { StatePanel } from '../../design-system/components';
import { ApiClientError, apiRequest } from '../../lib/api-client';
import {
  isFutureUpcomingBroadcast,
} from '../../lib/broadcast-lifecycle';
import { publicListenerPath } from './listener-route';
import './listener-playback.css';
import './listener-discovery-reference.css';

type DiscoveryFilter = 'all' | 'live' | `category:${string}`;

function formatDate(value: string | null): string {
  if (!value) return 'Time not announced';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function relativeStart(value: string | null): string {
  if (!value) return 'Time pending';
  const difference = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(difference) || difference <= 0) return 'Start time reached';
  const minutes = Math.ceil(difference / 60_000);
  if (minutes < 60) return `In ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return `In ${hours}h${remainder ? ` ${remainder}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `In ${days}d`;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Live broadcasts could not be loaded.';
}

function listenerPath(broadcast: PublicBroadcast): string {
  return publicListenerPath({
    organisationSlug: broadcast.organisation.slug,
    channelSlug: broadcast.channel.slug,
    broadcastSlug: broadcast.slug,
  });
}

function matchesSearch(broadcast: PublicBroadcast, query: string): boolean {
  if (!query) return true;
  const haystack = [
    broadcast.title,
    broadcast.description ?? '',
    broadcast.channel.name,
    broadcast.channel.category ?? '',
    broadcast.organisation.name,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function matchesFilter(broadcast: PublicBroadcast, filter: DiscoveryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'live') {
    return broadcast.status === 'live' || broadcast.status === 'reconnecting' || broadcast.status === 'ending';
  }
  return (broadcast.channel.category ?? '').toLowerCase() === filter.slice('category:'.length);
}

function LiveBroadcastCard({ broadcast }: { broadcast: PublicBroadcast }) {
  return (
    <a className="echoo-discovery-live-card" href={listenerPath(broadcast)}>
      <div className="echoo-discovery-live-card-top">
        <span className="echoo-discovery-artwork" aria-hidden="true" />
        <span className={`echoo-discovery-live-pill is-${broadcast.status}`}>
          <i aria-hidden="true" />
          {broadcast.status === 'reconnecting' ? 'Recovering' : broadcast.status === 'ending' ? 'Ending' : 'Live'}
        </span>
      </div>
      <div className="echoo-discovery-live-copy">
        <h2>{broadcast.title}</h2>
        <p>{broadcast.channel.name}</p>
        <small>{broadcast.organisation.name}</small>
      </div>
    </a>
  );
}

function UpcomingBroadcastRow({ broadcast }: { broadcast: PublicBroadcast }) {
  return (
    <a className="echoo-discovery-upcoming-row" href={listenerPath(broadcast)}>
      <span className="echoo-discovery-upcoming-artwork" aria-hidden="true" />
      <span className="echoo-discovery-upcoming-copy">
        <strong>{broadcast.title}</strong>
        <small>{formatDate(broadcast.scheduledStartAt)}</small>
        <em>{broadcast.channel.name} · {broadcast.organisation.name}</em>
      </span>
      <span className="echoo-discovery-upcoming-relative">
        {relativeStart(broadcast.scheduledStartAt)}
      </span>
    </a>
  );
}

export function ListenerDiscoveryPage() {
  const initialLiveOnly = new URLSearchParams(window.location.search).get('status') === 'live';
  const [broadcasts, setBroadcasts] = useState<PublicBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DiscoveryFilter>(initialLiveOnly ? 'live' : 'all');

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

  const categories = useMemo(() => Array.from(new Set(
    broadcasts
      .map((broadcast) => broadcast.channel.category?.trim())
      .filter((category): category is string => Boolean(category)),
  )).sort((left, right) => left.localeCompare(right)), [broadcasts]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleBroadcasts = broadcasts.filter((broadcast) =>
    matchesSearch(broadcast, normalizedQuery) && matchesFilter(broadcast, filter),
  );
  const live = visibleBroadcasts.filter((broadcast) =>
    broadcast.status === 'live' || broadcast.status === 'reconnecting' || broadcast.status === 'ending',
  );
  const upcoming = filter === 'live'
    ? []
    : visibleBroadcasts.filter((broadcast) =>
      isFutureUpcomingBroadcast(broadcast.status, broadcast.scheduledStartAt),
    );

  return (
    <div className="echoo-discovery-page">
      <header className="echoo-discovery-header">
        <div>
          <h1>Discover</h1>
          <p>Find live and upcoming broadcasts.</p>
        </div>
      </header>

      <label className="echoo-discovery-search">
        <span className="sr-only">Search broadcasts and creators</span>
        <span aria-hidden="true">⌕</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search broadcasts, creators…"
          type="search"
          value={query}
        />
      </label>

      <div className="echoo-discovery-filters" aria-label="Discovery filters">
        <button
          aria-pressed={filter === 'all'}
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
          type="button"
        >
          All
        </button>
        <button
          aria-pressed={filter === 'live'}
          className={filter === 'live' ? 'active' : ''}
          onClick={() => setFilter('live')}
          type="button"
        >
          Live
        </button>
        {categories.slice(0, 5).map((category) => {
          const value = `category:${category.toLowerCase()}` as DiscoveryFilter;
          return (
            <button
              aria-pressed={filter === value}
              className={filter === value ? 'active' : ''}
              key={category}
              onClick={() => setFilter(value)}
              type="button"
            >
              {category}
            </button>
          );
        })}
      </div>

      {error ? (
        <StatePanel
          actionLabel="Retry"
          kind="error"
          onAction={() => window.location.reload()}
          title="Public broadcasts could not be loaded"
        >
          {error}
        </StatePanel>
      ) : null}

      <section className="echoo-discovery-section" aria-labelledby="echoo-live-now-title">
        <header>
          <h2 id="echoo-live-now-title">Live now</h2>
        </header>
        <div className="echoo-discovery-live-grid">
          {live.map((broadcast) => <LiveBroadcastCard broadcast={broadcast} key={broadcast.id} />)}
        </div>
        {loading ? (
          <StatePanel kind="loading" title="Loading live broadcasts">
            Checking for public broadcasts.
          </StatePanel>
        ) : null}
        {!loading && !error && live.length === 0 ? (
          <StatePanel kind="empty" title="No matching broadcast is live right now">
            Try another filter or check the upcoming schedule below.
          </StatePanel>
        ) : null}
      </section>

      {filter !== 'live' ? (
        <section className="echoo-discovery-section" aria-labelledby="echoo-upcoming-title">
          <header>
            <h2 id="echoo-upcoming-title">Upcoming</h2>
          </header>
          <div className="echoo-discovery-upcoming-list">
            {upcoming.map((broadcast) => <UpcomingBroadcastRow broadcast={broadcast} key={broadcast.id} />)}
          </div>
          {!loading && !error && upcoming.length === 0 ? (
            <StatePanel kind="empty" title="No matching upcoming broadcasts">
              Scheduled public broadcasts will appear here when available.
            </StatePanel>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
