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
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import { BroadcastChat } from './BroadcastChat';
import './creator-chat-workspace.css';

type CreatorChatWorkspaceProps = {
  open: boolean;
  onClose(): void;
};

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

export function CreatorChatWorkspace({
  open,
  onClose,
}: CreatorChatWorkspaceProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);
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

  const selectedBroadcast = useMemo(
    () => broadcasts.find((broadcast) => broadcast.id === broadcastId) ?? null,
    [broadcastId, broadcasts],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
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
  }, [open, user]);

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

  if (!open) return null;

  return (
    <div className="creator-chat-backdrop" role="presentation">
      <section
        aria-labelledby="creator-chat-title"
        aria-modal="true"
        className="creator-chat-workspace"
        role="dialog"
      >
        <header className="creator-chat-header">
          <div>
            <span className="eyebrow">Audience interaction</span>
            <h2 id="creator-chat-title">Creator live chat</h2>
            <p>Choose a broadcast, review committed history and reply in real time.</p>
          </div>
          <button aria-label="Close creator chat" onClick={onClose} type="button">×</button>
        </header>

        {error ? <div className="creator-chat-error" role="alert">{error}</div> : null}

        {checkingSession ? (
          <div className="creator-chat-loading">Checking your session…</div>
        ) : !user ? (
          <form className="creator-chat-login" onSubmit={signIn}>
            <div>
              <h3>Sign in to manage chat</h3>
              <p>The creator workspace uses the same secure session as broadcast controls.</p>
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
            <aside className="creator-chat-selection">
              <div>
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
                  <strong>{selectedBroadcast.title}</strong>
                  <span>{selectedBroadcast.status}</span>
                  <small>
                    {selectedBroadcast.status === 'completed'
                      ? 'History is available, but new messages are disabled.'
                      : 'New messages are stored before they are delivered.'}
                  </small>
                </div>
              ) : (
                <div className="creator-chat-broadcast-summary">
                  No chat-capable broadcast is selected.
                </div>
              )}
            </aside>

            <div className="creator-chat-panel">
              {selectedBroadcast && organisationId ? (
                <BroadcastChat
                  broadcastId={selectedBroadcast.id}
                  messagesPath={`/api/v1/organisations/${organisationId}/broadcasts/${selectedBroadcast.id}/chat/messages`}
                  organisationId={organisationId}
                  variant="creator"
                />
              ) : (
                <div className="creator-chat-loading">
                  Select a scheduled, active or completed broadcast to open its chat.
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
