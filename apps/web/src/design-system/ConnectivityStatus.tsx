import { useEffect, useState } from 'react';

const RESTORED_NOTICE_DURATION_MS = 6_000;

type ConnectivityState = 'online' | 'offline';

export function ConnectivityStatus() {
  const [connectivity, setConnectivity] = useState<ConnectivityState>('online');
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setWasOffline(true);
      setConnectivity('offline');
    };
    const handleOnline = () => setConnectivity('online');

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Some embedded and headless browsers report a disconnected host-network
    // signal even while the DigiStream origin is reachable. Verify the app
    // origin before presenting an initial offline claim; subsequent native
    // online/offline events remain authoritative and immediate.
    let active = true;
    if (!navigator.onLine) {
      void fetch('/api/v1/status', { cache: 'no-store' })
        .catch(() => {
          if (active) handleOffline();
        });
    }

    return () => {
      active = false;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (connectivity !== 'online' || !wasOffline) return;

    const timeout = window.setTimeout(() => setWasOffline(false), RESTORED_NOTICE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [connectivity, wasOffline]);

  if (connectivity === 'online' && !wasOffline) return null;

  if (connectivity === 'offline') {
    return (
      <div
        aria-atomic="true"
        aria-live="polite"
        className="echoo-connectivity-status echoo-connectivity-status--offline"
        data-testid="connectivity-status"
        role="status"
      >
        <strong>You appear to be offline.</strong>{' '}
        Server-backed actions may not work until your network connection returns.
      </div>
    );
  }

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="echoo-connectivity-status echoo-connectivity-status--restored"
      data-testid="connectivity-status"
      role="status"
    >
      <span>
        <strong>Network available again.</strong>{' '}
        Retry any action that did not complete to confirm the latest server state.
      </span>
      <button aria-label="Dismiss network restored message" onClick={() => setWasOffline(false)} type="button">
        Dismiss
      </button>
    </div>
  );
}
