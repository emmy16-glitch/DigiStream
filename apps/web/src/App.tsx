import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import type {
  AuthUser,
  AuthUserResponse,
  Broadcast,
  BroadcastListResponse,
  Channel,
  ChannelListResponse,
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
import { CreatorAnalyticsPage } from './features/analytics/CreatorAnalyticsPage';
import { CreatorBroadcastsPage } from './features/broadcasting/CreatorBroadcastsPage';
import { CreatorBroadcastStudio } from './features/broadcasting/CreatorBroadcastStudio';
import type { RequestedStudioContext } from './features/broadcasting/studio-context-selection';
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
import { creatorSetupState } from './features/onboarding/creator-setup-state';
import { CreatorOverviewPage } from './features/onboarding/CreatorOverviewPage';
import { creatorOverviewDerivation } from './features/onboarding/overview-state';
import { CreatorRecordingsPage } from './features/recordings/CreatorRecordingsPage';
import { ApiClientError, apiRequest, jsonBody } from './lib/api-client';

type CreatorPage =
  | 'Overview'
  | 'Broadcasts'
  | 'Studio Lobby'
  | 'Chat'
  | 'Recordings'
  | 'Analytics';

type NavigationDefinition = {
  icon: IconName;
  label: CreatorPage;
  path: string;
  shortLabel: string;
};

type OrganisationCreateResult =
  | { kind: 'created' }
  | { kind: 'slug-conflict'; submittedSlug: string }
  | { kind: 'error'; message: string };

const navigationDefinitions: NavigationDefinition[] = [
  { label: 'Overview', shortLabel: 'Home', icon: 'home', path: '/creator/overview' },
  { label: 'Broadcasts', shortLabel: 'Streams', icon: 'broadcast', path: '/creator/broadcasts' },
  { label: 'Studio Lobby', shortLabel: 'Lobby', icon: 'audience', path: '/creator/studio-lobby' },
  { label: 'Chat', shortLabel: 'Chat', icon: 'chat', path: '/creator/chat' },
  { label: 'Recordings', shortLabel: 'Replay', icon: 'recording', path: '/creator/recordings' },
  { label: 'Analytics', shortLabel: 'Stats', icon: 'analytics', path: '/creator/analytics' },
];

function creatorPageFromPath(pathname: string): CreatorPage {
  if (pathname === '/creator/audience') return 'Studio Lobby';
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

function PageIntro({ children, title }: { children: ReactNode; title: string }) {
  return (
    <header className="workspace-page-intro">
      <h2>{title}</h2>
      <p>{children}</p>
    </header>
  );
}

function CreatorIntentChoice({ onBroadcast }: { onBroadcast(): void }) {
  return (
    <section className="workspace-onboarding" aria-labelledby="creator-intent-title">
      <div>
        <StatusBadge tone="info">Choose how to continue</StatusBadge>
        <h2 id="creator-intent-title">What would you like to do?</h2>
        <p>Choose whether you want to listen or create a broadcast.</p>
      </div>
      <div className="workspace-welcome-actions">
        <Button icon="broadcast" onClick={onBroadcast} variant="primary">
          Broadcast audio
        </Button>
        <LinkButton href="/listen" icon="headphones">
          Listen to broadcasts
        </LinkButton>
      </div>
    </section>
  );
}

function OrganisationSetup({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate(name: string, slug: string): Promise<OrganisationCreateResult>;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const submittingRef = useRef(false);
  const slugValueRef = useRef('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || busy) return;

    const submittedSlug = slug || slugify(name);
    submittingRef.current = true;
    setSlugError('');
    setSubmissionError('');

    try {
      const result = await onCreate(name, submittedSlug);
      if (
        result.kind === 'slug-conflict' &&
        slugValueRef.current === result.submittedSlug
      ) {
        setSlugError('That web address is already in use. Choose another one.');
        window.requestAnimationFrame(() => {
          document.getElementById('organisation-slug')?.focus();
        });
      } else if (result.kind === 'error') {
        setSubmissionError(result.message);
      }
    } finally {
      submittingRef.current = false;
    }
  }

  return (
    <section className="workspace-onboarding" aria-labelledby="workspace-onboarding-title">
      <div>
        <StatusBadge tone="info">Step 1 of 3</StatusBadge>
        <h2 id="workspace-onboarding-title">Set up your creator workspace</h2>
        <p>Create your organisation to continue to channel setup.</p>
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
              setSubmissionError('');
              if (!slugEdited) {
                const nextSlug = slugify(nextName);
                setSlug(nextSlug);
                slugValueRef.current = nextSlug;
                setSlugError('');
              }
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
            aria-describedby="organisation-slug-help organisation-slug-error"
            aria-invalid={slugError ? 'true' : undefined}
            id="organisation-slug"
            maxLength={80}
            minLength={2}
            onChange={(event) => {
              const nextSlug = slugify(event.target.value);
              setSlugEdited(true);
              setSlug(nextSlug);
              slugValueRef.current = nextSlug;
              setSlugError('');
              setSubmissionError('');
            }}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="faith-city-church"
            required
            type="text"
            value={slug}
          />
          <small id="organisation-slug-help">Used in public DigiStream links. Lowercase letters, numbers and hyphens only.</small>
          {slugError ? (
            <span className="workspace-inline-error" id="organisation-slug-error" role="alert">
              {slugError}
            </span>
          ) : null}
        </label>
        {submissionError ? (
          <div className="workspace-inline-error" role="alert">{submissionError}</div>
        ) : null}
        <Button loading={busy} type="submit" variant="primary">
          Continue to channel setup
        </Button>
      </form>
    </section>
  );
}

function CreatorDashboard({
  onSignedOut,
  user,
}: {
  onSignedOut(): void;
  user: AuthUser;
}) {
  const [activeNav, setActiveNav] = useState<CreatorPage>(() =>
    creatorPageFromPath(window.location.pathname),
  );
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loadingOrganisations, setLoadingOrganisations] = useState(true);
  const [organisationError, setOrganisationError] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loadingOverviewState, setLoadingOverviewState] = useState(false);
  const [overviewStateError, setOverviewStateError] = useState('');
  const [creatingOrganisation, setCreatingOrganisation] = useState(false);
  const [creatorIntentChosen, setCreatorIntentChosen] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioContext, setStudioContext] = useState<RequestedStudioContext>({});
  const [backstageOpen, setBackstageOpen] = useState(false);
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

  const loadOverviewState = useCallback(async () => {
    const organisation = organisations[0] ?? null;
    if (!organisation) {
      setChannels([]);
      setBroadcasts([]);
      setLoadingOverviewState(false);
      return;
    }
    setLoadingOverviewState(true);
    setOverviewStateError('');
    try {
      const channelResponse = await apiRequest<ChannelListResponse>(
        `/api/v1/organisations/${organisation.id}/channels`,
      );
      setChannels(channelResponse.channels);
      const broadcastResponses = await Promise.all(
        channelResponse.channels.map((channel) =>
          apiRequest<BroadcastListResponse>(
            `/api/v1/organisations/${organisation.id}/channels/${channel.id}/broadcasts`,
          ),
        ),
      );
      setBroadcasts(broadcastResponses.flatMap((response) => response.broadcasts));
    } catch (requestError) {
      setOverviewStateError(readableError(requestError));
      setChannels([]);
      setBroadcasts([]);
    } finally {
      setLoadingOverviewState(false);
    }
  }, [organisations]);

  useLayoutEffect(() => {
    if (activeNav === 'Overview') void loadOverviewState();
  }, [activeNav, loadOverviewState]);

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

  function openBroadcastsSetup() {
    selectNavigation('Broadcasts');
    window.requestAnimationFrame(() => {
      document.getElementById('create-broadcast-title')?.focus();
    });
  }

  function openStudio(context?: RequestedStudioContext) {
    setStudioContext(context ?? {});
    setStudioOpen(true);
  }

  function closeStudio() {
    setStudioOpen(false);
    setStudioContext({});
  }

  async function createOrganisation(
    name: string,
    slug: string,
  ): Promise<OrganisationCreateResult> {
    setCreatingOrganisation(true);
    try {
      const response = await apiRequest<OrganisationResponse>('/api/v1/organisations', {
        method: 'POST',
        body: jsonBody({ name: name.trim(), slug }),
      });
      setOrganisations((current) => [response.organisation, ...current]);
      selectNavigation('Broadcasts');
      window.requestAnimationFrame(() => {
        document.getElementById('create-channel-title')?.focus();
      });
      return { kind: 'created' };
    } catch (requestError) {
      if (
        requestError instanceof ApiClientError &&
        requestError.status === 409 &&
        requestError.code === 'ORGANISATION_SLUG_TAKEN'
      ) {
        return { kind: 'slug-conflict', submittedSlug: slug };
      }

      return { kind: 'error', message: readableError(requestError) };
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
  const overviewState = creatorOverviewDerivation({ channels, broadcasts });
  const setupState = creatorSetupState({
    intentChosen: creatorIntentChosen || Boolean(primaryOrganisation),
    hasOrganisation: Boolean(primaryOrganisation),
    channelStatus: overviewState.channelStatus,
    broadcastStatus: overviewState.broadcastStatus,
  });
  const overviewStudioContext: RequestedStudioContext | undefined =
    primaryOrganisation && overviewState.selectedChannel && overviewState.selectedBroadcast
      ? {
          organisationId: primaryOrganisation.id,
          channelId: overviewState.selectedChannel.id,
          broadcastId: overviewState.selectedBroadcast.id,
        }
      : undefined;

  const topbarActions = (
    <>
      <Button
        aria-label="Open creator chat"
        icon="chat"
        onClick={() => selectNavigation('Chat')}
        title="Chat"
        variant="ghost"
      >
        Chat
      </Button>
      {overviewState.canOpenBackstage ? (
        <Button
          aria-label="Open Studio Lobby"
          icon="audience"
          onClick={() => setBackstageOpen(true)}
          title="Studio Lobby"
          variant="ghost"
        >
          Studio Lobby
        </Button>
      ) : null}
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
  } else if (setupState === 'choose_intent') {
    pageContent = <CreatorIntentChoice onBroadcast={() => setCreatorIntentChosen(true)} />;
  } else if (!primaryOrganisation) {
    pageContent = (
      <OrganisationSetup
        busy={creatingOrganisation}
        onCreate={createOrganisation}
      />
    );
  } else if (activeNav === 'Overview') {
    if (loadingOverviewState) {
      pageContent = (
        <StatePanel kind="loading" title="Loading creator overview">
          Echoo is loading your real channel and broadcast state.
        </StatePanel>
      );
    } else if (overviewStateError) {
      pageContent = (
        <StatePanel
          actionLabel="Retry"
          kind="error"
          onAction={() => void loadOverviewState()}
          title="Creator overview could not load"
        >
          {overviewStateError}
        </StatePanel>
      );
    } else {
      pageContent = (
        <CreatorOverviewPage
          broadcasts={broadcasts}
          channels={channels}
          firstName={firstName}
          onOpenBackstage={() => setBackstageOpen(true)}
          onOpenBroadcasts={openBroadcastsSetup}
          onOpenRecordings={() => selectNavigation('Recordings')}
          onOpenStudio={() => openStudio(overviewStudioContext)}
          organisation={primaryOrganisation}
          overview={overviewState}
          setupState={setupState}
        />
      );
    }
  } else if (activeNav === 'Broadcasts') {
    pageContent = (
      <CreatorBroadcastsPage
        onOpenStudio={openStudio}
        organisation={primaryOrganisation}
      />
    );
  } else if (activeNav === 'Studio Lobby') {
    pageContent = (
      <>
        <PageIntro title="Studio Lobby and call-ins">
          Review listener requests, create guest invitations, admit waiting participants and manage who can join the live conversation.
        </PageIntro>
        <section className="workspace-action-card">
          <div>
            <StatusBadge tone="info">Guest and call-in moderation</StatusBadge>
            <h2>Open the Studio Lobby</h2>
            <p>
              Select a broadcast, review pending listener requests and approve a caller to generate a secure guest link. The same workspace also manages invited guests and connected participants for {primaryOrganisation.name}.
            </p>
          </div>
          <Button icon="audience" onClick={() => setBackstageOpen(true)} variant="primary">
            Open Studio Lobby
          </Button>
        </section>
        <StatePanel kind="empty" title="No broadcast selected for Studio Lobby">
          Open the Studio Lobby to select a scheduled or active broadcast. Pending requests, guest links and participant controls load only from the selected broadcast.
        </StatePanel>
      </>
    );
  } else if (activeNav === 'Chat') {
    pageContent = <CreatorChatWorkspace />;
  } else if (activeNav === 'Recordings') {
    pageContent = <CreatorRecordingsPage organisation={primaryOrganisation} />;
  } else {
    pageContent = <CreatorAnalyticsPage organisation={primaryOrganisation} />;
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
        <CreatorBroadcastStudio
          onClose={closeStudio}
          open
          requestedContext={studioContext}
        />
      ) : null}
      {backstageOpen ? (
        <CreatorBackstageWorkspace onClose={() => setBackstageOpen(false)} open />
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
