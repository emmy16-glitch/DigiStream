import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import type { ListenerRoute } from './listener-route';
import './listener-call-ins.css';

type PublicBroadcastRoute = Extract<ListenerRoute, { kind: 'public-broadcast' }>;

type CallInState = 'pending' | 'approved' | 'rejected';

type CreatedCallInResponse = {
  callIn: {
    id: string;
    displayName: string;
    status: CallInState;
    createdAt: string;
  };
  statusToken: string;
  statusExpiresAt: string;
};

type CallInStatusResponse = {
  callIn: {
    id: string;
    status: CallInState;
    displayName: string;
    contactProvided: boolean;
    createdAt: string;
    decidedAt: string | null;
    statusExpiresAt: string;
    guidance: string;
  };
};

type StoredTracking = {
  statusToken: string;
  statusExpiresAt: string;
  displayName: string;
};

type ListenerCallInPanelProps = {
  route: PublicBroadcastRoute;
};

function storageKey(route: PublicBroadcastRoute): string {
  return [
    'digistream-listener-call-in',
    route.organisationSlug,
    route.channelSlug,
    route.broadcastSlug,
  ].join(':');
}

function readableError(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return error instanceof Error
      ? error.message
      : 'The request could not be submitted.';
  }
  if (error.code === 'CALL_IN_ALREADY_PENDING') {
    return 'A request from this browser is already waiting. Keep the original tab open to continue tracking it.';
  }
  if (error.code === 'CALL_IN_RATE_LIMITED') {
    const retryAfter =
      typeof error.details === 'object' && error.details
        ? (error.details as { retryAfterSeconds?: unknown }).retryAfterSeconds
        : null;
    if (typeof retryAfter === 'number' && Number.isFinite(retryAfter)) {
      const minutes = Math.max(1, Math.ceil(retryAfter / 60));
      return `Too many requests were submitted. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`;
    }
    return 'Too many requests were submitted. Wait before trying again.';
  }
  if (error.code === 'CALL_IN_CLOSED') {
    return 'The production team is not accepting call-in requests for this broadcast.';
  }
  return error.message;
}

function statusLabel(status: CallInState): string {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Not selected';
  return 'Waiting for review';
}

function pendingGuidance(): string {
  return 'Your request is waiting for the production team. Keep this page open for updates.';
}

export function ListenerCallInPanel({ route }: ListenerCallInPanelProps) {
  const key = useMemo(() => storageKey(route), [route]);
  const endpoint = useMemo(
    () =>
      `/api/v1/broadcasts/${encodeURIComponent(
        route.organisationSlug,
      )}/${encodeURIComponent(route.channelSlug)}/${encodeURIComponent(
        route.broadcastSlug,
      )}/call-ins`,
    [route],
  );

  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [statusToken, setStatusToken] = useState('');
  const [statusExpiresAt, setStatusExpiresAt] = useState('');
  const [status, setStatus] = useState<CallInStatusResponse['callIn'] | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const saveTracking = useCallback(
    (tracking: StoredTracking) => {
      sessionStorage.setItem(key, JSON.stringify(tracking));
      setStatusToken(tracking.statusToken);
      setStatusExpiresAt(tracking.statusExpiresAt);
      setDisplayName((current) => current || tracking.displayName);
    },
    [key],
  );

  const clearTracking = useCallback(() => {
    sessionStorage.removeItem(key);
    setStatusToken('');
    setStatusExpiresAt('');
    setStatus(null);
  }, [key]);

  const refreshStatus = useCallback(async () => {
    if (!statusToken) return;
    if (
      statusExpiresAt &&
      new Date(statusExpiresAt).getTime() <= Date.now()
    ) {
      clearTracking();
      setError('The call-in status link expired. You may submit a new request.');
      return;
    }

    setRefreshing(true);
    try {
      const response = await apiRequest<CallInStatusResponse>(
        `/api/v1/call-ins/${encodeURIComponent(statusToken)}`,
      );
      setStatus(response.callIn);
      setStatusExpiresAt(response.callIn.statusExpiresAt);
      setError('');
    } catch (requestError) {
      if (
        requestError instanceof ApiClientError &&
        (requestError.code === 'CALL_IN_STATUS_EXPIRED' ||
          requestError.code === 'CALL_IN_STATUS_NOT_FOUND')
      ) {
        clearTracking();
        setError('This call-in status link is no longer available.');
      } else {
        setError(readableError(requestError));
      }
    } finally {
      setRefreshing(false);
    }
  }, [clearTracking, statusExpiresAt, statusToken]);

  useEffect(() => {
    const stored = sessionStorage.getItem(key);
    if (!stored) return;
    try {
      const tracking = JSON.parse(stored) as Partial<StoredTracking>;
      if (
        typeof tracking.statusToken === 'string' &&
        typeof tracking.statusExpiresAt === 'string' &&
        typeof tracking.displayName === 'string'
      ) {
        saveTracking(tracking as StoredTracking);
        setOpen(true);
      }
    } catch {
      sessionStorage.removeItem(key);
    }
  }, [key, saveTracking]);

  useEffect(() => {
    if (!statusToken) return;
    void refreshStatus();
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [refreshStatus, statusToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await apiRequest<CreatedCallInResponse>(endpoint, {
        method: 'POST',
        body: jsonBody({
          displayName,
          email: email || undefined,
          message: message || undefined,
        }),
      });
      const tracking: StoredTracking = {
        statusToken: response.statusToken,
        statusExpiresAt: response.statusExpiresAt,
        displayName: response.callIn.displayName,
      };
      saveTracking(tracking);
      setStatus({
        id: response.callIn.id,
        status: response.callIn.status,
        displayName: response.callIn.displayName,
        contactProvided: Boolean(email),
        createdAt: response.callIn.createdAt,
        decidedAt: null,
        statusExpiresAt: response.statusExpiresAt,
        guidance: pendingGuidance(),
      });
      setMessage('');
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setBusy(false);
    }
  }

  const launcherText = status
    ? status.status === 'pending'
      ? 'Call-in pending'
      : statusLabel(status.status)
    : statusToken
      ? 'Checking call-in…'
      : 'Request to speak';

  return (
    <aside className={`listener-call-in ${open ? 'open' : ''}`}>
      <button
        aria-expanded={open}
        className="listener-call-in-launcher"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">◉</span>
        {launcherText}
      </button>

      {open ? (
        <section
          aria-labelledby="listener-call-in-title"
          className="listener-call-in-panel"
        >
          <header>
            <div>
              <span>Live participation</span>
              <h2 id="listener-call-in-title">Request to speak</h2>
            </div>
            <button
              aria-label="Close request-to-speak panel"
              onClick={() => setOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>

          {error ? (
            <div className="listener-call-in-error" role="alert">
              {error}
            </div>
          ) : null}

          {statusToken ? (
            <div className="listener-call-in-status" aria-live="polite">
              <div className={`listener-call-in-state ${status?.status ?? 'pending'}`}>
                <i />
                <div>
                  <strong>
                    {status ? statusLabel(status.status) : 'Checking your request'}
                  </strong>
                  <span>
                    {refreshing ? 'Refreshing status…' : 'Status updates automatically'}
                  </span>
                </div>
              </div>

              <p>{status?.guidance ?? pendingGuidance()}</p>

              {status?.status === 'approved' ? (
                <div className="listener-call-in-guidance">
                  <strong>Prepare for backstage</strong>
                  <ul>
                    <li>Use headphones to prevent echo.</li>
                    <li>Move somewhere quiet with a stable connection.</li>
                    <li>Allow microphone access only after receiving the guest link.</li>
                  </ul>
                </div>
              ) : null}

              <div className="listener-call-in-actions">
                <button
                  disabled={refreshing}
                  onClick={() => void refreshStatus()}
                  type="button"
                >
                  {refreshing ? 'Checking…' : 'Check now'}
                </button>
                {status?.status === 'rejected' ? (
                  <button
                    className="secondary"
                    onClick={() => {
                      clearTracking();
                      setError('');
                    }}
                    type="button"
                  >
                    Start a new request
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p>
                Send a short request to the production team. Approval does not
                automatically turn on your microphone.
              </p>
              <label>
                Display name
                <input
                  autoComplete="name"
                  maxLength={80}
                  minLength={2}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  value={displayName}
                />
              </label>
              <label>
                Contact email <small>Optional</small>
                <input
                  autoComplete="email"
                  maxLength={320}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </label>
              <label>
                What would you like to say? <small>Optional</small>
                <textarea
                  maxLength={500}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  value={message}
                />
                <span>{message.length}/500</span>
              </label>
              <button className="listener-call-in-submit" disabled={busy} type="submit">
                {busy ? 'Sending request…' : 'Send request'}
              </button>
              <small className="listener-call-in-privacy">
                DigiStream stores a one-way request fingerprint for duplicate and
                abuse prevention. Your raw IP address is not stored with the call-in.
              </small>
            </form>
          )}
        </section>
      ) : null}
    </aside>
  );
}
