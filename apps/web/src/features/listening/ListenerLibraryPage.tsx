import { useCallback, useEffect, useState } from 'react';
import { StatePanel } from '../../design-system/components';
import { ApiClientError, apiRequest } from '../../lib/api-client';
import { publicListenerPath } from './listener-route';
import './listener-library-reference.css';

type LibraryItem = { id: string; title: string; slug: string; status: string; organisation: { name: string; slug: string }; channel: { name: string; slug: string } };
type LibraryResponse = { broadcasts: LibraryItem[] };

export function ListenerLibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const response = await apiRequest<LibraryResponse>('/api/v1/me/saved-broadcasts?limit=60'); setItems(response.broadcasts); } catch (reason) { setItems([]); setError(reason instanceof ApiClientError && reason.status === 401 ? 'Sign in to see broadcasts you have saved.' : reason instanceof Error ? reason.message : 'Your library could not be loaded.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <main className="listener-library-page"><header><span>Listener collection</span><h1>My library</h1><p>Everything you saved and listened to.</p></header><nav className="listener-library-tabs" aria-label="Library sections"><a aria-current="page" href="/listen/library">Saved</a><a href="/listen/library?view=history">History</a></nav>{loading ? <StatePanel kind="loading" title="Loading your library">Checking your saved broadcasts.</StatePanel> : null}{error ? <StatePanel actionLabel="Try again" kind="error" onAction={() => void load()} title="Library unavailable">{error}</StatePanel> : null}{!loading && !error && items.length === 0 ? <StatePanel kind="empty" title="Nothing saved yet">Save a broadcast to find it here later.</StatePanel> : null}<section className="listener-library-list" aria-label="Saved broadcasts">{items.map((item) => <a href={publicListenerPath({ organisationSlug: item.organisation.slug, channelSlug: item.channel.slug, broadcastSlug: item.slug })} key={item.id}><span aria-hidden="true" /><div><strong>{item.title}</strong><small>{item.channel.name} · {item.organisation.name}</small></div><b>{item.status}</b></a>)}</section></main>;
}
