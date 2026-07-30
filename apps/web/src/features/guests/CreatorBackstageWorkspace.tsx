import {
  useCallback,
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
import './creator-backstage.css';

type GuestInvitationStatus = 'pending' | 'accepted' | 'admitted' | 'revoked';

type GuestInvitation = {
  id: string;
  organisationId: string;
  broadcastId: string;
  invitedEmail: string | null;
  displayName: string | null;
  status: GuestInvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  admittedAt: string | null;
  revokedAt: string | null;
  sessionExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreatedGuestInvitation = GuestInvitation & { acceptanceToken: string };

type CallInRequest = {
  id: string;
  organisationId: string;
  broadcastId: string;
  displayName: string;
  contactEmail: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  invitationId: string | null;
  decidedByUserId: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type BackstageTrack = {
  sid: string;
  source: string;
  muted: boolean;
};

type BackstageParticipant = {
  identity: string;
  name: string;
  role: 'host' | 'guest' | 'monitor' | 'unknown';
  connected: boolean;
  publishing: boolean;
  tracks: BackstageTrack[];
};

type CreatorBackstageWorkspaceProps = {
  open: boolean;
  onClose(): void;
};

function readableError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'The backstage workspace could not continue.';
}

function formatTime(value: string | null): string {
  if (!value) return 'Not yet';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function invitationLink(token: string): string {
  return `${window.location.origin}/guest/${encodeURIComponent(token)}`;
}

export function CreatorBackstageWorkspace({
  open,
  onClose,
}: CreatorBackstageWorkspaceProps) {
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
  const [invitations, setInvitations] = useState<GuestInvitation[]>([]);
  const [participants, setParticipants] = useState<BackstageParticipant[]>([]);
  const [callIns, setCallIns] = useState<CallInRequest[]>([]);
  const [createdLinks, setCreatedLinks] = useState<Record<string, string>>({});
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteTtl, setInviteTtl] = useState('3600');
  const [error, setError] = useState('');
  const [mediaWarning, setMediaWarning] = useState('');
  const [message, setMessage] = useState('Select a broadcast to manage its backstage area.');
  const [busyAction, setBusyAction] = useState('');

  const selectedOrganisation = useMemo(
    () => organisations.find((item) => item.id === organisationId) ?? null,
    [organisationId, organisations],
  );
  const selectedBroadcast = useMemo(
    () => broadcasts.find((item) => item.id === broadcastId) ?? null,
    [broadcastId, broadcasts],
  );
  const canCreateInvitations =
    selectedOrganisation?.role === 'owner' ||
    selectedOrganisation?.role === 'admin' ||
    selectedOrganisation?.role === 'broadcaster';

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    setCheckingSession(true);
    setError('');
    void apiRequest<AuthUserResponse>('/api/v1/auth/me')
      .then((response) => setUser(response.user))
      .catch((requestError) => {
        if (!(requestError instanceof ApiClientError) || requestError.status !== 401) {
          setError(readableError(requestError));
        }
        setUser(null);
      })
      .finally(() => setCheckingSession(false));
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    void apiRequest<OrganisationListResponse>('/api/v1/organisations')
      .then((response) => {
        setOrganisations(response.organisations);
        setOrganisationId((current) => current || response.organisations[0]?.id || '');
      })
      .catch((requestError) => setError(readableError(requestError)));
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
          response.channels.some((item) => item.id === current)
            ? current
            : response.channels[0]?.id || '',
        );
      })
      .catch((requestError) => setError(readableError(requestError)));
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
        const available = response.broadcasts.filter((item) =>
          ['scheduled', 'starting', 'live', 'reconnecting'].includes(item.status),
        );
        setBroadcasts(available);
        setBroadcastId((current) =>
          available.some((item) => item.id === current)
            ? current
            : available[0]?.id || '',
        );
      })
      .catch((requestError) => setError(readableError(requestError)));
  }, [channelId, organisationId]);

  const refreshBackstage = useCallback(async () => {
    if (!organisationId || !broadcastId) return;
    const base = `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}`;
    const [invitationResult, participantResult, callInResult] = await Promise.allSettled([
      apiRequest<{ invitations: GuestInvitation[] }>(`${base}/guest-invitations`),
      apiRequest<{ participants: BackstageParticipant[] }>(`${base}/backstage/participants`),
      apiRequest<{ callIns: CallInRequest[] }>(`${base}/call-ins`),
    ]);

    if (invitationResult.status === 'fulfilled') {
      setInvitations(invitationResult.value.invitations);
    } else {
      setError(readableError(invitationResult.reason));
    }
    if (callInResult.status === 'fulfilled') {
      setCallIns(callInResult.value.callIns);
    } else {
      setError(readableError(callInResult.reason));
    }
    if (participantResult.status === 'fulfilled') {
      setParticipants(participantResult.value.participants);
      setMediaWarning('');
    } else {
      setParticipants([]);
      setMediaWarning(readableError(participantResult.reason));
    }
  }, [broadcastId, organisationId]);

  useEffect(() => {
    if (!open || !user || !organisationId || !broadcastId) {
      setInvitations([]);
      setParticipants([]);
      setCallIns([]);
      return;
    }
    setMessage('Backstage status refreshes automatically.');
    void refreshBackstage();
    const timer = window.setInterval(() => void refreshBackstage(), 4_000);
    return () => window.clearInterval(timer);
  }, [broadcastId, open, organisationId, refreshBackstage, user]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction('sign-in');
    setError('');
    try {
      const response = await apiRequest<AuthUserResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: jsonBody({ email, password }),
      });
      setUser(response.user);
      setPassword('');
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setBusyAction('');
    }
  }

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organisationId || !broadcastId) return;
    setBusyAction('create-invitation');
    setError('');
    try {
      const response = await apiRequest<{ invitation: CreatedGuestInvitation }>(
        `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/guest-invitations`,
        {
          method: 'POST',
          body: jsonBody({
            displayName: inviteName || undefined,
            email: inviteEmail || undefined,
            ttlSeconds: Number(inviteTtl),
          }),
        },
      );
      const link = invitationLink(response.invitation.acceptanceToken);
      setCreatedLinks((current) => ({
        ...current,
        [response.invitation.id]: link,
      }));
      setInviteName('');
      setInviteEmail('');
      setMessage('Guest invitation created. Copy the link now; the raw token is not stored by the server.');
      await refreshBackstage();
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setBusyAction('');
    }
  }

  async function copyLink(invitationId: string) {
    const link = createdLinks[invitationId];
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Guest invitation link copied.');
    } catch {
      setMessage('Copy the displayed guest link manually.');
    }
  }

  async function admitInvitation(invitationId: string) {
    if (!organisationId || !broadcastId) return;
    setBusyAction(`admit-${invitationId}`);
    setError('');
    try {
      await apiRequest(
        `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/guest-invitations/${invitationId}/admit`,
        { method: 'POST' },
      );
      setMessage('Guest admitted. Their waiting room can now request a LiveKit token.');
      await refreshBackstage();
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setBusyAction('');
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!organisationId || !broadcastId) return;
    setBusyAction(`revoke-${invitationId}`);
    setError('');
    try {
      await apiRequest(
        `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/guest-invitations/${invitationId}`,
        { method: 'DELETE' },
      );
      setMessage('Guest invitation revoked.');
      await refreshBackstage();
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setBusyAction('');
    }
  }

  async function setGuestMute(participant: BackstageParticipant, muted: boolean) {
    if (!organisationId || !broadcastId) return;
    setBusyAction(`mute-${participant.identity}`);
    setError('');
    try {
      await apiRequest(
        `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/backstage/participants/${encodeURIComponent(participant.identity)}/mute`,
        { method: 'POST', body: jsonBody({ muted }) },
      );
      await refreshBackstage();
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setBusyAction('');
    }
  }

  async function removeGuest(participant: BackstageParticipant) {
    if (!organisationId || !broadcastId) return;
    setBusyAction(`remove-${participant.identity}`);
    setError('');
    try {
      await apiRequest(
        `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/backstage/participants/${encodeURIComponent(participant.identity)}`,
        { method: 'DELETE' },
      );
      setMessage(`${participant.name} was removed from the LiveKit room.`);
      await refreshBackstage();
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setBusyAction('');
    }
  }

  async function decideCallIn(callIn: CallInRequest, decision: 'approve' | 'reject') {
    if (!organisationId || !broadcastId) return;
    setBusyAction(`${decision}-${callIn.id}`);
    setError('');
    try {
      const response = await apiRequest<{
        callIn: CallInRequest;
        invitation: CreatedGuestInvitation | null;
      }>(
        `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/call-ins/${callIn.id}/${decision}`,
        { method: 'POST' },
      );
      if (response.invitation) {
        setCreatedLinks((current) => ({
          ...current,
          [response.invitation!.id]: invitationLink(response.invitation!.acceptanceToken),
        }));
        setMessage('Call-in approved. Copy the generated guest link and send it to the caller.');
      } else {
        setMessage('Call-in request rejected.');
      }
      await refreshBackstage();
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setBusyAction('');
    }
  }

  if (!open) return null;

  return (
    <div className="backstage-backdrop" role="presentation">
      <section className="backstage-workspace" role="dialog" aria-modal="true" aria-labelledby="backstage-title">
        <header className="backstage-header">
          <div>
            <span className="eyebrow">Live guest operations</span>
            <h2 id="backstage-title">Creator backstage</h2>
            <p>Create secure guest links, admit waiting guests and manage LiveKit participants.</p>
          </div>
          <button className="backstage-close" onClick={onClose} type="button" aria-label="Close backstage workspace">×</button>
        </header>

        {error ? <div className="backstage-alert error" role="alert">{error}</div> : null}
        {checkingSession ? (
          <div className="backstage-loading">Checking your session…</div>
        ) : !user ? (
          <form className="backstage-login" onSubmit={signIn}>
            <h3>Sign in to manage backstage</h3>
            <label>
              Email
              <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <label>
              Password
              <input autoComplete="current-password" minLength={12} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
            </label>
            <button className="primary-button" disabled={busyAction === 'sign-in'} type="submit">Sign in</button>
          </form>
        ) : (
          <div className="backstage-body">
            <aside className="backstage-selection">
              <div className="backstage-user">
                <span>Signed in as</span>
                <strong>{user.displayName}</strong>
                <small>{user.email}</small>
              </div>
              <label>
                Organisation
                <select onChange={(event) => setOrganisationId(event.target.value)} value={organisationId}>
                  <option value="">Select organisation</option>
                  {organisations.map((organisation) => (
                    <option key={organisation.id} value={organisation.id}>{organisation.name} · {organisation.role}</option>
                  ))}
                </select>
              </label>
              <label>
                Channel
                <select disabled={!organisationId} onChange={(event) => setChannelId(event.target.value)} value={channelId}>
                  <option value="">Select channel</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>{channel.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Broadcast
                <select disabled={!channelId} onChange={(event) => setBroadcastId(event.target.value)} value={broadcastId}>
                  <option value="">Select active broadcast</option>
                  {broadcasts.map((broadcast) => (
                    <option key={broadcast.id} value={broadcast.id}>{broadcast.title} · {broadcast.status}</option>
                  ))}
                </select>
              </label>
              <p className="backstage-selection-note">{message}</p>
            </aside>

            <main className="backstage-panels">
              {!selectedBroadcast ? (
                <div className="backstage-empty">Select a scheduled or active broadcast.</div>
              ) : (
                <>
                  <section className="backstage-panel backstage-invite-panel">
                    <header>
                      <div>
                        <span className="backstage-label">Invitation desk</span>
                        <h3>{selectedBroadcast.title}</h3>
                      </div>
                      <button className="backstage-refresh" onClick={() => void refreshBackstage()} type="button">Refresh</button>
                    </header>
                    {canCreateInvitations ? (
                      <form className="backstage-invite-form" onSubmit={createInvitation}>
                        <input maxLength={80} onChange={(event) => setInviteName(event.target.value)} placeholder="Guest display name (optional)" value={inviteName} />
                        <input onChange={(event) => setInviteEmail(event.target.value)} placeholder="Guest email (optional)" type="email" value={inviteEmail} />
                        <select onChange={(event) => setInviteTtl(event.target.value)} value={inviteTtl}>
                          <option value="900">15 minutes</option>
                          <option value="3600">1 hour</option>
                          <option value="14400">4 hours</option>
                          <option value="86400">24 hours</option>
                        </select>
                        <button className="primary-button" disabled={busyAction === 'create-invitation'} type="submit">Create guest link</button>
                      </form>
                    ) : (
                      <p className="backstage-muted-copy">Moderators can admit and control guests but cannot create new invitations.</p>
                    )}
                    <div className="backstage-list">
                      {invitations.length ? invitations.map((invitation) => {
                        const link = createdLinks[invitation.id];
                        return (
                          <article className="backstage-row" key={invitation.id}>
                            <div>
                              <strong>{invitation.displayName || invitation.invitedEmail || 'Unnamed guest'}</strong>
                              <span>{invitation.status} · expires {formatTime(invitation.expiresAt)}</span>
                              {link ? <code>{link}</code> : null}
                            </div>
                            <div className="backstage-row-actions">
                              {link ? <button onClick={() => void copyLink(invitation.id)} type="button">Copy link</button> : null}
                              {invitation.status === 'accepted' ? <button onClick={() => void admitInvitation(invitation.id)} disabled={busyAction === `admit-${invitation.id}`} type="button">Admit</button> : null}
                              {invitation.status !== 'revoked' ? <button className="danger" onClick={() => void revokeInvitation(invitation.id)} disabled={busyAction === `revoke-${invitation.id}`} type="button">Revoke</button> : null}
                            </div>
                          </article>
                        );
                      }) : <div className="backstage-empty small">No guest invitations yet.</div>}
                    </div>
                  </section>

                  <section className="backstage-panel">
                    <header>
                      <div>
                        <span className="backstage-label">LiveKit room</span>
                        <h3>Connected participants</h3>
                      </div>
                      <span className="backstage-count">{participants.length}</span>
                    </header>
                    {mediaWarning ? <div className="backstage-alert warning">{mediaWarning}</div> : null}
                    <div className="backstage-list">
                      {participants.length ? participants.map((participant) => {
                        const microphone = participant.tracks.find((track) => track.source === 'microphone');
                        const controllable = participant.role === 'guest';
                        return (
                          <article className="backstage-row" key={participant.identity}>
                            <div>
                              <strong>{participant.name}</strong>
                              <span>{participant.role} · {participant.connected ? 'connected' : 'disconnected'} · {microphone ? (microphone.muted ? 'muted' : 'microphone live') : 'no microphone'}</span>
                            </div>
                            {controllable ? (
                              <div className="backstage-row-actions">
                                {microphone ? <button onClick={() => void setGuestMute(participant, !microphone.muted)} disabled={busyAction === `mute-${participant.identity}`} type="button">{microphone.muted ? 'Unmute' : 'Mute'}</button> : null}
                                <button className="danger" onClick={() => void removeGuest(participant)} disabled={busyAction === `remove-${participant.identity}`} type="button">Remove</button>
                              </div>
                            ) : null}
                          </article>
                        );
                      }) : <div className="backstage-empty small">No one is currently connected.</div>}
                    </div>
                  </section>

                  <section className="backstage-panel">
                    <header>
                      <div>
                        <span className="backstage-label">Listener requests</span>
                        <h3>Call-ins</h3>
                      </div>
                      <span className="backstage-count">{callIns.filter((item) => item.status === 'pending').length}</span>
                    </header>
                    <div className="backstage-list">
                      {callIns.length ? callIns.map((callIn) => (
                        <article className="backstage-row" key={callIn.id}>
                          <div>
                            <strong>{callIn.displayName}</strong>
                            <span>{callIn.contactEmail || 'No contact email'} · {callIn.status}</span>
                            {callIn.message ? <p>{callIn.message}</p> : null}
                          </div>
                          {callIn.status === 'pending' ? (
                            <div className="backstage-row-actions">
                              <button onClick={() => void decideCallIn(callIn, 'approve')} disabled={busyAction === `approve-${callIn.id}`} type="button">Approve</button>
                              <button className="danger" onClick={() => void decideCallIn(callIn, 'reject')} disabled={busyAction === `reject-${callIn.id}`} type="button">Reject</button>
                            </div>
                          ) : null}
                        </article>
                      )) : <div className="backstage-empty small">No listener call-in requests.</div>}
                    </div>
                  </section>
                </>
              )}
            </main>
          </div>
        )}
      </section>
    </div>
  );
}
