import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PlatformStatus } from '@digistream/contracts';
import {
  Button,
  IconButton,
  LinkButton,
  StatePanel,
  StatusBadge,
} from './design-system/components';
import {
  CreatorShell,
  ListenerShell,
  type CreatorNavigationItem,
} from './design-system/shells';
import type { IconName } from './design-system/Icon';
import { CreatorBroadcastStudio } from './features/broadcasting/CreatorBroadcastStudio';
import { BroadcastChat } from './features/chat/BroadcastChat';
import { CreatorChatWorkspace } from './features/chat/CreatorChatWorkspace';
import { PublicBroadcastChat } from './features/chat/PublicBroadcastChat';
import { CreatorBackstageWorkspace } from './features/guests/CreatorBackstageWorkspace';
import { GuestJoinPage } from './features/guests/GuestJoinPage';
import { parseGuestRoute } from './features/guests/guest-route';
import { ListenerBroadcastPage } from './features/listening/ListenerBroadcastPage';
import { ListenerCallInPanel } from './features/listening/ListenerCallInPanel';
import { ListenerDiscoveryPage } from './features/listening/ListenerDiscoveryPage';
import { parseListenerRoute } from './features/listening/listener-route';

type NavigationDefinition = {
  icon: IconName;
  label: string;
  shortLabel: string;
};

const navigationDefinitions: NavigationDefinition[] = [
  { label: 'Overview', shortLabel: 'Home', icon: 'home' },
  { label: 'Broadcasts', shortLabel: 'Live', icon: 'broadcast' },
  { label: 'Audience', shortLabel: 'People', icon: 'audience' },
  { label: 'Recordings', shortLabel: 'Replay', icon: 'recording' },
  { label: 'Analytics', shortLabel: 'Stats', icon: 'analytics' },
];

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Panel({
  action,
  children,
  onAction,
  title,
}: {
  action?: string;
  children: ReactNode;
  onAction?: () => void;
  title: string;
}) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{title}</h2>
        {action && onAction ? (
          <Button onClick={onAction} variant="ghost">{action}</Button>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function CreatorDashboard() {
  const [activeNav, setActiveNav] = useState('Overview');
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [backstageOpen, setBackstageOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

    void fetch(`${apiUrl}/api/v1/status`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('API unavailable');
        return response.json() as Promise<PlatformStatus>;
      })
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setStatusChecked(true));

    return () => controller.abort();
  }, []);

  function selectNavigation(label: string) {
    setActiveNav(label);
    if (label === 'Broadcasts') setStudioOpen(true);
    if (label === 'Audience') setBackstageOpen(true);
  }

  const navigation = useMemo<CreatorNavigationItem[]>(
    () => navigationDefinitions.map((item) => ({
      ...item,
      onSelect: () => selectNavigation(item.label),
    })),
    [],
  );

  const topbarActions = (
    <>
      <Button icon="chat" onClick={() => setChatOpen(true)} variant="ghost">Chat</Button>
      <Button icon="audience" onClick={() => setBackstageOpen(true)} variant="ghost">Backstage</Button>
      <LinkButton href="/listen" icon="broadcast" variant="ghost">Listen</LinkButton>
      <IconButton icon="notification" label="Open notifications" />
      <IconButton icon="user" label="Open account menu" />
    </>
  );

  return (
    <CreatorShell
      actions={topbarActions}
      activeLabel={activeNav}
      eyebrow="Creator workspace"
      navigation={navigation}
      title={activeNav}
    >
      <section className="hero-card">
        <div className="hero-copy">
          <StatusBadge tone={status ? 'success' : statusChecked ? 'warning' : 'info'}>
            {status ? 'Platform connected' : statusChecked ? 'API unavailable' : 'Checking platform'}
          </StatusBadge>
          <h2>Professional live audio without the heavy video.</h2>
          <p>
            Prepare an event, test the microphone, manage guests and share one reliable listener link across phones, tablets and desktop computers.
          </p>
          <div className="hero-actions">
            <Button icon="broadcast" onClick={() => setStudioOpen(true)} variant="primary">Start a broadcast</Button>
            <Button icon="chat" onClick={() => setChatOpen(true)}>Open live chat</Button>
            <Button icon="audience" onClick={() => setBackstageOpen(true)}>Manage guests</Button>
            <LinkButton href="/listen" icon="headphones">Open listener app</LinkButton>
          </div>
        </div>
        <div className="signal-visual" aria-label="Decorative live audio waveform">
          {[34, 58, 82, 44, 96, 64, 40, 74, 52, 86, 36, 66].map((height, index) => (
            <i key={`${height}-${index}`} style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>

      <section className="metrics-grid" aria-label="Creator workspace summary">
        <MetricCard label="Live listeners" value="—" note="Available during verified live delivery" />
        <MetricCard label="Upcoming broadcasts" value="—" note="Load an organisation to view schedules" />
        <MetricCard label="Published recordings" value="—" note="Recording storage is not implemented yet" />
        <MetricCard
          label="Platform status"
          value={status ? 'Online' : statusChecked ? 'Unavailable' : 'Checking'}
          note={status ? 'API connected' : 'No fake health value is displayed'}
        />
      </section>

      <div className="content-grid">
        <Panel title="Broadcasts" action="Open studio" onAction={() => setStudioOpen(true)}>
          <StatePanel kind="empty" title="No broadcast list loaded">
            Sign in with a broadcaster account and select an organisation before DigiStream displays scheduled or live broadcasts here.
          </StatePanel>
        </Panel>

        <Panel title="Audio setup" action="Configure" onAction={() => setStudioOpen(true)}>
          <div className="audio-device">
            <div className="device-icon" aria-hidden="true">◍</div>
            <div>
              <strong>Microphone not prepared</strong>
              <span>Open Broadcast Studio to request permission and run a real sound check.</span>
            </div>
          </div>
          <div className="level-meter" aria-label="Inactive audio level meter">
            {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
          </div>
          <Button fullWidth icon="microphone" onClick={() => setStudioOpen(true)}>Run sound check</Button>
        </Panel>
      </div>

      <CreatorBroadcastStudio onClose={() => setStudioOpen(false)} open={studioOpen} />
      <CreatorBackstageWorkspace onClose={() => setBackstageOpen(false)} open={backstageOpen} />
      <CreatorChatWorkspace onClose={() => setChatOpen(false)} open={chatOpen} />
    </CreatorShell>
  );
}

export function App() {
  const guestRoute = parseGuestRoute(window.location.pathname);
  if (guestRoute) return <GuestJoinPage route={guestRoute} />;

  const listenerRoute = parseListenerRoute(window.location.pathname);
  if (listenerRoute?.kind === 'discovery') {
    return (
      <ListenerShell current="discover">
        <ListenerDiscoveryPage />
      </ListenerShell>
    );
  }
  if (listenerRoute?.kind === 'public-broadcast') {
    return (
      <ListenerShell
        current="live"
        footer="WebRTC is attempted first for low delay. DigiStream automatically falls back to LL-HLS when a steadier playback path is required."
      >
        <ListenerBroadcastPage route={listenerRoute} />
        <ListenerCallInPanel route={listenerRoute} />
        <PublicBroadcastChat route={listenerRoute} />
      </ListenerShell>
    );
  }
  if (listenerRoute?.kind === 'member-broadcast') {
    return (
      <ListenerShell current="live">
        <ListenerBroadcastPage route={listenerRoute} />
        <BroadcastChat
          broadcastId={listenerRoute.broadcastId}
          messagesPath={`/api/v1/organisations/${listenerRoute.organisationId}/broadcasts/${listenerRoute.broadcastId}/chat/messages`}
          organisationId={listenerRoute.organisationId}
          variant="listener"
        />
      </ListenerShell>
    );
  }
  return <CreatorDashboard />;
}
