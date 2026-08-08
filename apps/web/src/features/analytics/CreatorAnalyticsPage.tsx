import { useCallback, useEffect, useState } from 'react';
import type { Organisation } from '@digistream/contracts';
import { Button, StatePanel, StatusBadge } from '../../design-system/components';
import { ApiClientError, apiRequest } from '../../lib/api-client';
import './creator-analytics.css';

type OrganisationAnalytics = {
  organisationId: string;
  channels: {
    total: number;
    byStatus: Record<string, number>;
    breakdown: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      visibility: string;
      broadcasts: number;
      registeredListeners: number;
      listeningHistoryEntries: number;
      savedBroadcasts: number;
    }>;
  };
  broadcasts: {
    total: number;
    byStatus: Record<string, number>;
  };
  audience: {
    registeredListeners: number;
    listeningHistoryEntries: number;
    savedBroadcasts: number;
    usersWhoSaved: number;
  };
  definitions: {
    registeredListeners: string;
    listeningHistoryEntries: string;
    savedBroadcasts: string;
    usersWhoSaved: string;
    channelBreakdown: string;
  };
  coverage: {
    anonymousListenerReach: 'not_collected';
    concurrentAudience: 'not_collected';
    listeningDuration: 'not_collected';
    streamQuality: 'not_collected';
  };
};

type OrganisationAnalyticsResponse = { analytics: OrganisationAnalytics };

type Failure = {
  kind: 'authentication' | 'private-not-found' | 'error';
  message: string;
};

function failureFrom(error: unknown): Failure {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return { kind: 'authentication', message: 'Your creator session has expired. Sign in again to view Stats.' };
    }
    if (error.status === 404) {
      return {
        kind: 'private-not-found',
        message: 'Stats are unavailable for this workspace. Your access may have changed.',
      };
    }
    return { kind: 'error', message: error.message };
  }
  return {
    kind: 'error',
    message: error instanceof Error ? error.message : 'DigiStream could not load Stats.',
  };
}

function MetricCard({ definition, label, value }: { definition: string; label: string; value: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
      <small>{definition}</small>
    </article>
  );
}

export function CreatorAnalyticsPage({ organisation }: { organisation: Organisation }) {
  const [analytics, setAnalytics] = useState<OrganisationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<Failure | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const response = await apiRequest<OrganisationAnalyticsResponse>(
        `/api/v1/organisations/${encodeURIComponent(organisation.id)}/analytics`,
      );
      if (response.analytics.organisationId !== organisation.id) {
        throw new Error('DigiStream returned Stats for a different workspace.');
      }
      setAnalytics(response.analytics);
    } catch (error) {
      setAnalytics(null);
      setFailure(failureFrom(error));
    } finally {
      setLoading(false);
    }
  }, [organisation.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <StatePanel kind="loading" title="Loading Stats">
        DigiStream is loading persisted analytics for {organisation.name}.
      </StatePanel>
    );
  }

  if (failure?.kind === 'authentication') {
    return (
      <StatePanel
        actionLabel="Sign in again"
        kind="unauthorized"
        onAction={() => window.location.assign('/login?reason=session-expired')}
        title="Sign in to view Stats"
      >
        {failure.message}
      </StatePanel>
    );
  }

  if (failure?.kind === 'private-not-found') {
    return (
      <StatePanel kind="unauthorized" title="Stats are not available">
        {failure.message}
      </StatePanel>
    );
  }

  if (failure || !analytics) {
    return (
      <StatePanel actionLabel="Retry" kind="error" onAction={() => void load()} title="Stats could not load">
        {failure?.message ?? 'DigiStream could not load Stats.'}
      </StatePanel>
    );
  }

  const empty =
    analytics.channels.total === 0 &&
    analytics.broadcasts.total === 0 &&
    analytics.audience.registeredListeners === 0 &&
    analytics.audience.listeningHistoryEntries === 0 &&
    analytics.audience.savedBroadcasts === 0;

  return (
    <section className="creator-analytics" aria-labelledby="creator-analytics-title">
      <header className="workspace-page-intro">
        <StatusBadge tone="info">Persisted product data</StatusBadge>
        <h2 id="creator-analytics-title">Stats</h2>
        <p>
          These numbers come from stored DigiStream records. They do not estimate anonymous reach,
          live concurrency, listening duration or stream quality.
        </p>
      </header>

      {empty ? (
        <StatePanel kind="empty" title="No stored Stats yet">
          When this workspace has channels, broadcasts, signed-in listening history or saved broadcasts,
          those persisted records will appear here. DigiStream does not fill empty Stats with sample data.
        </StatePanel>
      ) : (
        <>
          <div className="metrics-grid" aria-label="Workspace analytics summary">
            <MetricCard
              definition={analytics.definitions.registeredListeners}
              label="Registered listeners"
              value={analytics.audience.registeredListeners}
            />
            <MetricCard
              definition={analytics.definitions.listeningHistoryEntries}
              label="Listening-history entries"
              value={analytics.audience.listeningHistoryEntries}
            />
            <MetricCard
              definition={analytics.definitions.savedBroadcasts}
              label="Saved broadcasts"
              value={analytics.audience.savedBroadcasts}
            />
            <MetricCard
              definition={analytics.definitions.usersWhoSaved}
              label="Users who saved"
              value={analytics.audience.usersWhoSaved}
            />
          </div>

          <section className="panel creator-analytics-summary" aria-labelledby="content-summary-title">
            <div className="panel-header">
              <h2 id="content-summary-title">Content totals</h2>
              <Button onClick={() => void load()} variant="secondary">Refresh</Button>
            </div>
            <dl>
              <div><dt>Channels</dt><dd>{analytics.channels.total.toLocaleString()}</dd></div>
              <div><dt>Broadcasts</dt><dd>{analytics.broadcasts.total.toLocaleString()}</dd></div>
            </dl>
          </section>

          {analytics.channels.breakdown.length > 0 ? (
            <section className="panel creator-analytics-channels" aria-labelledby="channel-stats-title">
              <div className="panel-header">
                <div>
                  <h2 id="channel-stats-title">Channel breakdown</h2>
                  <p>{analytics.definitions.channelBreakdown}</p>
                </div>
              </div>
              <div className="creator-analytics-table-wrap" tabIndex={0} aria-label="Scrollable channel Stats table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Channel</th>
                      <th scope="col">Status</th>
                      <th scope="col">Broadcasts</th>
                      <th scope="col">Registered listeners</th>
                      <th scope="col">History entries</th>
                      <th scope="col">Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.channels.breakdown.map((channel) => (
                      <tr key={channel.id}>
                        <th scope="row">
                          <strong>{channel.name}</strong>
                          <small>{channel.visibility}</small>
                        </th>
                        <td>{channel.status.replaceAll('_', ' ')}</td>
                        <td>{channel.broadcasts.toLocaleString()}</td>
                        <td>{channel.registeredListeners.toLocaleString()}</td>
                        <td>{channel.listeningHistoryEntries.toLocaleString()}</td>
                        <td>{channel.savedBroadcasts.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}

      <section className="panel creator-analytics-unavailable" aria-labelledby="unavailable-stats-title">
        <StatusBadge tone="neutral">Not collected</StatusBadge>
        <h2 id="unavailable-stats-title">Measurements not yet available</h2>
        <p>
          Anonymous listener reach, concurrent audience, listening duration and stream quality stay unavailable
          until DigiStream has an authoritative measured collection path and verified definitions.
        </p>
      </section>
    </section>
  );
}
