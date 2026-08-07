import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import type {
  Broadcast,
  BroadcastListResponse,
  BroadcastResponse,
  Channel,
  ChannelListResponse,
  ChannelResponse,
  Organisation,
} from '@digistream/contracts';
import {
  Button,
  StatePanel,
  StatusBadge,
  type StatusTone,
} from '../../design-system/components';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import {
  presentationLabel,
  presentationStatus,
  type BroadcastPresentationStatus,
} from '../../lib/broadcast-lifecycle';
import './creator-broadcasts-page.css';

type StudioContext = {
  organisationId: string;
  channelId: string;
  broadcastId: string;
};

type CreatorBroadcastsPageProps = {
  organisation: Organisation;
  onOpenStudio(context?: StudioContext): void;
};

type ChannelFormState = {
  name: string;
  slug: string;
  description: string;
  category: string;
  visibility: Channel['visibility'];
};

type BroadcastFormState = {
  title: string;
  slug: string;
  description: string;
  scheduledStartAt: string;
};

type FirstBroadcastChoice = 'go-live' | 'schedule' | 'finish-later' | null;

const emptyChannelForm: ChannelFormState = {
  name: '',
  slug: '',
  description: '',
  category: '',
  visibility: 'public',
};

const emptyBroadcastForm: BroadcastFormState = {
  title: '',
  slug: '',
  description: '',
  scheduledStartAt: '',
};

function readableError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'DigiStream could not complete that request.';
}

function slugify(value: string, maxLength: number): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}

function statusTone(status: BroadcastPresentationStatus): StatusTone {
  if (status === 'overdue') return 'warning';
  if (status === 'live') return 'live';
  if (status === 'scheduled' || status === 'starting' || status === 'reconnecting') {
    return 'info';
  }
  if (status === 'completed') return 'success';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  if (status === 'ending') return 'warning';
  return 'neutral';
}

function channelTone(status: Channel['status']): StatusTone {
  if (status === 'active') return 'success';
  if (status === 'pending_review') return 'warning';
  if (status === 'suspended' || status === 'archived') return 'danger';
  return 'neutral';
}

function sentenceCase(value: string): string {
  return value.replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function minimumScheduleValue(): string {
  const date = new Date(Date.now() + 5 * 60_000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function CreatorBroadcastsPage({
  organisation,
  onOpenStudio,
}: CreatorBroadcastsPageProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [channelError, setChannelError] = useState('');
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [channelForm, setChannelForm] = useState<ChannelFormState>(emptyChannelForm);
  const [channelSlugEdited, setChannelSlugEdited] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [activatingChannelId, setActivatingChannelId] = useState<string | null>(null);
  const [activationRetryChannelId, setActivationRetryChannelId] = useState<string | null>(null);

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [broadcastError, setBroadcastError] = useState('');
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState<BroadcastFormState>(emptyBroadcastForm);
  const [broadcastSlugEdited, setBroadcastSlugEdited] = useState(false);
  const [creatingBroadcast, setCreatingBroadcast] = useState(false);
  const [firstBroadcastChoice, setFirstBroadcastChoice] = useState<FirstBroadcastChoice>(null);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );

  const canApproveChannel =
    organisation.role === 'owner' || organisation.role === 'admin';
  const firstChannelSetup = !loadingChannels && channels.length === 0;
  const firstBroadcastSetup =
    !loadingBroadcasts &&
    Boolean(selectedChannel) &&
    selectedChannel?.status === 'active' &&
    broadcasts.length === 0;

  const replaceChannel = useCallback((channel: Channel) => {
    setChannels((current) => current.map((item) => (
      item.id === channel.id ? channel : item
    )));
  }, []);

  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    setChannelError('');
    try {
      const response = await apiRequest<ChannelListResponse>(
        `/api/v1/organisations/${organisation.id}/channels`,
      );
      setChannels(response.channels);
      setSelectedChannelId((current) => {
        if (response.channels.some((channel) => channel.id === current)) return current;
        return response.channels[0]?.id ?? '';
      });
      if (response.channels.length === 0) setShowChannelForm(true);
    } catch (requestError) {
      setChannelError(readableError(requestError));
    } finally {
      setLoadingChannels(false);
    }
  }, [organisation.id]);

  const loadBroadcasts = useCallback(async (channelId: string) => {
    if (!channelId) {
      setBroadcasts([]);
      return;
    }
    setLoadingBroadcasts(true);
    setBroadcastError('');
    try {
      const response = await apiRequest<BroadcastListResponse>(
        `/api/v1/organisations/${organisation.id}/channels/${channelId}/broadcasts`,
      );
      setBroadcasts(response.broadcasts);
      if (response.broadcasts.length === 0) setShowBroadcastForm(true);
    } catch (requestError) {
      setBroadcastError(readableError(requestError));
    } finally {
      setLoadingBroadcasts(false);
    }
  }, [organisation.id]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    setFirstBroadcastChoice(null);
    setBroadcastForm(emptyBroadcastForm);
    setBroadcastSlugEdited(false);
    void loadBroadcasts(selectedChannelId);
  }, [loadBroadcasts, selectedChannelId]);

  async function activateChannelLifecycle(channel: Channel): Promise<Channel> {
    let updated = channel;
    if (updated.status === 'draft') {
      const reviewResponse = await apiRequest<ChannelResponse>(
        `/api/v1/organisations/${organisation.id}/channels/${channel.id}`,
        {
          method: 'PATCH',
          body: jsonBody({ status: 'pending_review' }),
        },
      );
      updated = reviewResponse.channel;
      replaceChannel(updated);
    }
    if (updated.status === 'pending_review') {
      const activeResponse = await apiRequest<ChannelResponse>(
        `/api/v1/organisations/${organisation.id}/channels/${channel.id}`,
        {
          method: 'PATCH',
          body: jsonBody({ status: 'active' }),
        },
      );
      updated = activeResponse.channel;
      replaceChannel(updated);
    }
    return updated;
  }

  async function createChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingChannel(true);
    setChannelError('');
    setActivationRetryChannelId(null);
    try {
      const response = await apiRequest<ChannelResponse>(
        `/api/v1/organisations/${organisation.id}/channels`,
        {
          method: 'POST',
          body: jsonBody({
            name: channelForm.name.trim(),
            slug: channelForm.slug || slugify(channelForm.name, 80),
            description: channelForm.description.trim() || null,
            category: channelForm.category.trim() || null,
            visibility: channelForm.visibility,
          }),
        },
      );
      setChannels((current) => [...current, response.channel]);
      setSelectedChannelId(response.channel.id);
      setBroadcasts([]);
      setChannelForm(emptyChannelForm);
      setChannelSlugEdited(false);
      setShowChannelForm(false);

      if (canApproveChannel) {
        setActivatingChannelId(response.channel.id);
        try {
          const activated = await activateChannelLifecycle(response.channel);
          if (activated.status === 'active') setShowBroadcastForm(true);
        } catch (activationError) {
          setActivationRetryChannelId(response.channel.id);
          setChannelError(
            `The channel was created, but activation did not finish. ${readableError(activationError)}`,
          );
        } finally {
          setActivatingChannelId(null);
        }
      }
    } catch (requestError) {
      setChannelError(readableError(requestError));
    } finally {
      setCreatingChannel(false);
    }
  }

  async function activateChannel(channel: Channel) {
    if (!canApproveChannel || channel.status === 'active') return;
    setActivatingChannelId(channel.id);
    setChannelError('');
    try {
      const activated = await activateChannelLifecycle(channel);
      setActivationRetryChannelId(null);
      if (activated.status === 'active') setShowBroadcastForm(true);
    } catch (requestError) {
      setActivationRetryChannelId(channel.id);
      setChannelError(
        `The channel remains ${sentenceCase(channel.status).toLowerCase()}. ${readableError(requestError)}`,
      );
    } finally {
      setActivatingChannelId(null);
    }
  }

  function finishFirstBroadcastLater() {
    setFirstBroadcastChoice(null);
    setShowBroadcastForm(false);
    window.history.pushState({}, '', '/creator/overview');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  async function createBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChannel) return;
    if (firstBroadcastSetup && !firstBroadcastChoice) {
      setBroadcastError('Choose Start now, Schedule for later or Finish setup later before continuing.');
      return;
    }
    if (firstBroadcastSetup && firstBroadcastChoice === 'finish-later') {
      finishFirstBroadcastLater();
      return;
    }

    setCreatingBroadcast(true);
    setBroadcastError('');
    try {
      const scheduledStartAt = firstBroadcastChoice === 'schedule'
        ? new Date(broadcastForm.scheduledStartAt).toISOString()
        : broadcastForm.scheduledStartAt
          ? new Date(broadcastForm.scheduledStartAt).toISOString()
          : undefined;
      const response = await apiRequest<BroadcastResponse>(
        `/api/v1/organisations/${organisation.id}/channels/${selectedChannel.id}/broadcasts`,
        {
          method: 'POST',
          body: jsonBody({
            title: broadcastForm.title.trim(),
            slug: broadcastForm.slug || slugify(broadcastForm.title, 100),
            description: broadcastForm.description.trim() || null,
            ...(scheduledStartAt ? { scheduledStartAt } : {}),
          }),
        },
      );
      setBroadcasts((current) => [response.broadcast, ...current]);
      setBroadcastForm(emptyBroadcastForm);
      setBroadcastSlugEdited(false);
      setShowBroadcastForm(false);
      const chosenAction = firstBroadcastChoice;
      setFirstBroadcastChoice(null);

      if (firstBroadcastSetup && chosenAction === 'go-live') {
        onOpenStudio({
          organisationId: organisation.id,
          channelId: selectedChannel.id,
          broadcastId: response.broadcast.id,
        });
      }
    } catch (requestError) {
      setBroadcastError(readableError(requestError));
    } finally {
      setCreatingBroadcast(false);
    }
  }

  return (
    <div className="creator-broadcasts-page">
      <header className="workspace-page-intro creator-broadcasts-intro">
        <div>
          <h2>Broadcasts</h2>
          <p>Create a channel, prepare a broadcast and open the live studio from one connected workspace.</p>
        </div>
        <div className="creator-broadcasts-intro-actions">
          <Button onClick={() => setShowChannelForm((current) => !current)}>
            {showChannelForm ? 'Close channel form' : 'Create channel'}
          </Button>
          <Button
            disabled={!selectedChannel}
            onClick={() => setShowBroadcastForm((current) => !current)}
            variant="primary"
          >
            {showBroadcastForm ? 'Close broadcast form' : 'Create broadcast'}
          </Button>
        </div>
      </header>

      {channelError ? (
        <StatePanel
          actionLabel="Retry channels"
          kind="error"
          onAction={() => void loadChannels()}
          title="Channel action could not be completed"
        >
          {channelError}
        </StatePanel>
      ) : null}

      {showChannelForm ? (
        <section className="creator-form-card" aria-labelledby="create-channel-title">
          <div className="creator-form-copy">
            <StatusBadge tone="info">
              {firstChannelSetup ? 'Step 2 of 3' : 'Channel setup'}
            </StatusBadge>
            <h3 id="create-channel-title">
              {firstChannelSetup ? 'Create your first channel' : 'Create a channel'}
            </h3>
            <p>
              {firstChannelSetup
                ? 'Your organisation contains channels, and each channel contains broadcasts. Set the listener visibility for this channel now.'
                : 'A channel groups related broadcasts and controls public, unlisted or private visibility.'}
            </p>
            {firstChannelSetup ? <small>Organisation → Channel → Broadcast</small> : null}
          </div>
          <form className="creator-form-grid" onSubmit={createChannel}>
            <label>
              Channel name
              <input
                maxLength={120}
                minLength={2}
                onChange={(event) => {
                  const name = event.target.value;
                  setChannelForm((current) => ({
                    ...current,
                    name,
                    slug: channelSlugEdited ? current.slug : slugify(name, 80),
                  }));
                }}
                placeholder="Sunday services"
                required
                type="text"
                value={channelForm.name}
              />
            </label>
            <label>
              Public slug
              <input
                maxLength={80}
                minLength={3}
                onChange={(event) => {
                  setChannelSlugEdited(true);
                  setChannelForm((current) => ({
                    ...current,
                    slug: slugify(event.target.value, 80),
                  }));
                }}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="sunday-services"
                required
                type="text"
                value={channelForm.slug}
              />
              <small>Public URL: /{organisation.slug}/{channelForm.slug || 'channel-slug'}</small>
            </label>
            <label>
              Category
              <input
                maxLength={40}
                onChange={(event) => setChannelForm((current) => ({
                  ...current,
                  category: slugify(event.target.value, 40),
                }))}
                placeholder="faith"
                type="text"
                value={channelForm.category}
              />
            </label>
            <label>
              Visibility
              <select
                onChange={(event) => setChannelForm((current) => ({
                  ...current,
                  visibility: event.target.value as Channel['visibility'],
                }))}
                value={channelForm.visibility}
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="creator-form-wide">
              Description
              <textarea
                maxLength={2000}
                onChange={(event) => setChannelForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))}
                placeholder="What listeners should expect from this channel"
                rows={3}
                value={channelForm.description}
              />
            </label>
            <div className="creator-form-actions creator-form-wide">
              {!firstChannelSetup ? (
                <Button onClick={() => setShowChannelForm(false)}>Cancel</Button>
              ) : null}
              <Button loading={creatingChannel} type="submit" variant="primary">
                {firstChannelSetup && canApproveChannel
                  ? 'Create and activate channel'
                  : 'Create channel'}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {loadingChannels ? (
        <StatePanel kind="loading" title="Loading channels">
          DigiStream is loading the real channels for {organisation.name}.
        </StatePanel>
      ) : channels.length === 0 && !showChannelForm ? (
        <StatePanel
          actionLabel="Create channel"
          kind="empty"
          onAction={() => setShowChannelForm(true)}
          title="Create your first channel"
        >
          A channel is required before a broadcast can be created or opened in the Studio.
        </StatePanel>
      ) : channels.length > 0 ? (
        <>
          <section className="channel-strip" aria-label="Organisation channels">
            <div className="channel-strip-heading">
              <div>
                <span>Current channel</span>
                <strong>{selectedChannel?.name ?? 'Select a channel'}</strong>
              </div>
              <select
                aria-label="Select channel"
                onChange={(event) => setSelectedChannelId(event.target.value)}
                value={selectedChannelId}
              >
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>{channel.name}</option>
                ))}
              </select>
            </div>

            {selectedChannel ? (
              <div className="channel-summary">
                <div>
                  <StatusBadge tone={channelTone(selectedChannel.status)}>
                    {sentenceCase(selectedChannel.status)}
                  </StatusBadge>
                  <StatusBadge tone="neutral">{sentenceCase(selectedChannel.visibility)}</StatusBadge>
                </div>
                <p>{selectedChannel.description || 'No channel description has been added.'}</p>
                <small>/{organisation.slug}/{selectedChannel.slug}</small>
                {selectedChannel.status !== 'active' ? (
                  canApproveChannel ? (
                    <Button
                      loading={activatingChannelId === selectedChannel.id}
                      onClick={() => void activateChannel(selectedChannel)}
                      variant="primary"
                    >
                      {activationRetryChannelId === selectedChannel.id
                        ? 'Try activation again'
                        : 'Activate channel'}
                    </Button>
                  ) : (
                    <p className="channel-approval-note">An owner or administrator must activate this channel before scheduling or going live.</p>
                  )
                ) : null}
              </div>
            ) : null}
          </section>

          {showBroadcastForm && selectedChannel ? (
            <section className="creator-form-card" aria-labelledby="create-broadcast-title">
              <div className="creator-form-copy">
                <StatusBadge tone={firstBroadcastSetup ? 'info' : selectedChannel.status === 'active' ? 'success' : 'warning'}>
                  {firstBroadcastSetup
                    ? 'Step 3 of 3'
                    : selectedChannel.status === 'active'
                      ? 'Channel active'
                      : 'Draft broadcasts only'}
                </StatusBadge>
                <h3 id="create-broadcast-title">
                  {firstBroadcastSetup ? 'How would you like to start?' : 'Create a broadcast'}
                </h3>
                <p>
                  {firstBroadcastSetup
                    ? `Choose what happens next for ${selectedChannel.name}. You can start now, schedule a future broadcast, or finish setup without creating one.`
                    : 'Leave the schedule empty to create a draft. Scheduled broadcasts require an active channel.'}
                </p>
                {firstBroadcastSetup ? (
                  <div className="creator-form-actions" aria-label="First broadcast choices" role="group">
                    <Button
                      aria-pressed={firstBroadcastChoice === 'go-live'}
                      onClick={() => {
                        setFirstBroadcastChoice('go-live');
                        setBroadcastForm((current) => ({ ...current, scheduledStartAt: '' }));
                      }}
                      variant={firstBroadcastChoice === 'go-live' ? 'primary' : 'secondary'}
                    >
                      Start now
                    </Button>
                    <Button
                      aria-pressed={firstBroadcastChoice === 'schedule'}
                      onClick={() => setFirstBroadcastChoice('schedule')}
                      variant={firstBroadcastChoice === 'schedule' ? 'primary' : 'secondary'}
                    >
                      Schedule for later
                    </Button>
                    <Button
                      aria-pressed={firstBroadcastChoice === 'finish-later'}
                      onClick={() => {
                        setFirstBroadcastChoice('finish-later');
                        setBroadcastForm(emptyBroadcastForm);
                        setBroadcastSlugEdited(false);
                        setBroadcastError('');
                      }}
                      variant={firstBroadcastChoice === 'finish-later' ? 'primary' : 'secondary'}
                    >
                      Finish setup later
                    </Button>
                  </div>
                ) : null}
              </div>
              <form className="creator-form-grid" onSubmit={createBroadcast}>
                {(!firstBroadcastSetup || (firstBroadcastChoice && firstBroadcastChoice !== 'finish-later')) ? (
                  <>
                    <label>
                      Broadcast title
                      <input
                        maxLength={160}
                        minLength={3}
                        onChange={(event) => {
                          const title = event.target.value;
                          setBroadcastForm((current) => ({
                            ...current,
                            title,
                            slug: broadcastSlugEdited ? current.slug : slugify(title, 100),
                          }));
                        }}
                        placeholder="Sunday worship experience"
                        required
                        type="text"
                        value={broadcastForm.title}
                      />
                    </label>
                    <label>
                      Public slug
                      <input
                        maxLength={100}
                        minLength={3}
                        onChange={(event) => {
                          setBroadcastSlugEdited(true);
                          setBroadcastForm((current) => ({
                            ...current,
                            slug: slugify(event.target.value, 100),
                          }));
                        }}
                        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                        placeholder="sunday-worship-experience"
                        required
                        type="text"
                        value={broadcastForm.slug}
                      />
                      <small>Listener route: /{organisation.slug}/{selectedChannel.slug}/{broadcastForm.slug || 'broadcast-slug'}</small>
                    </label>
                    {(!firstBroadcastSetup || firstBroadcastChoice === 'schedule') ? (
                      <label>
                        Schedule start
                        <input
                          disabled={selectedChannel.status !== 'active'}
                          min={minimumScheduleValue()}
                          onChange={(event) => setBroadcastForm((current) => ({
                            ...current,
                            scheduledStartAt: event.target.value,
                          }))}
                          required={firstBroadcastChoice === 'schedule'}
                          type="datetime-local"
                          value={broadcastForm.scheduledStartAt}
                        />
                        <small>{selectedChannel.status === 'active' ? 'Times use your device timezone.' : 'Activate the channel to schedule.'}</small>
                      </label>
                    ) : null}
                    <label className="creator-form-wide">
                      Description
                      <textarea
                        maxLength={4000}
                        onChange={(event) => setBroadcastForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))}
                        placeholder="Add context for listeners and guests"
                        rows={3}
                        value={broadcastForm.description}
                      />
                    </label>
                  </>
                ) : null}
                <div className="creator-form-actions creator-form-wide">
                  {!firstBroadcastSetup ? (
                    <Button onClick={() => setShowBroadcastForm(false)}>Cancel</Button>
                  ) : null}
                  {firstBroadcastSetup && firstBroadcastChoice === 'finish-later' ? (
                    <Button onClick={finishFirstBroadcastLater} type="button" variant="primary">
                      Finish setup later
                    </Button>
                  ) : (
                    <Button
                      disabled={firstBroadcastSetup && !firstBroadcastChoice}
                      loading={creatingBroadcast}
                      type="submit"
                      variant="primary"
                    >
                      {firstBroadcastSetup && firstBroadcastChoice === 'go-live'
                        ? 'Create broadcast and open Studio'
                        : firstBroadcastSetup && firstBroadcastChoice === 'schedule'
                          ? 'Schedule broadcast'
                          : firstBroadcastSetup
                            ? 'Choose how to continue'
                            : broadcastForm.scheduledStartAt
                              ? 'Schedule broadcast'
                              : 'Create draft'}
                    </Button>
                  )}
                </div>
              </form>
            </section>
          ) : null}

          {broadcastError ? (
            <StatePanel
              actionLabel="Retry broadcasts"
              kind="error"
              onAction={() => void loadBroadcasts(selectedChannelId)}
              title="Broadcast action could not be completed"
            >
              {broadcastError}
            </StatePanel>
          ) : null}

          {loadingBroadcasts ? (
            <StatePanel kind="loading" title="Loading broadcasts">
              DigiStream is loading broadcasts for {selectedChannel?.name ?? 'this channel'}.
            </StatePanel>
          ) : broadcasts.length === 0 ? (
            <StatePanel
              actionLabel="Create broadcast"
              kind="empty"
              onAction={() => setShowBroadcastForm(true)}
              title="No broadcasts in this channel"
            >
              Create a draft now, then use Broadcast Studio to test the microphone and prepare delivery.
            </StatePanel>
          ) : (
            <section className="broadcast-list" aria-labelledby="broadcast-list-title">
              <header>
                <div>
                  <span>Real broadcast data</span>
                  <h3 id="broadcast-list-title">{selectedChannel?.name} broadcasts</h3>
                </div>
                <Button onClick={() => onOpenStudio()} variant="primary">Open Broadcast Studio</Button>
              </header>
              <div className="broadcast-list-items">
                {broadcasts.map((broadcast) => {
                  const displayStatus = presentationStatus(
                    broadcast.status,
                    broadcast.scheduledStartAt,
                  );
                  const overdue = displayStatus === 'overdue';
                  return (
                    <article
                      className={overdue ? 'broadcast-row broadcast-row-overdue' : 'broadcast-row'}
                      key={broadcast.id}
                    >
                      <div className="broadcast-row-main">
                        <div className="broadcast-row-status">
                          <StatusBadge tone={statusTone(displayStatus)}>
                            {presentationLabel(displayStatus)}
                          </StatusBadge>
                          <span>{formatDate(broadcast.scheduledStartAt ?? broadcast.liveStartedAt)}</span>
                        </div>
                        <h4>{broadcast.title}</h4>
                        <p>{broadcast.description || 'No description has been added.'}</p>
                        {overdue ? (
                          <p className="broadcast-overdue-note">
                            The scheduled start time passed before this broadcast went live.
                            Open Studio to start it now, or cancel it before creating a new schedule.
                          </p>
                        ) : null}
                        <small>/{organisation.slug}/{selectedChannel?.slug}/{broadcast.slug}</small>
                      </div>
                      <div className="broadcast-row-actions">
                        <Button onClick={() => onOpenStudio({
                          organisationId: organisation.id,
                          channelId: selectedChannelId,
                          broadcastId: broadcast.id,
                        })}>
                          {overdue ? 'Open Studio to recover' : 'Open in Studio'}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
