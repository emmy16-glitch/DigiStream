import type { Broadcast, Channel, Organisation } from '@digistream/contracts';
import {
  Button,
  LinkButton,
  PageHeader,
  SectionHeader,
  StatusBadge,
  TaskList,
  TaskRow,
} from '../../design-system/components';
import { Icon } from '../../design-system/Icon';
import { requestCreatorStudioLobbyContext } from '../../lib/backstage-context-runtime';
import { presentationLabel, presentationStatus } from '../../lib/broadcast-lifecycle';
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
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatTime(value: string | null): string {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
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
  return `Starts in ${Math.floor(hours / 24)}d`;
}

function durationLabel(broadcast: Broadcast): string | null {
  if (!broadcast.liveStartedAt || !broadcast.endedAt) return null;
  const durationMs = new Date(broadcast.endedAt).getTime() - new Date(broadcast.liveStartedAt).getTime();
  if (!Number.isFinite(durationMs) || durationMs < 0) return null;
  const totalMinutes = Math.floor(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
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

function statusTone(status: ReturnType<typeof presentationStatus>) {
  if (status === 'live') return 'live' as const;
  if (status === 'completed') return 'success' as const;
  if (status === 'failed' || status === 'cancelled') return 'danger' as const;
  if (status === 'overdue' || status === 'ending') return 'warning' as const;
  return 'info' as const;
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
    channels.filter((channel) => channel.organisationId === organisation.id && channel.status === 'active').map((channel) => channel.id),
  );
  const actionableBroadcasts = broadcasts.filter((broadcast) => broadcast.organisationId === organisation.id && activeChannelIds.has(broadcast.channelId));
  const now = Date.now();
  const liveBroadcast = [...actionableBroadcasts].filter((broadcast) => broadcast.status === 'live').sort(newestFirst)[0] ?? null;
  const recoveringBroadcast = !liveBroadcast
    ? [...actionableBroadcasts].filter((broadcast) => broadcast.status === 'reconnecting').sort(newestFirst)[0] ?? null
    : null;
  const scheduledBroadcast = [...actionableBroadcasts]
    .filter((broadcast) => broadcast.status === 'scheduled' && Boolean(broadcast.scheduledStartAt) && new Date(broadcast.scheduledStartAt as string).getTime() > now)
    .sort(scheduledFirst)[0] ?? null;
  const recentBroadcasts = broadcasts.filter((broadcast) => broadcast.organisationId === organisation.id).sort(newestFirst).slice(0, 5);

  const primaryAction = (() => {
    switch (setupState) {
      case 'create_channel': return { label: 'Create your first channel', onClick: onOpenBroadcasts };
      case 'finish_channel_activation': return { label: 'Finish channel setup', onClick: onOpenBroadcasts };
      case 'create_broadcast': return { label: 'Create broadcast', onClick: onOpenBroadcasts };
      case 'manage_live_broadcast': return { label: 'Manage live broadcast', onClick: onOpenStudio };
      case 'prepare_broadcast': return { label: 'Prepare broadcast', onClick: onOpenStudio };
      case 'view_completed_broadcast': return { label: 'Manage broadcasts', onClick: onOpenBroadcasts };
      default: return { label: 'Create broadcast', onClick: onOpenBroadcasts };
    }
  })();

  function openContextualStudioLobby() {
    if (overview.canOpenBackstage && overview.selectedChannel && overview.selectedBroadcast) {
      requestCreatorStudioLobbyContext({
        organisationId: organisation.id,
        channelId: overview.selectedChannel.id,
        broadcastId: overview.selectedBroadcast.id,
      });
    }
    onOpenBackstage();
  }

  const quickActions = [
    ...(overview.canOpenBackstage ? [{ icon: 'audience' as const, label: 'Studio Lobby', onClick: openContextualStudioLobby, tone: 'lavender' as const }] : []),
    { icon: 'recording' as const, label: 'Recordings', onClick: onOpenRecordings, tone: 'peach' as const },
  ];
  const currentBroadcast = liveBroadcast ?? recoveringBroadcast;

  return (
    <div className="echoo-overview-page">
      <PageHeader
        actions={<Button onClick={primaryAction.onClick} variant="primary">{primaryAction.label}</Button>}
        description={<>{organisation.name} · Here&apos;s what&apos;s happening with your broadcasts.</>}
        eyebrow="Creator overview"
        title={`${greeting()}, ${firstName}`}
      />

      <section className="echoo-overview-priority" aria-labelledby="echoo-overview-priority-title">
        <SectionHeader title="Now and next" description="The two broadcast states most likely to need your attention." />
        <TaskList>
          {currentBroadcast ? (
            <TaskRow
              action={<Button onClick={onOpenStudio} variant="secondary">Open Studio</Button>}
              icon="broadcast"
              status={<StatusBadge tone={liveBroadcast ? 'live' : 'warning'}>{liveBroadcast ? 'Live' : 'Reconnecting'}</StatusBadge>}
              title={currentBroadcast.title}
              tone={liveBroadcast ? 'mint' : 'amber'}
            >
              {liveBroadcast
                ? `${channelName(channels, currentBroadcast)}${liveBroadcast.liveStartedAt ? ` · Started ${formatTime(liveBroadcast.liveStartedAt)}` : ''}`
                : `${channelName(channels, currentBroadcast)} · DigiStream is recovering the public delivery path.`}
            </TaskRow>
          ) : (
            <TaskRow icon="broadcast" status={<StatusBadge tone="neutral">Idle</StatusBadge>} title="No broadcast is live" tone="mint">
              Prepare an existing broadcast or create your next one.
            </TaskRow>
          )}

          {scheduledBroadcast ? (
            <TaskRow
              action={<Button onClick={onOpenBroadcasts} variant="ghost">Manage</Button>}
              icon="calendar"
              status={<StatusBadge tone="info">Scheduled</StatusBadge>}
              title={scheduledBroadcast.title}
              tone="sky"
            >
              {formatDateTime(scheduledBroadcast.scheduledStartAt)} · {relativeStart(scheduledBroadcast.scheduledStartAt)}
            </TaskRow>
          ) : (
            <TaskRow icon="calendar" status={<StatusBadge tone="neutral">None</StatusBadge>} title="Nothing scheduled" tone="sky">
              Create a broadcast when you are ready.
            </TaskRow>
          )}
        </TaskList>
      </section>

      <section className="echoo-overview-section" aria-labelledby="echoo-quick-actions-title">
        <SectionHeader title="Quick actions" description="Jump straight to the next workspace without adding another dashboard card." />
        <div className="echoo-overview-quick-grid">
          {quickActions.map((action) => (
            <button className={`echoo-overview-quick-action is-${action.tone}`} key={action.label} onClick={action.onClick} type="button">
              <span aria-hidden="true"><Icon name={action.icon} size={20} /></span>
              <strong>{action.label}</strong>
              <Icon className="echoo-overview-quick-arrow" name="arrow-right" size={16} />
            </button>
          ))}
          <LinkButton className="echoo-overview-listener-action" href="/listen" icon="headphones" variant="secondary">Listener app</LinkButton>
        </div>
      </section>

      <section className="echoo-overview-section" aria-labelledby="echoo-recent-broadcasts-title">
        <SectionHeader actions={<Button onClick={onOpenBroadcasts} variant="ghost">View all</Button>} title="Recent broadcasts" description="Latest broadcast activity in this workspace." />
        {recentBroadcasts.length > 0 ? (
          <TaskList>
            {recentBroadcasts.map((broadcast) => {
              const status = presentationStatus(broadcast.status, broadcast.scheduledStartAt);
              const duration = durationLabel(broadcast);
              const date = broadcast.liveStartedAt ?? broadcast.scheduledStartAt ?? broadcast.createdAt;
              return (
                <TaskRow
                  action={<Button onClick={onOpenBroadcasts} variant="ghost">View</Button>}
                  icon="broadcast"
                  key={broadcast.id}
                  status={<StatusBadge tone={statusTone(status)}>{presentationLabel(status)}</StatusBadge>}
                  title={broadcast.title}
                >
                  {[channelName(channels, broadcast), formatDateTime(date), duration].filter(Boolean).join(' · ')}
                </TaskRow>
              );
            })}
          </TaskList>
        ) : (
          <div className="echoo-overview-recent-empty"><Icon name="broadcast" size={24} /><div><strong>No broadcasts yet</strong><span>Your first broadcast will appear here after you create it.</span></div></div>
        )}
      </section>
    </div>
  );
}