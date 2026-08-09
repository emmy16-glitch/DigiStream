import { useEffect, useState } from 'react';

const RESTORED_NOTICE_DURATION_MS = 6_000;

type ConnectivityState = 'online' | 'offline';

function readConnectivityState(): ConnectivityState {
  return navigator.onLine ? 'online' : 'offline';
}

export function ConnectivityStatus() {
  const [connectivity, setConnectivity] = useState<ConnectivityState>(readConnectivityState);
  const [wasOffline, setWasOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => {
      setWasOffline(true);
      setConnectivity('offline');
    };
    const handleOnline = () => setConnectivity('online');

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
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
