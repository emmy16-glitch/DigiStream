import { useEffect, useState, type ReactNode } from 'react';
import type { PlatformStatus } from '@digistream/contracts';
import { CreatorBroadcastStudio } from './features/broadcasting/CreatorBroadcastStudio';
import { ListenerBroadcastPage } from './features/listening/ListenerBroadcastPage';
import { ListenerDiscoveryPage } from './features/listening/ListenerDiscoveryPage';
import { parseListenerRoute } from './features/listening/listener-route';

type NavItem = {
  label: string;
  shortLabel: string;
  glyph: string;
};

const navigation: NavItem[] = [
  { label: 'Overview', shortLabel: 'Home', glyph: '⌂' },
  { label: 'Broadcasts', shortLabel: 'Live', glyph: '◉' },
  { label: 'Recordings', shortLabel: 'Replay', glyph: '▤' },
  { label: 'Audience', shortLabel: 'People', glyph: '◎' },
  { label: 'Analytics', shortLabel: 'Stats', glyph: '↗' },
];

const broadcasts = [
  {
    title: 'Sunday Morning Service',
    organisation: 'Grace Community',
    status: 'Ready',
    time: 'Tomorrow · 8:00 AM',
  },
  {
    title: 'Community Tech Roundtable',
    organisation: 'DigiStream Studio',
    status: 'Draft',
    time: 'Friday · 6:30 PM',
  },
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

function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>{title}</h2>
        {action ? <button className="text-button" onClick={onAction} type="button">{action}</button> : null}
      </header>
      {children}
    </section>
  );
}

function CreatorDashboard() {
  const [activeNav, setActiveNav] = useState('Overview');
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

    void fetch(`${apiUrl}/api/v1/status`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('API unavailable');
        return response.json() as Promise<PlatformStatus>;
      })
      .then(setStatus)
      .catch(() => setStatus(null));

    return () => controller.abort();
  }, []);

  function selectNavigation(label: string) {
    setActiveNav(label);
    if (label === 'Broadcasts') setStudioOpen(true);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="DigiStream home">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DigiStream</span>
        </a>

        <nav className="desktop-nav">
          {navigation.map((item) => (
            <button
              className={activeNav === item.label ? 'nav-item active' : 'nav-item'}
              key={item.label}
              onClick={() => selectNavigation(item.label)}
              type="button"
            >
              <span aria-hidden="true">{item.glyph}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="workspace-card">
          <span className="eyebrow">Workspace</span>
          <strong>DigiStream Studio</strong>
          <small>Owner account</small>
        </div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <div>
            <span className="eyebrow">Creator dashboard</span>
            <h1>{activeNav}</h1>
          </div>
          <div className="topbar-actions">
            <a className="listen-link" href="/listen">Listen</a>
            <button className="icon-button" type="button" aria-label="Open notifications">⌁</button>
            <button className="avatar-button" type="button" aria-label="Open account menu">EO</button>
          </div>
        </header>

        <section className="hero-card">
          <div className="hero-copy">
            <span className="live-pill"><i /> Ready to broadcast</span>
            <h2>Share clear live audio with anyone, on any screen.</h2>
            <p>
              Prepare your event, test your microphone and send one link to listeners using phones,
              tablets or desktop computers.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => setStudioOpen(true)} type="button">Start a broadcast</button>
              <a className="secondary-button" href="/listen">Open listener app</a>
            </div>
          </div>
          <div className="signal-visual" aria-label="Decorative live audio waveform">
            {[34, 58, 82, 44, 96, 64, 40, 74, 52, 86, 36, 66].map((height, index) => (
              <i key={`${height}-${index}`} style={{ height: `${height}%` }} />
            ))}
          </div>
        </section>

        <section className="metrics-grid" aria-label="Broadcast metrics">
          <MetricCard label="Live listeners" value="0" note="No active broadcast" />
          <MetricCard label="Upcoming events" value="2" note="Next event tomorrow" />
          <MetricCard label="Published replays" value="0" note="Your library is ready" />
          <MetricCard label="Platform status" value={status ? 'Online' : 'Local'} note={status ? 'API connected' : 'Start the API to connect'} />
        </section>

        <div className="content-grid">
          <Panel title="Upcoming broadcasts" action="View calendar">
            <div className="broadcast-list">
              {broadcasts.map((broadcast) => (
                <article className="broadcast-row" key={broadcast.title}>
                  <div className="date-tile" aria-hidden="true">
                    <strong>{broadcast.time.startsWith('Tomorrow') ? '31' : '01'}</strong>
                    <span>{broadcast.time.startsWith('Tomorrow') ? 'JUL' : 'AUG'}</span>
                  </div>
                  <div className="broadcast-copy">
                    <strong>{broadcast.title}</strong>
                    <span>{broadcast.organisation}</span>
                    <small>{broadcast.time}</small>
                  </div>
                  <span className={`status-badge ${broadcast.status.toLowerCase()}`}>{broadcast.status}</span>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Audio setup" action="Configure" onAction={() => setStudioOpen(true)}>
            <div className="audio-device">
              <div className="device-icon" aria-hidden="true">◍</div>
              <div>
                <strong>Default microphone</strong>
                <span>Permission required before going live</span>
              </div>
            </div>
            <div className="level-meter" aria-label="Inactive audio level meter">
              {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
            </div>
            <button className="wide-button" onClick={() => setStudioOpen(true)} type="button">Run sound check</button>
          </Panel>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 4).map((item) => (
          <button
            className={activeNav === item.label ? 'active' : ''}
            key={item.label}
            onClick={() => selectNavigation(item.label)}
            type="button"
          >
            <span aria-hidden="true">{item.glyph}</span>
            {item.shortLabel}
          </button>
        ))}
      </nav>

      <CreatorBroadcastStudio
        onClose={() => setStudioOpen(false)}
        open={studioOpen}
      />
    </div>
  );
}

export function App() {
  const listenerRoute = parseListenerRoute(window.location.pathname);
  if (listenerRoute?.kind === 'discovery') return <ListenerDiscoveryPage />;
  if (
    listenerRoute?.kind === 'public-broadcast' ||
    listenerRoute?.kind === 'member-broadcast'
  ) {
    return <ListenerBroadcastPage route={listenerRoute} />;
  }
  return <CreatorDashboard />;
}
