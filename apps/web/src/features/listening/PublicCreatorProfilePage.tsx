import { useEffect, useState } from 'react';
import type { PublicProfile, PublicProfileResponse } from '@digistream/contracts';
import { LinkButton, StatePanel, StatusBadge } from '../../design-system/components';
import { apiRequest } from '../../lib/api-client';

export function PublicCreatorProfilePage() {
  const username = new URLSearchParams(window.location.search).get('username') ?? '';
  const [profile, setProfile] = useState<PublicProfile | null>(null); const [error, setError] = useState('');
  useEffect(() => { if (!username) return; void apiRequest<PublicProfileResponse>(`/api/v1/profiles/${encodeURIComponent(username)}`).then((result) => setProfile(result.profile)).catch((cause: Error) => setError(cause.message)); }, [username]);
  if (!username) return <main className="account-page"><StatePanel kind="empty" title="Creator profile unavailable">Choose a valid public creator profile.</StatePanel></main>;
  if (!profile && !error) return <main className="account-page"><StatePanel kind="loading" title="Loading creator profile">Loading public profile details.</StatePanel></main>;
  if (!profile) return <main className="account-page"><StatePanel kind="error" title="Creator profile unavailable">{error}</StatePanel></main>;
  return <main className="account-page public-profile"><header className="account-header"><LinkButton href="/listen" variant="ghost">Discover</LinkButton><span className="account-brand">DigiStream</span></header><section className="public-profile-hero"><span className="account-avatar">{profile.displayName.charAt(0).toUpperCase()}</span><div><h1>{profile.displayName}</h1><strong>@{profile.username}</strong>{profile.isBroadcaster ? <StatusBadge tone="info">Creator on DigiStream</StatusBadge> : null}<p>{profile.biography || 'This creator has not added a public introduction yet.'}</p></div></section><section className="account-card account-list"><div><h2>About</h2><p className="account-note">Joined DigiStream {new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(new Date(profile.joinedAt))}</p><p className="account-note">Broadcast and follower totals appear only when measured public data is available.</p></div></section></main>;
}
