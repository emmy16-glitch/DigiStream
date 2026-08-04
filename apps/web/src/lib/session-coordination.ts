const SIGNED_OUT_STORAGE_KEY = 'digistream:signed-out';
const SESSION_EXPIRED_EVENT = 'digistream:session-expired';

export function isProtectedCreatorPath(pathname: string): boolean {
  return pathname === '/creator' || pathname.startsWith('/creator/');
}

export function signedOutLoginPath(returnTo: string): string {
  const params = new URLSearchParams({
    reason: 'signed-out',
    returnTo,
  });
  return `/login?${params.toString()}`;
}

export function announceSignedOut(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      SIGNED_OUT_STORAGE_KEY,
      JSON.stringify({ at: Date.now(), nonce: crypto.randomUUID() }),
    );
  } catch {
    // The authoritative server logout still succeeds when browser storage is unavailable.
  }
}

export function installSessionCoordination(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SIGNED_OUT_STORAGE_KEY || !event.newValue) return;
    if (!isProtectedCreatorPath(window.location.pathname)) return;

    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.sessionStorage.clear();
    window.dispatchEvent(
      new CustomEvent(SESSION_EXPIRED_EVENT, {
        detail: { path: 'cross-tab-logout', returnTo },
      }),
    );
    window.location.replace(signedOutLoginPath(returnTo));
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}
