import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { OwnProfile, OwnProfileResponse } from '@digistream/contracts';
import { Button, LinkButton, StatePanel, StatusBadge } from '../../design-system/components';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';

function message(error: unknown) {
  return error instanceof ApiClientError || error instanceof Error
    ? error.message
    : 'Your profile could not be updated.';
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
