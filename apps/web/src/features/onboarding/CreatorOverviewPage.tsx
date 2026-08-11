import type { Broadcast, Channel, Organisation } from '@digistream/contracts';
import { Button, LinkButton, StatusBadge } from '../../design-system/components';
import { Icon } from '../../design-system/Icon';
import {
  PageHeader,
  RecordList,
  RecordRow,
  SectionHeader,
  TaskList,
  TaskRow,
} from '../../design-system/primitives';
import { requestCreatorStudioLobbyContext } from '../../lib/backstage-context-runtime';
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
  const activeChannelIds = new Set(
    channels
      .filter((channel) => channel.organisationId === organisation.id && channel.status === 'active')
      .map((channel) => channel.id),
  );
  const actionableBroadcasts = broadcasts.filter((broadcast) => (
    broadcast.organisationId === organisation.id && activeChannelIds.has(broadcast.channelId)
  ));
  const now = Date.now();
  const liveBroadcast = [...actionableBroadcasts]
    .filter((broadcast) => broadcast.status === 'live')
    .sort(newestFirst)[0] ?? null;
  const recoveringBroadcast = !liveBroadcast
    ? [...actionableBroadcasts]
        .filter((broadcast) => broadcast.status === 'reconnecting')
        .sort(newestFirst)[0] ?? null
    : null;
  const scheduledBroadcast = [...actionableBroadcasts]
    .filter((broadcast) => (
      broadcast.status === 'scheduled' &&
      Boolean(broadcast.scheduledStartAt) &&
      new Date(broadcast.scheduledStartAt as string).getTime() > now
    ))
    .sort(scheduledFirst)[0] ?? null;
  const recentBroadcasts = broadcasts
    .filter((broadcast) => broadcast.organisationId === organisation.id)
    .sort(newestFirst)
    .slice(0, 4);

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

  function openContextualStudioLobby() {
    if (
      overview.canOpenBackstage &&
      overview.selectedChannel &&
      overview.selectedBroadcast
    ) {
      requestCreatorStudioLobbyContext({
        organisationId: organisation.id,
        channelId: overview.selectedChannel.id,
        broadcastId: overview.selectedBroadcast.id,
      });
    }
    onOpenBackstage();
  }

  const quickActions = [
    ...(overview.canOpenBackstage
      ? [{ icon: 'audience' as const, label: 'Studio Lobby', onClick: openContextualStudioLobby }]
      : []),
    { icon: 'recording' as const, label: 'Recordings', onClick: onOpenRecordings },
  ];

  const currentBroadcast = liveBroadcast ?? recoveringBroadcast;

  return (
    <div className="echoo-overview-page">
      <PageHeader
        action={<Button onClick={primaryAction.onClick} variant="primary">{primaryAction.label}</Button>}
        description="Here’s what’s happening with your broadcasts."
        eyebrow={organisation.name}
        title={`${greeting()}, ${firstName}`}
      />

      <section className="echoo-overview-now-grid" aria-labelledby="echoo-current-work-title">
        <SectionHeader id="echoo-current-work-title" title="Current work" />
        <TaskList label="Current and upcoming broadcasts">
          {currentBroadcast ? (
            <TaskRow
              action={<Button onClick={onOpenStudio} variant="secondary">Open Studio</Button>}
              icon="broadcast"
              title={currentBroadcast.title}
              tone={liveBroadcast ? 'live' : 'warning'}
            >
              <span>{channelName(channels, currentBroadcast)}</span>
              {liveBroadcast?.liveStartedAt ? <span> · Started {formatTime(liveBroadcast.liveStartedAt)}</span> : null}
              {recoveringBroadcast ? <span> · Public delivery is reconnecting.</span> : null}
            </TaskRow>
          ) : (
            <TaskRow icon="broadcast" title="No broadcast is live">
              Prepare an existing broadcast or create your next one.
            </TaskRow>
          )}
          {scheduledBroadcast ? (
            <TaskRow
              action={<Button onClick={onOpenBroadcasts} variant="secondary">Manage schedule</Button>}
              icon="calendar"
              title={scheduledBroadcast.title}
              tone="info"
            >
              {formatDateTime(scheduledBroadcast.scheduledStartAt)} · {relativeStart(scheduledBroadcast.scheduledStartAt)}
            </TaskRow>
          ) : (
            <TaskRow icon="calendar" title="Nothing scheduled">
              Create a broadcast when you’re ready.
            </TaskRow>
          )}
        </TaskList>
      </section>

      {quickActions.length > 0 ? <section className="echoo-overview-section echoo-overview-utilities" aria-labelledby="echoo-quick-actions-title">
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
      </section> : null}

      <section className="echoo-overview-section" aria-labelledby="echoo-recent-broadcasts-title">
        <SectionHeader
          action={<Button onClick={onOpenBroadcasts} variant="ghost">View all</Button>}
          id="echoo-recent-broadcasts-title"
          title="Recent broadcasts"
        />

        {recentBroadcasts.length > 0 ? (
          <RecordList className="echoo-overview-recent-list" label="Recent broadcasts">
            {recentBroadcasts.map((broadcast) => {
              const status = presentationStatus(broadcast.status, broadcast.scheduledStartAt);
              const duration = durationLabel(broadcast);
              const date = broadcast.liveStartedAt ?? broadcast.scheduledStartAt ?? broadcast.createdAt;

              return (
                <RecordRow
                  action={<Button onClick={onOpenBroadcasts} variant="secondary">View</Button>}
                  key={broadcast.id}
                  leading={<BroadcastArtwork live={status === 'live'} />}
                  meta={(
                    <>
                      <span>{channelName(channels, broadcast)}</span>
                      <span>{formatDateTime(date)}</span>
                      {duration ? <span>{duration}</span> : null}
                    </>
                  )}
                  status={<StatusBadge tone={status === 'live' ? 'live' : status === 'completed' ? 'success' : status === 'failed' || status === 'cancelled' ? 'danger' : status === 'overdue' || status === 'ending' ? 'warning' : 'info'}>
                    {presentationLabel(status)}
                  </StatusBadge>}
                  title={broadcast.title}
                />
              );
            })}
          </RecordList>
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
