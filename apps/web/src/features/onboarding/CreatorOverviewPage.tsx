import type { Broadcast, Channel, Organisation } from '@digistream/contracts';
import { Button, LinkButton, StatusBadge } from '../../design-system/components';
import { Icon } from '../../design-system/Icon';
import {
  presentationLabel,
  presentationStatus,
} from '../../lib/broadcast-lifecycle';
import type { CreatorSetupState } from './creator-setup-state';
import type { CreatorOverviewDerivation } from './overview-state';
import './creator-overview-page.css';

type CreatorOverviewPageProps = {
  broadcasts: Broadcast[];
  channels: Channel[];
  firstName: string;
  organisation: Organisation;
  overview: CreatorOverviewDerivation;
  setupState: CreatorSetupState;
  onOpenBackstage(): void;
  onOpenBroadcasts(): void;
  onOpenRecordings(): void;
  onOpenStudio(): void;
};

function formatDateTime(value: string | null): string {
  if (!value) return 'Time not set';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatTime(value: string | null): string {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function relativeStart(value: string | null): string {
  if (!value) return 'Schedule time unavailable';
  const differenceMs = new Date(value).getTime() - Date.now();
  if (differenceMs <= 0) return 'Scheduled time has arrived';

  const totalMinutes = Math.ceil(differenceMs / 60_000);
  if (totalMinutes < 60) return `Starts in ${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return `Starts in ${hours}h${minutes ? ` ${minutes}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `Starts in ${days}d`;
}

function durationLabel(broadcast: Broadcast): string | null {
  if (!broadcast.liveStartedAt || !broadcast.endedAt) return null;
  const durationMs = new Date(broadcast.endedAt).getTime() - new Date(broadcast.liveStartedAt).getTime();
  if (!Number.isFinite(durationMs) || durationMs < 0) return null;
  const totalMinutes = Math.floor(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function newestFirst(left: Broadcast, right: Broadcast): number {
  const leftTime = new Date(left.updatedAt).getTime();
  const rightTime = new Date(right.updatedAt).getTime();
  if (leftTime !== rightTime) return rightTime - leftTime;
  return right.lifecycleVersion - left.lifecycleVersion;
}

function scheduledFirst(left: Broadcast, right: Broadcast): number {
  const leftTime = left.scheduledStartAt ? new Date(left.scheduledStartAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.scheduledStartAt ? new Date(right.scheduledStartAt).getTime() : Number.MAX_SAFE_INTEGER;
  return leftTime - rightTime;
}

function channelName(channels: Channel[], broadcast: Broadcast): string {
  return channels.find((channel) => channel.id === broadcast.channelId)?.name ?? 'Broadcast channel';
}

function BroadcastArtwork({ live = false }: { live?: boolean }) {
  return (
    <span className={live ? 'echoo-overview-artwork is-live' : 'echoo-overview-artwork'} aria-hidden="true">
      <Icon name="broadcast" size={26} />
    </span>
  );
}

export function CreatorOverviewPage({
  broadcasts,
  channels,
  firstName,
  organisation,
  overview,
  setupState,
  onOpenBackstage,
  onOpenBroadcasts,
  onOpenRecordings,
  onOpenStudio,
}: CreatorOverviewPageProps) {
  const liveBroadcast = [...broadcasts]
    .filter((broadcast) => broadcast.status === 'live')
    .sort(newestFirst)[0] ?? null;
  const recoveringBroadcast = !liveBroadcast
    ? [...broadcasts]
        .filter((broadcast) => broadcast.status === 'reconnecting')
        .sort(newestFirst)[0] ?? null
    : null;
  const scheduledBroadcast = [...broadcasts]
    .filter((broadcast) => broadcast.status === 'scheduled' && broadcast.scheduledStartAt)
    .sort(scheduledFirst)[0] ?? null;
  const recentBroadcasts = [...broadcasts].sort(newestFirst).slice(0, 4);

  const primaryAction = (() => {
    switch (setupState) {
      case 'create_channel':
        return { label: 'Create your first channel', onClick: onOpenBroadcasts };
      case 'finish_channel_activation':
        return { label: 'Finish channel setup', onClick: onOpenBroadcasts };
      case 'create_broadcast':
        return { label: 'Create broadcast', onClick: onOpenBroadcasts };
      case 'manage_live_broadcast':
        return { label: 'Manage live broadcast', onClick: onOpenStudio };
      case 'prepare_broadcast':
        return { label: 'Prepare broadcast', onClick: onOpenStudio };
      case 'view_completed_broadcast':
        return { label: 'Manage broadcasts', onClick: onOpenBroadcasts };
      default:
        return { label: 'Create broadcast', onClick: onOpenBroadcasts };
    }
  })();

  const quickActions = [
    {
      icon: 'broadcast' as const,
      label: overview.canOpenStudio ? 'Open Studio' : 'Broadcasts',
      onClick: overview.canOpenStudio ? onOpenStudio : onOpenBroadcasts,
    },
    ...(overview.canOpenBackstage
      ? [{ icon: 'audience' as const, label: 'Backstage', onClick: onOpenBackstage }]
      : []),
    { icon: 'recording' as const, label: 'Recordings', onClick: onOpenRecordings },
  ];

  const currentBroadcast = liveBroadcast ?? recoveringBroadcast;

  return (
    <div className="echoo-overview-page">
      <header className="echoo-overview-hero">
        <div>
          <span className="echoo-overview-eyebrow">{organisation.name}</span>
          <h2>{greeting()}, {firstName}</h2>
          <p>Here’s what’s happening with your broadcasts.</p>
        </div>
        <Button onClick={primaryAction.onClick} variant="primary">
          {primaryAction.label}
        </Button>
      </header>

      <section className="echoo-overview-now-grid" aria-label="Current and upcoming broadcasts">
        <article className="echoo-overview-feature-card">
          <header>
            <h3>Live now</h3>
            {liveBroadcast ? <StatusBadge tone="live">Live</StatusBadge> : null}
            {recoveringBroadcast ? <StatusBadge tone="warning">Reconnecting</StatusBadge> : null}
          </header>
          {currentBroadcast ? (
            <div className="echoo-overview-feature-body">
              <BroadcastArtwork live={Boolean(liveBroadcast)} />
              <div className="echoo-overview-feature-copy">
                <strong>{currentBroadcast.title}</strong>
                <span>{channelName(channels, currentBroadcast)}</span>
                {liveBroadcast?.liveStartedAt ? <small>Started {formatTime(liveBroadcast.liveStartedAt)}</small> : null}
                {recoveringBroadcast ? <small>Echoo is recovering the public delivery path.</small> : null}
              </div>
              <Button onClick={onOpenStudio} variant="secondary">
                Open Studio
              </Button>
            </div>
          ) : (
            <div className="echoo-overview-empty-card">
              <BroadcastArtwork />
              <div>
                <strong>No broadcast is live</strong>
                <span>Prepare an existing broadcast or create your next one.</span>
              </div>
            </div>
          )}
        </article>

        <article className="echoo-overview-feature-card">
          <header>
            <h3>Next up</h3>
            {scheduledBroadcast ? <StatusBadge tone="info">Scheduled</StatusBadge> : null}
          </header>
          {scheduledBroadcast ? (
            <div className="echoo-overview-feature-body">
              <BroadcastArtwork />
              <div className="echoo-overview-feature-copy">
                <strong>{scheduledBroadcast.title}</strong>
                <span>{formatDateTime(scheduledBroadcast.scheduledStartAt)}</span>
                <small className="echoo-overview-starts">{relativeStart(scheduledBroadcast.scheduledStartAt)}</small>
              </div>
              <Button onClick={onOpenBroadcasts} variant="secondary">
                Manage schedule
              </Button>
            </div>
          ) : (
            <div className="echoo-overview-empty-card">
              <BroadcastArtwork />
              <div>
                <strong>Nothing scheduled</strong>
                <span>Create a broadcast when you’re ready.</span>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="echoo-overview-section" aria-labelledby="echoo-quick-actions-title">
        <header className="echoo-overview-section-heading">
          <h3 id="echoo-quick-actions-title">Quick actions</h3>
        </header>
        <div className="echoo-overview-quick-grid">
          {quickActions.map((action) => (
            <button className="echoo-overview-quick-action" key={action.label} onClick={action.onClick} type="button">
              <span aria-hidden="true"><Icon name={action.icon} size={28} /></span>
              <strong>{action.label}</strong>
            </button>
          ))}
          <LinkButton href="/listen" icon="headphones" variant="secondary">
            Listener app
          </LinkButton>
        </div>
      </section>

      <section className="echoo-overview-section" aria-labelledby="echoo-recent-broadcasts-title">
        <header className="echoo-overview-section-heading">
          <h3 id="echoo-recent-broadcasts-title">Recent broadcasts</h3>
          <Button onClick={onOpenBroadcasts} variant="ghost">View all</Button>
        </header>

        {recentBroadcasts.length > 0 ? (
          <div className="echoo-overview-recent-list">
            {recentBroadcasts.map((broadcast) => {
              const status = presentationStatus(broadcast.status, broadcast.scheduledStartAt);
              const duration = durationLabel(broadcast);
              const date = broadcast.liveStartedAt ?? broadcast.scheduledStartAt ?? broadcast.createdAt;

              return (
                <article className="echoo-overview-recent-row" key={broadcast.id}>
                  <BroadcastArtwork live={status === 'live'} />
                  <div className="echoo-overview-recent-copy">
                    <strong>{broadcast.title}</strong>
                    <div className="echoo-overview-recent-meta">
                      <span>{channelName(channels, broadcast)}</span>
                      <span>{formatDateTime(date)}</span>
                      {duration ? <span>{duration}</span> : null}
                    </div>
                  </div>
                  <StatusBadge tone={status === 'live' ? 'live' : status === 'completed' ? 'success' : status === 'failed' || status === 'cancelled' ? 'danger' : status === 'overdue' || status === 'ending' ? 'warning' : 'info'}>
                    {presentationLabel(status)}
                  </StatusBadge>
                  <Button onClick={onOpenBroadcasts} variant="secondary">
                    View
                  </Button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="echoo-overview-recent-empty">
            <Icon name="broadcast" size={30} />
            <div>
              <strong>No broadcasts yet</strong>
              <span>Your first broadcast will appear here after you create it.</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
