import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Channel, ChannelListResponse, Organisation, OrganisationInvitation, OrganisationListResponse, OrganisationMember, OwnProfile, OwnProfileResponse } from '@digistream/contracts';
import { Button, LinkButton, StatePanel, StatusBadge } from '../../design-system/components';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';

function message(error: unknown) {
  return error instanceof ApiClientError || error instanceof Error
    ? error.message
    : 'Your profile could not be updated.';
}

type Session = { id: string; createdAt: string; lastUsedAt: string; current: boolean; userAgent: string | null };
export function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [revoking, setRevoking] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await apiRequest<{ sessions: Session[] }>('/api/v1/auth/sessions'); setSessions(response.sessions); } catch (cause) { setError(message(cause)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function revoke(id: string) { setRevoking(id); setError(''); try { await apiRequest(`/api/v1/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }); setSessions((current) => current.filter((session) => session.id !== id)); } catch (cause) { setError(message(cause)); } finally { setRevoking(null); } }
  return <main className="account-page"><header className="account-header"><LinkButton href="/account/profile" variant="ghost">Profile settings</LinkButton><span className="account-brand">DigiStream</span></header><section className="account-intro"><span>Security</span><h1>Active sessions</h1><p>Review where your account is signed in.</p></section>{loading ? <StatePanel kind="loading" title="Loading active sessions">Checking your secure sessions.</StatePanel> : error && !sessions.length ? <StatePanel actionLabel="Try again" kind="error" onAction={() => void load()} title="Sessions could not load">{error}</StatePanel> : <section className="account-card account-list"><div>{error ? <p className="account-error" role="alert">{error}</p> : null}{sessions.length ? sessions.map((session) => <article className="account-row" key={session.id}><div><strong>{session.current ? 'This device' : 'Signed-in device'}</strong><small>{session.userAgent || 'Device details are unavailable'} · Last active {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(session.lastUsedAt))}</small></div>{session.current ? <StatusBadge tone="success">Current session</StatusBadge> : <Button loading={revoking === session.id} onClick={() => void revoke(session.id)} variant="danger">Sign out</Button>}</article>) : <StatePanel kind="empty" title="No other active sessions">This account is not signed in on another device.</StatePanel>}</div></section>}</main>;
}

type NotificationPreference = { realtimeDeliveryEnabled: boolean };
export function NotificationsPage() {
  const [preference, setPreference] = useState<NotificationPreference | null>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await apiRequest<{ preferences: NotificationPreference }>('/api/v1/notification-preferences'); setPreference(response.preferences); } catch (cause) { setError(message(cause)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function change(next: boolean) { if (!preference || saving) return; setSaving(true); setError(''); try { const response = await apiRequest<{ preferences: NotificationPreference }>('/api/v1/notification-preferences', { method: 'PATCH', body: jsonBody({ realtimeDeliveryEnabled: next }) }); setPreference(response.preferences); } catch (cause) { setError(message(cause)); } finally { setSaving(false); } }
  return <main className="account-page"><header className="account-header"><LinkButton href="/account/profile" variant="ghost">Profile settings</LinkButton><span className="account-brand">DigiStream</span></header><section className="account-intro"><span>Account</span><h1>Notifications</h1><p>Choose how you receive available account updates.</p></section>{loading ? <StatePanel kind="loading" title="Loading notification preferences">Loading your saved preferences.</StatePanel> : !preference ? <StatePanel actionLabel="Try again" kind="error" onAction={() => void load()} title="Notification preferences could not load">{error}</StatePanel> : <section className="account-card account-list"><div><h2>Notification delivery</h2><label className="account-toggle account-row"><input aria-label="Show in-app notifications immediately" checked={preference.realtimeDeliveryEnabled} disabled={saving} onChange={(event) => void change(event.target.checked)} type="checkbox" /><span><strong>In-app notifications</strong><small>Show new notifications while DigiStream is open.</small></span></label>{error ? <p className="account-error" role="alert">{error}</p> : null}<p className="account-note">Other delivery methods are not shown until they are supported by your account.</p></div></section>}</main>;
}

export function OrganisationSettingsPage() {
  const [organisations, setOrganisations] = useState<Organisation[]>([]); const [selected, setSelected] = useState<Organisation | null>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const response = await apiRequest<OrganisationListResponse>('/api/v1/organisations'); setOrganisations(response.organisations); setSelected((current) => response.organisations.find((item) => item.id === current?.id) ?? response.organisations[0] ?? null); } catch (cause) { setError(message(cause)); } finally { setLoading(false); } }, []); useEffect(() => { void load(); }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!selected || saving) return; setSaving(true); setError(''); try { const response = await apiRequest<{ organisation: Organisation }>(`/api/v1/organisations/${encodeURIComponent(selected.id)}`, { method: 'PATCH', body: jsonBody({ name: selected.name, slug: selected.slug }) }); setSelected(response.organisation); setOrganisations((items) => items.map((item) => item.id === response.organisation.id ? response.organisation : item)); } catch (cause) { setError(message(cause)); } finally { setSaving(false); } }
  return <main className="account-page"><header className="account-header"><LinkButton href="/creator/overview" variant="ghost">Creator workspace</LinkButton><span className="account-brand">DigiStream</span></header><section className="account-intro"><span>Workspace</span><h1>Organisation settings</h1><p>Manage your organisation details where you have access.</p></section>{loading ? <StatePanel kind="loading" title="Loading organisations">Loading available workspaces.</StatePanel> : !selected ? <StatePanel kind="empty" title="No organisation available">Create an organisation before managing its details.</StatePanel> : <form className="account-card" onSubmit={save}><div className="account-avatar">{selected.name.charAt(0).toUpperCase()}</div><div className="account-fields"><label><span>Organisation</span><select aria-label="Choose organisation" onChange={(event) => setSelected(organisations.find((item) => item.id === event.target.value) ?? selected)} value={selected.id}>{organisations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Organisation name</span><input disabled={selected.role !== 'owner' && selected.role !== 'admin'} onChange={(event) => setSelected({ ...selected, name: event.target.value })} value={selected.name}/></label><label><span>Public slug</span><input disabled={selected.role !== 'owner' && selected.role !== 'admin'} onChange={(event) => setSelected({ ...selected, slug: event.target.value })} value={selected.slug}/></label><LinkButton href="/organisation/team" variant="ghost">Members and invitations</LinkButton>{error ? <p className="account-error" role="alert">{error}</p> : null}<Button disabled={selected.role !== 'owner' && selected.role !== 'admin'} loading={saving} type="submit" variant="primary">Save changes</Button></div></form>}</main>;
}

export function TeamInvitationsPage() {
  const [orgs, setOrgs] = useState<Organisation[]>([]); const [org, setOrg] = useState<Organisation | null>(null); const [members, setMembers] = useState<OrganisationMember[]>([]); const [invitations, setInvitations] = useState<OrganisationInvitation[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const list = await apiRequest<OrganisationListResponse>('/api/v1/organisations'); const current = list.organisations[0] ?? null; setOrgs(list.organisations); setOrg(current); if (current) { const [memberResult, invitationResult] = await Promise.all([apiRequest<{ members: OrganisationMember[] }>(`/api/v1/organisations/${current.id}/members`), apiRequest<{ invitations: OrganisationInvitation[] }>(`/api/v1/organisations/${current.id}/invitations`)]); setMembers(memberResult.members); setInvitations(invitationResult.invitations); } } catch (cause) { setError(message(cause)); } finally { setLoading(false); } }, []); useEffect(() => { void load(); }, [load]);
  return <main className="account-page"><header className="account-header"><LinkButton href="/organisation/settings" variant="ghost">Organisation settings</LinkButton><span className="account-brand">DigiStream</span></header><section className="account-intro"><span>Workspace</span><h1>Team & invitations</h1><p>{org ? `Manage who can work inside ${org.name}.` : 'Manage team access.'}</p></section>{loading ? <StatePanel kind="loading" title="Loading team">Loading members and pending invitations.</StatePanel> : !org ? <StatePanel kind="empty" title="No organisation available">Create an organisation before inviting a team.</StatePanel> : <section className="account-card account-list"><div><h2>Members</h2>{members.map((member) => <article className="account-row" key={member.userId}><div><strong>{member.displayName}</strong><small>{member.email}</small></div><StatusBadge tone="neutral">{member.role}</StatusBadge></article>)}<h2 className="account-subheading">Pending invitations</h2>{invitations.length ? invitations.map((invitation) => <article className="account-row" key={invitation.id}><div><strong>{invitation.email}</strong><small>{invitation.role} · Expires {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(invitation.expiresAt))}</small></div><StatusBadge tone="warning">Pending</StatusBadge></article>) : <p className="account-note">There are no pending invitations.</p>}</div></section>}</main>;
}

export function AcceptInvitationPage() {
  const token = new URLSearchParams(window.location.search).get('token'); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [accepted, setAccepted] = useState(false);
  async function accept() { if (!token || busy) return; setBusy(true); setError(''); try { await apiRequest(`/api/v1/organisation-invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' }); setAccepted(true); } catch (cause) { setError(message(cause)); } finally { setBusy(false); } }
  return <main className="account-page invitation-page"><header className="account-header"><LinkButton href="/creator/overview" variant="ghost">Creator workspace</LinkButton><span className="account-brand">DigiStream</span></header><section className="invitation-card"><span className="account-avatar">✉</span><h1>{accepted ? 'Invitation accepted' : 'You’ve been invited'}</h1><p>{accepted ? 'Your workspace access is ready.' : 'Accept this invitation to join the DigiStream workspace.'}</p>{error ? <p className="account-error" role="alert">{error}</p> : null}{accepted ? <LinkButton href="/creator/overview" variant="primary">Open creator workspace</LinkButton> : <Button disabled={!token} loading={busy} onClick={() => void accept()} variant="primary">Accept invitation</Button>}<LinkButton href="/listen" variant="ghost">Decline</LinkButton></section></main>;
}

export function ChannelSettingsPage() {
  const [channel, setChannel] = useState<Channel | null>(null); const [org, setOrg] = useState<Organisation | null>(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const orgResult = await apiRequest<OrganisationListResponse>('/api/v1/organisations'); const current = orgResult.organisations[0] ?? null; setOrg(current); if (current) { const result = await apiRequest<ChannelListResponse>(`/api/v1/organisations/${current.id}/channels`); setChannel(result.channels[0] ?? null); } } catch (cause) { setError(message(cause)); } finally { setLoading(false); } }, []); useEffect(() => { void load(); }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!channel || !org || saving) return; setSaving(true); try { const response = await apiRequest<{ channel: Channel }>(`/api/v1/organisations/${org.id}/channels/${channel.id}`, { method: 'PATCH', body: jsonBody({ name: channel.name, slug: channel.slug, category: channel.category, description: channel.description, visibility: channel.visibility }) }); setChannel(response.channel); } catch (cause) { setError(message(cause)); } finally { setSaving(false); } }
  return <main className="account-page"><header className="account-header"><LinkButton href="/creator/broadcasts" variant="ghost">Broadcasts</LinkButton><span className="account-brand">DigiStream</span></header><section className="account-intro"><span>Channel</span><h1>Channel settings</h1><p>Edit details and visibility for an available channel.</p></section>{loading ? <StatePanel kind="loading" title="Loading channel">Loading channel settings.</StatePanel> : !channel ? <StatePanel kind="empty" title="No channel available">Create a channel before editing its settings.</StatePanel> : <form className="account-card" onSubmit={save}><div className="account-avatar">{channel.name.charAt(0).toUpperCase()}</div><div className="account-fields"><label><span>Channel name</span><input onChange={(event) => setChannel({ ...channel, name: event.target.value })} value={channel.name}/></label><label><span>Category</span><input onChange={(event) => setChannel({ ...channel, category: event.target.value || null })} value={channel.category ?? ''}/></label><label><span>Visibility</span><select onChange={(event) => setChannel({ ...channel, visibility: event.target.value as Channel['visibility'] })} value={channel.visibility}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></label><label><span>Description</span><textarea onChange={(event) => setChannel({ ...channel, description: event.target.value || null })} value={channel.description ?? ''}/></label><StatusBadge tone={channel.status === 'active' ? 'success' : 'neutral'}>{channel.status}</StatusBadge>{error ? <p className="account-error" role="alert">{error}</p> : null}<Button loading={saving} type="submit" variant="primary">Save changes</Button></div></form>}</main>;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await apiRequest('/api/v1/auth/password-reset/request', { method: 'POST', body: jsonBody({ email }) }); setSent(true); } catch (cause) { setError(message(cause)); } finally { setBusy(false); } }
  return <main className="account-page auth-recovery"><header className="account-header"><LinkButton href="/" variant="ghost">DigiStream</LinkButton><LinkButton href="/login" variant="ghost">Sign in</LinkButton></header><form className="invitation-card" onSubmit={submit}><span className="account-avatar">↯</span><h1>{sent ? 'Check your inbox' : 'Forgot password?'}</h1><p>{sent ? 'If that account exists, it will receive a secure reset link.' : 'Enter your email and we’ll send a secure reset link.'}</p>{sent ? <LinkButton href="/login" variant="primary">Return to sign in</LinkButton> : <><label className="account-fields"><span>Email address</span><input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email}/></label>{error ? <p className="account-error" role="alert">{error}</p> : null}<Button loading={busy} type="submit" variant="primary">Send reset link</Button></>} </form></main>;
}

export function ProfileSettingsPage() {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [biography, setBiography] = useState('');
  const [discoverable, setDiscoverable] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await apiRequest<OwnProfileResponse>('/api/v1/profile');
      const value = response.profile;
      setProfile(value); setDisplayName(value.displayName); setUsername(value.profile?.username ?? '');
      setBiography(value.profile?.biography ?? ''); setDiscoverable(value.profile?.isDiscoverable ?? true);
    } catch (cause) { setError(message(cause)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setSaved(false); setError('');
    try {
      const response = await apiRequest<OwnProfileResponse>('/api/v1/profile', {
        method: 'PUT', body: jsonBody({ displayName: displayName.trim(), username: username.trim(), biography: biography.trim() || null, isDiscoverable: discoverable }),
      });
      setProfile(response.profile); setSaved(true);
    } catch (cause) { setError(message(cause)); } finally { setSaving(false); }
  }

  if (loading) return <main className="account-page"><StatePanel kind="loading" title="Loading profile">Loading your account details.</StatePanel></main>;
  if (!profile) return <main className="account-page"><StatePanel actionLabel="Try again" kind="error" onAction={() => void load()} title="Profile settings could not load">{error}</StatePanel></main>;
  const initial = profile.displayName.trim().charAt(0).toUpperCase() || '?';
  return <main className="account-page"><header className="account-header"><LinkButton href="/creator/overview" variant="ghost">Creator workspace</LinkButton><span className="account-brand">DigiStream</span></header>
    <section className="account-intro"><span>Profile</span><h1>Profile settings</h1><p>Manage your identity and preferences.</p></section>
    <form className="account-card" onSubmit={submit}><aside className="account-avatar" aria-label="Profile initial">{initial}</aside><div className="account-fields">
      <label><span>Display name</span><input maxLength={120} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} /></label>
      <label><span>Public username</span><input maxLength={80} onChange={(event) => setUsername(event.target.value)} pattern="[a-zA-Z0-9_-]+" required value={username} /></label>
      <label><span>Email</span><output>{profile.email}{profile.emailVerifiedAt ? <StatusBadge tone="success">Verified</StatusBadge> : <StatusBadge tone="warning">Unverified</StatusBadge>}</output></label>
      <label><span>About you</span><textarea maxLength={500} onChange={(event) => setBiography(event.target.value)} value={biography} /></label>
      <fieldset><legend>Account preferences</legend><label className="account-toggle"><input checked={discoverable} onChange={(event) => setDiscoverable(event.target.checked)} type="checkbox" /><span><strong>Discoverability</strong><small>Allow others to find your public profile.</small></span></label>
      <LinkButton href="/account/notifications" variant="ghost">Notifications</LinkButton><LinkButton href="/account/sessions" variant="ghost">Security and active sessions</LinkButton></fieldset>
      {error ? <p className="account-error" role="alert">{error}</p> : null}{saved ? <p className="account-saved" role="status">Changes saved.</p> : null}
      <Button loading={saving} type="submit" variant="primary">Save changes</Button>
    </div></form>
  </main>;
}
