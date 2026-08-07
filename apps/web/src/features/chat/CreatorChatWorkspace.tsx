import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import type {
  AuthUser,
  AuthUserResponse,
  Broadcast,
  BroadcastListResponse,
  ChannelListResponse,
  OrganisationListResponse,
} from '@digistream/contracts';
import { Icon } from '../../design-system/Icon';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import { BroadcastChat } from './BroadcastChat';
import './creator-chat-workspace.css';

const readableChatStates = new Set<Broadcast['status']>([
  'scheduled',
  'starting',
  'live',
  'reconnecting',
  'ending',
  'completed',
]);

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'The creator chat workspace could not complete that request.';
}

function chatStatusCopy(status: Broadcast['status']): string {
  if (status === 'scheduled') return 'Chat opens when the broadcast starts.';
  if (status === 'starting') return 'Chat opens when public audio is ready.';
  if (status === 'completed') return 'History remains available. New messages are disabled.';
  if (status === 'ending') return 'The broadcast is ending. Chat is read-only.';
  if (status === 'reconnecting') return 'Stored history remains available while live updates recover.';
  return 'New messages are stored before live delivery.';
}

export function CreatorChatWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organisations, setOrganisations] = useState<
    OrganisationListResponse['organisations']
  >([]);
  const [channels, setChannels] = useState<ChannelListResponse['channels']>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [organisationId, setOrganisationId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [broadcastId, setBroadcastId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedOrganisation = useMemo(
    () => organisations.find((organisation) => organisation.id === organisationId) ?? null,
    [organisationId, organisations],
  );
  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === channelId) ?? null,
    [channelId, channels],
  );
  const selectedBroadcast = useMemo(
    () => broadcasts.find((broadcast) => broadcast.id === broadcastId) ?? null,
    [broadcastId, broadcasts],
  );

  useEffect(() => {
    setCheckingSession(true);
    setError('');
    void apiRequest<AuthUserResponse>('/api/v1/auth/me')
      .then((response) => setUser(response.user))
      .catch((requestError) => {
        setUser(null);
        if (
          !(requestError instanceof ApiClientError) ||
          requestError.status !== 401
        ) {
          setError(errorMessage(requestError));
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    void apiRequest<OrganisationListResponse>('/api/v1/organisations')
      .then((response) => {
        setOrganisations(response.organisations);
        setOrganisationId((current) =>
          response.organisations.some((organisation) => organisation.id === current)
            ? current
            : response.organisations[0]?.id ?? '',
        );
      })
      .catch((requestError) => setError(errorMessage(requestError)));
  }, [user]);

  useEffect(() => {
    if (!organisationId) {
      setChannels([]);
      setChannelId('');
      return;
    }
    void apiRequest<ChannelListResponse>(
      `/api/v1/organisations/${organisationId}/channels`,
    )
      .then((response) => {
        setChannels(response.channels);
        setChannelId((current) =>
          response.channels.some((channel) => channel.id === current)
            ? current
            : response.channels[0]?.id ?? '',
        );
      })
      .catch((requestError) => setError(errorMessage(requestError)));
  }, [organisationId]);

  useEffect(() => {
    if (!organisationId || !channelId) {
      setBroadcasts([]);
      setBroadcastId('');
      return;
    }
    void apiRequest<BroadcastListResponse>(
      `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
    )
      .then((response) => {
        setBroadcasts(response.broadcasts);
        const readable = response.broadcasts.filter((broadcast) =>
          readableChatStates.has(broadcast.status),
        );
        setBroadcastId((current) =>
          readable.some((broadcast) => broadcast.id === current)
            ? current
            : readable[0]?.id ?? '',
        );
      })
      .catch((requestError) => setError(errorMessage(requestError)));
  }, [channelId, organisationId]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await apiRequest<AuthUserResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: jsonBody({ email, password }),
      });
      setUser(response.user);
      setPassword('');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="creator-chat-workspace" aria-labelledby="creator-chat-title">
      <header className="creator-chat-page-header">
        <div>
          <span className="creator-chat-kicker">Audience interaction</span>
          <h2 id="creator-chat-title">Chat</h2>
          <p>For broadcast · External conversation · Stored before live delivery</p>
        </div>
        <div className="creator-chat-trust-note">
          <Icon name="chat" size={18} />
          <span>Real broadcast messages only</span>
        </div>
      </header>

      {error ? <div className="creator-chat-error" role="alert">{error}</div> : null}

      {checkingSession ? (
        <div className="creator-chat-loading">Checking your secure creator session…</div>
      ) : !user ? (
        <form className="creator-chat-login" onSubmit={signIn}>
          <div>
            <span className="creator-chat-kicker">Session required</span>
            <h3>Sign in to manage chat</h3>
            <p>The creator conversation uses the same revocable account session as broadcast controls.</p>
          </div>
          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button disabled={busy} type="submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <div className="creator-chat-body">
          <aside className="creator-chat-context" aria-label="Conversation context">
            <div className="creator-chat-visual" aria-hidden="true">
              <span className="creator-chat-orbit creator-chat-orbit-one" />
              <span className="creator-chat-orbit creator-chat-orbit-two" />
              <span className="creator-chat-visual-icon">
                <Icon name="chat" size={44} />
              </span>
              <div>
                <strong>{selectedBroadcast?.title ?? 'Choose a broadcast'}</strong>
                <span>{selectedChannel?.name ?? 'Conversation workspace'}</span>
              </div>
            </div>

            <div className="creator-chat-selection">
              <div className="creator-chat-user">
                <span>Signed in as</span>
                <strong>{user.displayName}</strong>
                <small>{user.email}</small>
              </div>

              <label>
                Organisation
                <select
                  onChange={(event) => setOrganisationId(event.target.value)}
                  value={organisationId}
                >
                  <option value="">Select organisation</option>
                  {organisations.map((organisation) => (
                    <option key={organisation.id} value={organisation.id}>
                      {organisation.name} · {organisation.role}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Channel
                <select
                  disabled={!organisationId}
                  onChange={(event) => setChannelId(event.target.value)}
                  value={channelId}
                >
                  <option value="">Select channel</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} · {channel.status}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Broadcast
                <select
                  disabled={!channelId}
                  onChange={(event) => setBroadcastId(event.target.value)}
                  value={broadcastId}
                >
                  <option value="">Select broadcast</option>
                  {broadcasts
                    .filter((broadcast) => readableChatStates.has(broadcast.status))
                    .map((broadcast) => (
                      <option key={broadcast.id} value={broadcast.id}>
                        {broadcast.title} · {broadcast.status}
                      </option>
                    ))}
                </select>
              </label>

              {selectedBroadcast ? (
                <div className="creator-chat-broadcast-summary">
                  <div>
                    <strong>{selectedBroadcast.title}</strong>
                    <span className={`creator-chat-status is-${selectedBroadcast.status}`}>
                      {selectedBroadcast.status}
                    </span>
                  </div>
                  <small>{chatStatusCopy(selectedBroadcast.status)}</small>
                  <small>
                    {selectedOrganisation?.name ?? 'Organisation'} · {selectedChannel?.name ?? 'Channel'}
                  </small>
                </div>
              ) : (
                <div className="creator-chat-broadcast-summary">
                  <strong>No chat-capable broadcast selected</strong>
                  <small>Select a scheduled, active or completed broadcast to open its real conversation history.</small>
                </div>
              )}
            </div>
          </aside>

          <div className="creator-chat-panel">
            <header className="creator-chat-conversation-heading">
              <div>
                <span className="creator-chat-kicker">Broadcast conversation</span>
                <h3>{selectedBroadcast?.title ?? 'Conversation'}</h3>
              </div>
              <p>Messages appear here during the broadcast and remain available according to the real chat lifecycle.</p>
            </header>

            {selectedBroadcast && organisationId ? (
              <BroadcastChat
                broadcastId={selectedBroadcast.id}
                messagesPath={`/api/v1/organisations/${organisationId}/broadcasts/${selectedBroadcast.id}/chat/messages`}
                organisationId={organisationId}
                variant="creator"
              />
            ) : (
              <div className="creator-chat-loading creator-chat-empty-panel">
                <Icon name="chat" size={28} />
                <strong>Select a broadcast to open its conversation.</strong>
                <span>No placeholder messages or audience counts are shown.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
