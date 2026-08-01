import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import type {
  AuthUser,
  AuthUserResponse,
  Organisation,
  OrganisationListResponse,
  OrganisationResponse,
  PlatformStatus,
} from '@digistream/contracts';
import { AuthScreen } from './auth/AuthScreen';
import {
  Button,
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
import { CreatorBroadcastsPage } from './features/broadcasting/CreatorBroadcastsPage';
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
import { ReplayDiscoveryPage } from './features/listening/ReplayDiscoveryPage';
import { ReplayListeningPage } from './features/listening/ReplayListeningPage';
import { parseListenerRoute } from './features/listening/listener-route';
import { CreatorRecordingsPage } from './features/recordings/CreatorRecordingsPage';
import { ApiClientError, apiRequest, jsonBody } from './lib/api-client';

type CreatorPage =
  | 'Overview'
  | 'Broadcasts'
  | 'Backstage'
  | 'Recordings'
  | 'Analytics';

type NavigationDefinition = {
  icon: IconName;
  label: CreatorPage;
  path: string;
  shortLabel: string;
};

const navigationDefinitions: NavigationDefinition[] = [
  { label: 'Overview', shortLabel: 'Home', icon: 'home', path: '/creator/overview' },
  { label: 'Broadcasts', shortLabel: 'Live', icon: 'broadcast', path: '/creator/broadcasts' },
  { label: 'Backstage', shortLabel: 'Backstage', icon: 'audience', path: '/creator/audience' },
  { label: 'Recordings', shortLabel: 'Replay', icon: 'recording', path: '/creator/recordings' },
  { label: 'Analytics', shortLabel: 'Stats', icon: 'analytics', path: '/creator/analytics' },
];

function creatorPageFromPath(pathname: string): CreatorPage {
  const match = navigationDefinitions.find((item) => item.path === pathname);
  return match?.label ?? 'Overview';
}

function creatorPath(page: CreatorPage): string {
  return navigationDefinitions.find((item) => item.label === page)?.path ?? '/creator/overview';
}

function readableError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'DigiStream could not complete that request.';
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

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

function PageIntro({ children, title }: { children: ReactNode; title: string }) {
  return (
    <header className="workspace-page-intro">
      <h2>{title}</h2>
      <p>{children}</p>
    </header>
  );
}

function OrganisationSetup({
  busy,
  error,
  onCreate,
}: {
  busy: boolean;
  error: string;
  onCreate(name: string, slug: string): Promise<void>;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate(name, slug || slugify(name));
  }

  return (
    <section className="workspace-onboarding" aria-labelledby="workspace-onboarding-title">
      <div>
        <StatusBadge tone="info">First workspace</StatusBadge>
        <h2 id="workspace-onboarding-title">Create your organisation</h2>
        <p>
          An organisation owns channels, broadcasts, guests and team access. Create one before opening the studio.
        </p>
      </div>
      <form onSubmit={submit}>
        <label>
          Organisation name
          <input
            maxLength={120}
            minLength={2}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!slugEdited) setSlug(slugify(nextName));
            }}
            placeholder="Faith City Church"
            required
            type="text"
            value={name}
          />
        </label>
        <label>
          Public slug
          <input
            maxLength={80}
            minLength={2}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(slugify(event.target.value));
            }}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="faith-city-church"
            required
            type="text"
            value={slug}
          />
          <small>Used in public DigiStream links. Lowercase letters, numbers and hyphens only.</small>
        </label>
        {error ? <div className="workspace-inline-error" role="alert">{error}</div> : null}
        <Button loading={busy} type="submit" variant="primary">
          Create organisation
        </Button>
      </form>
    </section>
  );
}

function CreatorDashboard({
  apiStatus,
  onSignedOut,
  user,
}: {
  apiStatus: PlatformStatus;
  onSignedOut(): void;
  user: AuthUser;
}) {
  const [activeNav, setActiveNav] = useState<CreatorPage>(() =>
    creatorPageFromPath(window.location.pathname),
  );
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loadingOrganisations, setLoadingOrganisations] = useState(true);
  const [organisationError, setOrganisationError] = useState('');
  const [creatingOrganisation, setCreatingOrganisation] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [backstageOpen, setBackstageOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadOrganisations = useCallback(async () => {
    setLoadingOrganisations(true);
    setOrganisationError('');
    try {
      const response = await apiRequest<OrganisationListResponse>('/api/v1/organisations');
      setOrganisations(response.organisations);
    } catch (requestError) {
      setOrganisationError(readableError(requestError));
    } finally {
      setLoadingOrganisations(false);
    }
  }, []);

  useEffect(() => {
    void loadOrganisations();
  }, [loadOrganisations]);

  useEffect(() => {
    const onPopState = () => setActiveNav(creatorPageFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function selectNavigation(label: CreatorPage) {
    setActiveNav(label);
    const path = creatorPath(label);
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function createOrganisation(name: string, slug: string) {
    setCreatingOrganisation(true);
    setOrganisationError('');
    try {
      const response = await apiRequest<OrganisationResponse>('/api/v1/organisations', {
        method: 'POST',
        body: jsonBody({ name: name.trim(), slug }),
      });
      setOrganisations((current) => [response.organisation, ...current]);
    } catch (requestError) {
      setOrganisationError(readableError(requestError));
    } finally {
      setCreatingOrganisation(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      onSignedOut();
    }
  }

  const navigation = useMemo<CreatorNavigationItem[]>(
    () => navigationDefinitions.map((item) => ({
      ...item,
      onSelect: () => selectNavigation(item.label),
    })),
    [],
  );

  const primaryOrganisation = organisations[0] ?? null;
  const firstName = user.displayName.trim().split(/\s+/)[0] || user.displayName;

  const topbarActions = (
    <>
      <Button
        aria-label="Open creator chat"
        icon="chat"
        onClick={() => setChatOpen(true)}
        title="Chat"
        variant="ghost"
      >
        Chat
      </Button>
      <Button
        aria-label="Open creator backstage"
        icon="audience"
        onClick={() => setBackstageOpen(true)}
        title="Backstage"
        variant="ghost"
      >
        Backstage
      </Button>
      <LinkButton
        aria-label="Open listener application"
        href="/listen"
        icon="headphones"
        title="Listen"
        variant="ghost"
      >
        Listen
      </LinkButton>
      <Button
        aria-label={`Sign out ${user.displayName}`}
        icon="user"
        loading={signingOut}
        onClick={signOut}
        title="Sign out"
        variant="ghost"
      >
        Sign out
      </Button>
    </>
  );

  let pageContent: ReactNode;

  if (loadingOrganisations) {
    pageContent = (
      <StatePanel kind="loading" title="Loading creator workspace">
        DigiStream is loading your organisations and creator access.
      </StatePanel>
    );
  } else if (organisationError && organisations.length === 0) {
    pageContent = (
      <StatePanel
        actionLabel="Retry"
        kind="error"
        onAction={() => void loadOrganisations()}
        title="Organisation data could not load"
      >
        {organisationError}
      </StatePanel>
    );
  } else if (!primaryOrganisation) {
    pageContent = (
      <OrganisationSetup
        busy={creatingOrganisation}
        error={organisationError}
        onCreate={createOrganisation}
      />
    );
  } else if (activeNav === 'Overview') {
    pageContent = (
      <>
        <section className="workspace-welcome">
          <div>
            <StatusBadge tone="success">Workspace connected</StatusBadge>
            <h2>Welcome back, {firstName}</h2>
            <p>
              Prepare your next broadcast, check studio audio and manage listeners from DigiStream.
            </p>
            <div className="workspace-welcome-actions">
              <Button icon="broadcast" onClick={() => setStudioOpen(true)} variant="primary">
                Open broadcast studio
              </Button>
              <Button icon="audience" onClick={() => setBackstageOpen(true)}>
                Manage backstage
              </Button>
              <LinkButton href="/listen" icon="headphones">
                Open listener app
              </LinkButton>
            </div>
          </div>
          <div className="signal-visual" aria-label="Decorative DigiStream audio waveform">
            {[34, 58, 82, 44, 96, 64, 40, 74, 52, 86, 36, 66].map((height, index) => (
              <i key={`${height}-${index}`} style={{ height: `${height}%` }} />
            ))}
          </div>
        </section>

        <section className="metrics-grid" aria-label="Creator workspace summary">
          <MetricCard label="Organisation" value={primaryOrganisation.name} note={`${primaryOrganisation.role} access · /${primaryOrganisation.slug}`} />
          <MetricCard label="Live listeners" value="—" note="Available during verified live delivery" />
          <MetricCard label="Published recordings" value="—" note="Open Replay to manage real recording jobs" />
          <MetricCard label="API" value="Online" note={`${apiStatus.product} application server connected`} />
        </section>

        <div className="content-grid">
          <Panel title="Broadcast studio" action="Open studio" onAction={() => setStudioOpen(true)}>
            <StatePanel kind="empty" title="No broadcast selected">
              Open the studio to select an organisation, channel and draft or scheduled broadcast.
            </StatePanel>
          </Panel>
          <Panel title="Audio readiness" action="Run sound check" onAction={() => setStudioOpen(true)}>
            <div className="audio-device">
              <div className="device-icon" aria-hidden="true">◍</div>
              <div>
                <strong>Microphone not prepared</strong>
                <span>Permission is requested only when you open Broadcast Studio.</span>
              </div>
            </div>
            <div className="level-meter" aria-label="Inactive audio level meter">
              {Array.from({ length: 18 }, (_, index) => <i key={index} />)}
            </div>
            <Button fullWidth icon="microphone" onClick={() => setStudioOpen(true)}>
              Run sound check
            </Button>
          </Panel>
        </div>
      </>
    );
  } else if (activeNav === 'Broadcasts') {
    pageContent = (
      <CreatorBroadcastsPage
        onOpenStudio={() => setStudioOpen(true)}
        organisation={primaryOrganisation}
      />
    );
  } else if (activeNav === 'Backstage') {
    pageContent = (
      <>
        <PageIntro title="Backstage and call-ins">
          Review listener requests, create guest invitations, admit waiting participants and control live-stage access.
        </PageIntro>
        <section className="workspace-action-card">
          <div>
            <StatusBadge tone="info">Call-in moderation</StatusBadge>
            <h2>Open the producer call-in desk</h2>
            <p>
              Select a broadcast, review pending listener requests and approve a caller to generate a secure guest link. The same workspace also manages invited guests and connected participants for {primaryOrganisation.name}.
            </p>
          </div>
          <Button icon="audience" onClick={() => setBackstageOpen(true)} variant="primary">
            Open call-in desk
          </Button>
        </section>
        <StatePanel kind="empty" title="No broadcast selected for backstage">
          Open the call-in desk to select a scheduled or active broadcast. Pending requests, guest links and participant controls load only from the selected broadcast.
        </StatePanel>
      </>
    );
  } else if (activeNav === 'Recordings') {
    pageContent = <CreatorRecordingsPage organisation={primaryOrganisation} />;
  } else {
    pageContent = (
      <>
        <PageIntro title="Analytics">
          Understand real listener reach, concurrent audience and listening duration after analytics collection is available.
        </PageIntro>
        <StatePanel kind="empty" title="Analytics collection is not implemented yet">
          DigiStream will not display invented charts or health scores. This page remains honest until measured event data is available.
        </StatePanel>
      </>
    );
  }

  return (
    <CreatorShell
      actions={topbarActions}
      activeLabel={activeNav}
      eyebrow="Creator workspace"
      navigation={navigation}
      title={activeNav}
      workspaceDescription={user.email}
      workspaceName={primaryOrganisation?.name ?? 'Creator workspace'}
    >
      {pageContent}
      {studioOpen ? (
        <CreatorBroadcastStudio onClose={() => setStudioOpen(false)} open />
      ) : null}
      {backstageOpen ? (
        <CreatorBackstageWorkspace onClose={() => setBackstageOpen(false)} open />
      ) : null}
      {chatOpen ? (
        <CreatorChatWorkspace onClose={() => setChatOpen(false)} open />
      ) : null}
    </CreatorShell>
  );
}

function CreatorApplication() {
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [offlineMessage, setOfflineMessage] = useState('');

  const checkApplication = useCallback(async () => {
    setChecking(true);
    setOfflineMessage('');
    try {
      const platformStatus = await apiRequest<PlatformStatus>('/api/v1/status');
      setStatus(platformStatus);
      try {
        const session = await apiRequest<AuthUserResponse>('/api/v1/auth/me');
        setUser(session.user);
      } catch (requestError) {
        if (requestError instanceof ApiClientError && requestError.status === 401) {
          setUser(null);
        } else {
          throw requestError;
        }
      }
    } catch (requestError) {
      setStatus(null);
      setUser(null);
      setOfflineMessage(readableError(requestError));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkApplication();
  }, [checkApplication]);

  if (checking) {
    return (
      <main className="application-gate">
        <StatePanel kind="loading" title="Opening DigiStream">
          Checking the application server and your secure creator session.
        </StatePanel>
      </main>
    );
  }

  if (!status) {
    return (
      <main className="application-gate">
        <StatePanel
          actionLabel="Retry connection"
          kind="offline"
          onAction={() => void checkApplication()}
          title="Cannot connect to DigiStream"
        >
          {offlineMessage || 'Start the DigiStream API and try again.'}
        </StatePanel>
        <LinkButton href="/listen" icon="headphones" variant="ghost">
          Open listener app
        </LinkButton>
      </main>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        initialMode={window.location.pathname === '/signup' ? 'register' : 'login'}
        onAuthenticated={setUser}
      />
    );
  }

  return (
    <CreatorDashboard
      apiStatus={status}
      onSignedOut={() => setUser(null)}
      user={user}
    />
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
  if (listenerRoute?.kind === 'replay-discovery') {
    return (
      <ListenerShell current="replay">
        <ReplayDiscoveryPage />
      </ListenerShell>
    );
  }
  if (
    listenerRoute?.kind === 'public-replay' ||
    listenerRoute?.kind === 'member-replay'
  ) {
    return (
      <ListenerShell
        current="replay"
        footer="Replay access is short-lived and private. DigiStream rechecks recording visibility and retention state before playback."
      >
        <ReplayListeningPage route={listenerRoute} />
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

  return <CreatorApplication />;
}
