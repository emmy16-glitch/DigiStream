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
  playback: {
    measuredSessions: number;
    anonymousSessions: number;
    signedInSessions: number;
    activeSessions: number;
    measuredListeningSeconds: number;
    bufferingEvents: number;
    fallbackEvents: number;
    mediaErrors: number;
    sessionsWithBuffering: number;
  };
  definitions: {
    registeredListeners: string;
    listeningHistoryEntries: string;
    savedBroadcasts: string;
    usersWhoSaved: string;
    channelBreakdown: string;
    measuredSessions: string;
    activeSessions: string;
    measuredListeningSeconds: string;
    streamQualityEvents: string;
  };
  coverage: {
    anonymousListenerReach: 'not_collected';
    concurrentAudience: 'measured_active_playback_sessions';
    listeningDuration: 'measured_server_heartbeat_intervals';
    streamQuality: 'measured_client_playback_events';
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

function MetricCard({ definition, label, value }: { definition: string; label: string; value: number | string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
      <small>{definition}</small>
    </article>
  );
}

function formatMeasuredDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remaining}s`;
  return `${remaining}s`;
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
        DigiStream is loading persisted and measured analytics for {organisation.name}.
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
    analytics.audience.savedBroadcasts === 0 &&
    analytics.playback.measuredSessions === 0;

  return (
    <section className="creator-analytics" aria-labelledby="creator-analytics-title">
      <header className="workspace-page-intro">
        <StatusBadge tone="info">Persisted + measured data</StatusBadge>
        <h2 id="creator-analytics-title">Stats</h2>
        <p>
          Stored product records and real browser playback telemetry are shown separately. DigiStream does not
          turn playback sessions into invented unique reach or infer network measurements the player did not report.
        </p>
      </header>

      {empty ? (
        <StatePanel kind="empty" title="No stored or measured Stats yet">
          When this workspace has channels, broadcasts, signed-in listener-library activity or a browser actually
          begins playback, those records will appear here. DigiStream does not fill empty Stats with sample data.
        </StatePanel>
      ) : (
        <>
          <div className="metrics-grid" aria-label="Workspace persisted analytics summary">
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

          <section className="panel creator-analytics-summary" aria-labelledby="playback-measurements-title">
            <div className="panel-header">
              <div>
                <StatusBadge tone="success">Measured playback</StatusBadge>
                <h2 id="playback-measurements-title">Audience and playback health</h2>
              </div>
              <Button onClick={() => void load()} variant="secondary">Refresh</Button>
            </div>
            <div className="metrics-grid" aria-label="Measured playback analytics summary">
              <MetricCard
                definition={analytics.definitions.measuredSessions}
                label="Measured playback sessions"
                value={analytics.playback.measuredSessions}
              />
              <MetricCard
                definition={analytics.definitions.activeSessions}
                label="Active measured sessions"
                value={analytics.playback.activeSessions}
              />
              <MetricCard
                definition={analytics.definitions.measuredListeningSeconds}
                label="Measured listening time"
                value={formatMeasuredDuration(analytics.playback.measuredListeningSeconds)}
              />
              <MetricCard
                definition="Measured playback sessions with no signed-in user attached. This is session count, not unique anonymous reach."
                label="Anonymous playback sessions"
                value={analytics.playback.anonymousSessions}
              />
            </div>
            <details className="creator-analytics-advanced">
              <summary>Playback health and advanced analytics</summary>
              <dl>
                <div><dt>Signed-in playback sessions</dt><dd>{analytics.playback.signedInSessions.toLocaleString()}</dd></div>
                <div><dt>Buffering events</dt><dd>{analytics.playback.bufferingEvents.toLocaleString()}</dd></div>
                <div><dt>Sessions with buffering</dt><dd>{analytics.playback.sessionsWithBuffering.toLocaleString()}</dd></div>
                <div><dt>WebRTC → LL-HLS fallbacks</dt><dd>{analytics.playback.fallbackEvents.toLocaleString()}</dd></div>
                <div><dt>Player media errors</dt><dd>{analytics.playback.mediaErrors.toLocaleString()}</dd></div>
              </dl>
              <p>{analytics.definitions.streamQualityEvents}</p>
            </details>
          </section>

          <section className="panel creator-analytics-summary" aria-labelledby="content-summary-title">
            <div className="panel-header">
              <h2 id="content-summary-title">Content totals</h2>
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
        <h2 id="unavailable-stats-title">Measurements still unavailable</h2>
        <p>
          Unique anonymous reach is not collected because anonymous playback sessions cannot be truthfully deduplicated
          into people. Bitrate, jitter and packet loss also remain unavailable until the active player or media provider
          exposes authoritative samples; DigiStream does not infer them from buffering, presence or socket counts.
        </p>
      </section>
    </section>
  );
}
