const SESSION_COORDINATION_STORAGE_KEY = 'digistream:session-coordination';
const SESSION_EXPIRED_EVENT = 'digistream:session-expired';

type SessionCoordinationReason = 'signed-out' | 'session-expired';

interface SessionCoordinationMessage {
  at: number;
  nonce: string;
  reason: SessionCoordinationReason;
  sourcePath?: string;
}

export function isProtectedCreatorPath(pathname: string): boolean {
  return pathname === '/creator' || pathname.startsWith('/creator/');
}

export function sessionLoginPath(
  reason: SessionCoordinationReason,
  returnTo: string,
): string {
  const params = new URLSearchParams({ reason, returnTo });
  return `/login?${params.toString()}`;
}

export function signedOutLoginPath(returnTo: string): string {
  return sessionLoginPath('signed-out', returnTo);
}

function writeSessionMessage(
  reason: SessionCoordinationReason,
  sourcePath?: string,
): void {
  if (typeof window === 'undefined') return;

  const message: SessionCoordinationMessage = {
    at: Date.now(),
    nonce: crypto.randomUUID(),
    reason,
    ...(sourcePath === undefined ? {} : { sourcePath }),
  };

  try {
    window.localStorage.setItem(
      SESSION_COORDINATION_STORAGE_KEY,
      JSON.stringify(message),
    );
  } catch {
    // The server response remains authoritative when browser storage is unavailable.
  }
}

export function announceSignedOut(): void {
  writeSessionMessage('signed-out');
}

export function announceSessionExpired(sourcePath: string): void {
  writeSessionMessage('session-expired', sourcePath);
}

function parseSessionMessage(value: string): SessionCoordinationMessage | null {
  try {
    const candidate = JSON.parse(value) as Partial<SessionCoordinationMessage>;
    if (
      typeof candidate.at !== 'number' ||
      typeof candidate.nonce !== 'string' ||
      (candidate.reason !== 'signed-out' && candidate.reason !== 'session-expired')
    ) {
      return null;
    }

    return candidate as SessionCoordinationMessage;
  } catch {
    return null;
  }
}

export function installSessionCoordination(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== SESSION_COORDINATION_STORAGE_KEY || !event.newValue) return;
    if (!isProtectedCreatorPath(window.location.pathname)) return;

    const message = parseSessionMessage(event.newValue);
    if (!message) return;

    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.sessionStorage.clear();
    window.dispatchEvent(
      new CustomEvent(SESSION_EXPIRED_EVENT, {
        detail: {
          path:
            message.reason === 'signed-out'
              ? 'cross-tab-logout'
              : message.sourcePath ?? 'cross-tab-session-expired',
          returnTo,
        },
      }),
    );
    window.location.replace(sessionLoginPath(message.reason, returnTo));
  };

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}
