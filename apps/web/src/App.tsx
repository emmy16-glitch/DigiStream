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
import { AboutPage } from './landing/AboutPage';
import {
  Button,
  LinkButton,
  StatePanel,
  StatusBadge,
} from './design-system/components';
import { Icon } from './design-system/Icon';
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
import { ListenerLibraryPage } from './features/listening/ListenerLibraryPage';
import { PublicChannelPage } from './features/listening/PublicChannelPage';
import { PublicCreatorProfilePage } from './features/listening/PublicCreatorProfilePage';
import { ReplayDiscoveryPage } from './features/listening/ReplayDiscoveryPage';
import { ReplayListeningPage } from './features/listening/ReplayListeningPage';
import { parseListenerRoute } from './features/listening/listener-route';
import {
  readCreatorWorkspacePreference,
  resolveCreatorWorkspaceOrganisation,
  writeCreatorWorkspacePreference,
} from './features/onboarding/creator-workspace-selection';
import { creatorSetupState } from './features/onboarding/creator-setup-state';
import { CreatorOverviewPage } from './features/onboarding/CreatorOverviewPage';
import { creatorOverviewDerivation } from './features/onboarding/overview-state';
import { CreatorRecordingsPage } from './features/recordings/CreatorRecordingsPage';
import { AcceptInvitationPage, ActiveSessionsPage, ChannelSettingsPage, ForgotPasswordPage, NotificationsPage, OrganisationSettingsPage, ProfileSettingsPage, ResetPasswordPage, TeamInvitationsPage, VerifyEmailPage } from './features/account/ProfileSettingsPage';
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
        <h2 id="creator-intent-title">What would you like to do?</h2>
        <p>Choose whether you want to listen or create a broadcast.</p>
      </div>
      <div className="workspace-welcome-actions">
        <article className="creator-intent-option">
          <span className="creator-intent-option-icon" aria-hidden="true">
            <Icon name="broadcast" />
          </span>
          <h3>Broadcast audio</h3>
          <p>Create and manage broadcasts for your audience.</p>
          <Button className="creator-intent-option-action" fullWidth icon="arrow-right" onClick={onBroadcast} variant="primary">
            Continue
          </Button>
        </article>
        <article className="creator-intent-option">
          <span className="creator-intent-option-icon" aria-hidden="true">
            <Icon name="headphones" />
          </span>
          <h3>Listen to broadcasts</h3>
          <p>Discover and listen to live audio.</p>
          <LinkButton className="creator-intent-option-action" fullWidth href="/listen" icon="arrow-right" variant="primary">
            Continue
          </LinkButton>
        </article>
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

  useEffect(() => {
    document.getElementById('workspace-onboarding-title')?.focus();
  }, []);

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
        <h2 id="workspace-onboarding-title" tabIndex={-1}>Set up your creator workspace</h2>
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
          <small id="organisation-slug-help">Used in public Echoo links. Lowercase letters, numbers and hyphens only.</small>
          {slugError ? (
            <span className="workspace-inline-error" id="organisation-slug-error" role="alert">
              {slugError}
            </span>
          ) : null}
        </label>
        {submissionError ? (
          <div className="workspace-inline-error" role="alert">{submissionError}</div>
        ) : null}
        <Button icon="broadcast" loading={busy} type="submit" variant="primary">
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
  const [preferredOrganisationId, setPreferredOrganisationId] = useState<string | null>(
    () => readCreatorWorkspacePreference(window.localStorage, user.id),
  );
  const overviewRequestIdRef = useRef(0);
  const selectedOrganisation = resolveCreatorWorkspaceOrganisation(
    organisations,
    preferredOrganisationId,
  );
  const selectedOrganisationId = selectedOrganisation?.id ?? null;

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
    if (loadingOrganisations || organisationError) return;
    if (preferredOrganisationId === selectedOrganisationId) return;

    setPreferredOrganisationId(selectedOrganisationId);
    writeCreatorWorkspacePreference(
      window.localStorage,
      user.id,
      selectedOrganisationId,
    );
  }, [
    loadingOrganisations,
    organisationError,
    preferredOrganisationId,
    selectedOrganisationId,
    user.id,
  ]);

  const loadOverviewState = useCallback(async () => {
    const requestId = ++overviewRequestIdRef.current;
    const organisationId = selectedOrganisationId;

    if (!organisationId) {
      setChannels([]);
      setBroadcasts([]);
      setOverviewStateError('');
      setLoadingOverviewState(false);
      return;
    }

    setChannels([]);
    setBroadcasts([]);
    setLoadingOverviewState(true);
    setOverviewStateError('');

    try {
      const channelResponse = await apiRequest<ChannelListResponse>(
        `/api/v1/organisations/${organisationId}/channels`,
      );
      if (requestId !== overviewRequestIdRef.current) return;

      const broadcastResponses = await Promise.all(
        channelResponse.channels.map((channel) =>
          apiRequest<BroadcastListResponse>(
            `/api/v1/organisations/${organisationId}/channels/${channel.id}/broadcasts`,
          ),
        ),
      );
      if (requestId !== overviewRequestIdRef.current) return;

      setChannels(channelResponse.channels);
      setBroadcasts(broadcastResponses.flatMap((response) => response.broadcasts));
    } catch (requestError) {
      if (requestId !== overviewRequestIdRef.current) return;
      setOverviewStateError(readableError(requestError));
      setChannels([]);
      setBroadcasts([]);
    } finally {
      if (requestId === overviewRequestIdRef.current) {
        setLoadingOverviewState(false);
      }
    }
  }, [selectedOrganisationId]);

  useLayoutEffect(() => {
    if (activeNav === 'Overview' || activeNav === 'Studio Lobby') void loadOverviewState();
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

  function selectOrganisation(organisationId: string) {
    const nextOrganisation = organisations.find(
      (organisation) => organisation.id === organisationId,
    );
    if (!nextOrganisation || nextOrganisation.id === selectedOrganisationId) return;

    overviewRequestIdRef.current += 1;
    setChannels([]);
    setBroadcasts([]);
    setOverviewStateError('');
    setLoadingOverviewState(activeNav === 'Overview' || activeNav === 'Studio Lobby');
    setPreferredOrganisationId(nextOrganisation.id);
    writeCreatorWorkspacePreference(
      window.localStorage,
      user.id,
      nextOrganisation.id,
    );
  }

  function openBroadcastsSetup() {
    selectNavigation('Broadcasts');
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
      overviewRequestIdRef.current += 1;
      setChannels([]);
      setBroadcasts([]);
      setPreferredOrganisationId(response.organisation.id);
      writeCreatorWorkspacePreference(
        window.localStorage,
        user.id,
        response.organisation.id,
      );
      setOrganisations((current) => [response.organisation, ...current]);
      selectNavigation('Broadcasts');
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

  const firstName = user.displayName.trim().split(/\s+/)[0] || user.displayName;
  const overviewState = creatorOverviewDerivation({ channels, broadcasts });
  const setupState = creatorSetupState({
    intentChosen: creatorIntentChosen || Boolean(selectedOrganisation),
    hasOrganisation: Boolean(selectedOrganisation),
    channelStatus: overviewState.channelStatus,
    broadcastStatus: overviewState.broadcastStatus,
  });
  const overviewStudioContext: RequestedStudioContext | undefined =
    selectedOrganisation && overviewState.selectedChannel && overviewState.selectedBroadcast
      ? {
          organisationId: selectedOrganisation.id,
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
      <LinkButton aria-label="Open profile settings" href="/account/profile" icon="user" title="Profile settings" variant="ghost">
        Profile
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
  } else if (!selectedOrganisation) {
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
          organisation={selectedOrganisation}
          overview={overviewState}
          setupState={setupState}
        />
      );
    }
  } else if (activeNav === 'Broadcasts') {
    pageContent = (
      <CreatorBroadcastsPage
        onOpenStudio={openStudio}
        organisation={selectedOrganisation}
      />
    );
  } else if (activeNav === 'Studio Lobby') {
    const lobbyBroadcast = overviewState.selectedBroadcast;
    const lobbyEligible = Boolean(lobbyBroadcast && overviewState.canOpenBackstage);
    pageContent = loadingOverviewState ? (
      <StatePanel kind="loading" title="Loading Studio Lobby eligibility">
        Echoo is checking the selected workspace's real broadcast lifecycle.
      </StatePanel>
    ) : overviewStateError ? (
      <StatePanel actionLabel="Retry" kind="error" onAction={() => void loadOverviewState()} title="Studio Lobby eligibility could not load">
        {overviewStateError}
      </StatePanel>
    ) : (
      <>
        <section className="workspace-action-card workspace-lobby-state">
          <div>
            <StatusBadge tone="info">Guest and call-in moderation</StatusBadge>
            <h2>{lobbyEligible ? lobbyBroadcast?.title ?? 'Studio Lobby is ready' : 'Studio Lobby is not available yet'}</h2>
            <p>
              {lobbyEligible
                ? `${lobbyBroadcast?.title ?? 'The selected broadcast'} is ${lobbyBroadcast?.status}. Review real call-ins, invited guests and connected participants.`
                : lobbyBroadcast?.status === 'draft'
                  ? `${lobbyBroadcast.title} is still a draft. Finish setup or schedule the broadcast before opening its Studio Lobby.`
                  : broadcasts.length === 0
                    ? 'Create a broadcast before opening a Studio Lobby.'
                    : 'Only scheduled, starting, live or reconnecting broadcasts can open the Studio Lobby.'}
            </p>
          </div>
          {lobbyEligible ? (
            <Button icon="audience" onClick={() => setBackstageOpen(true)} variant="primary">Open Studio Lobby</Button>
          ) : (
            <Button icon="broadcast" onClick={() => selectNavigation('Broadcasts')} variant="primary">
              {lobbyBroadcast?.status === 'draft' ? 'Continue broadcast setup' : 'Go to Broadcasts'}
            </Button>
          )}
        </section>
      </>
    );
  } else if (activeNav === 'Chat') {
    pageContent = <CreatorChatWorkspace />;
  } else if (activeNav === 'Recordings') {
    pageContent = <CreatorRecordingsPage organisation={selectedOrganisation} />;
  } else {
    pageContent = <CreatorAnalyticsPage organisation={selectedOrganisation} />;
  }

  return (
    <CreatorShell
      actions={topbarActions}
      activeLabel={activeNav}
      eyebrow="Creator workspace"
      navigation={navigation}
      onWorkspaceChange={selectOrganisation}
      title={activeNav}
      workspaceDescription={user.email}
      workspaceId={selectedOrganisation?.id}
      workspaceName={selectedOrganisation?.name ?? 'Creator workspace'}
      workspaceOptions={organisations}
      workspaceSelectionDisabled={studioOpen || backstageOpen}
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

  if (window.location.pathname === '/account/profile') return <ProfileSettingsPage />;
  if (window.location.pathname === '/account/sessions') return <ActiveSessionsPage />;
  if (window.location.pathname === '/account/notifications') return <NotificationsPage />;
  if (window.location.pathname === '/organisation/settings') return <OrganisationSettingsPage />;
  if (window.location.pathname === '/organisation/team') return <TeamInvitationsPage />;
  if (window.location.pathname === '/invite') return <AcceptInvitationPage />;
  if (window.location.pathname === '/channel/settings') return <ChannelSettingsPage />;

  return (
    <CreatorDashboard
      onSignedOut={() => setUser(null)}
      user={user}
    />
  );
}

export function App() {
  if (window.location.pathname === '/about') return <AboutPage />;
  if (window.location.pathname === '/creator-profile') return <PublicCreatorProfilePage />;
  if (window.location.pathname === '/forgot-password') return <ForgotPasswordPage />;
  if (window.location.pathname === '/reset-password') return <ResetPasswordPage />;
  if (window.location.pathname === '/verify-email') return <VerifyEmailPage />;
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
  if (listenerRoute?.kind === 'library') {
    return <ListenerShell current="discover"><ListenerLibraryPage /></ListenerShell>;
  }
  if (listenerRoute?.kind === 'channel') {
    return <ListenerShell current="discover"><PublicChannelPage route={listenerRoute} /></ListenerShell>;
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
