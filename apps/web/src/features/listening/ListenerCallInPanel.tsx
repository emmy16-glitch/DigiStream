import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type {
  AuthUserResponse,
  OrganisationListResponse,
  PublicBroadcast,
  PublicBroadcastResponse,
} from '@digistream/contracts';
import { Icon } from '../../design-system/Icon';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import {
  useFixedActionReservation,
  useMobileOverlayLayout,
} from '../../lib/use-mobile-overlay-layout';
import { useModalDialog } from '../../lib/use-modal-dialog';
import type { ListenerRoute } from './listener-route';
import './listener-call-ins.css';
import './listener-call-in-reference.css';

type PublicBroadcastRoute = Extract<ListenerRoute, { kind: 'public-broadcast' }>;

type CallInState = 'pending' | 'approved' | 'rejected';
type ListenerRelationship =
  | 'checking'
  | 'visitor'
  | 'production'
  | 'moderator'
  | 'analyst'
  | 'unknown';

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

function relationshipForRole(role: string): ListenerRelationship {
  if (role === 'owner' || role === 'admin' || role === 'broadcaster') {
    return 'production';
  }
  if (role === 'moderator') return 'moderator';
  if (role === 'analyst') return 'analyst';
  return 'visitor';
}

function acceptsCallIns(status: PublicBroadcast['status'] | null): boolean {
  return status === 'live' || status === 'reconnecting';
}

export function ListenerCallInPanel({ route }: ListenerCallInPanelProps) {
  const key = useMemo(() => storageKey(route), [route]);
  const metadataEndpoint = useMemo(
    () =>
      `/api/v1/broadcasts/${encodeURIComponent(
        route.organisationSlug,
      )}/${encodeURIComponent(route.channelSlug)}/${encodeURIComponent(
        route.broadcastSlug,
      )}`,
    [route],
  );
  const endpoint = `${metadataEndpoint}/call-ins`;

  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [statusToken, setStatusToken] = useState('');
  const [statusExpiresAt, setStatusExpiresAt] = useState('');
  const [status, setStatus] = useState<CallInStatusResponse['callIn'] | null>(null);
  const [broadcastStatus, setBroadcastStatus] = useState<PublicBroadcast['status'] | null>(null);
  const [relationship, setRelationship] = useState<ListenerRelationship>('checking');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const dialogRef = useModalDialog<HTMLElement>(open, () => setOpen(false));
  const overlayStyle = useMobileOverlayLayout(open);
  const roleActionVisible = relationship === 'production' || relationship === 'moderator';
  const visitorActionAvailable =
    relationship === 'visitor' &&
    broadcastStatus !== null &&
    (Boolean(statusToken) || acceptsCallIns(broadcastStatus));
  const fixedActionVisible = roleActionVisible || (visitorActionAvailable && !open);
  useFixedActionReservation(fixedActionVisible);

  const saveTracking = useCallback((tracking: StoredTracking) => {
    sessionStorage.setItem(key, JSON.stringify(tracking));
    setStatusToken(tracking.statusToken);
    setStatusExpiresAt(tracking.statusExpiresAt);
    setDisplayName((current) => current || tracking.displayName);
  }, [key]);

  const clearTracking = useCallback(() => {
    sessionStorage.removeItem(key);
    setStatusToken('');
    setStatusExpiresAt('');
    setStatus(null);
    setSubmitted(false);
  }, [key]);

  const loadBroadcastStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await apiRequest<PublicBroadcastResponse>(metadataEndpoint, {
        signal: signal ?? null,
      });
      setBroadcastStatus(response.broadcast.status);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setBroadcastStatus(null);
    }
  }, [metadataEndpoint]);

  const refreshStatus = useCallback(async () => {
    if (!statusToken) return;
    if (statusExpiresAt && new Date(statusExpiresAt).getTime() <= Date.now()) {
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
    const controller = new AbortController();
    void loadBroadcastStatus(controller.signal);
    const timer = window.setInterval(() => void loadBroadcastStatus(), 8_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [loadBroadcastStatus]);

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<AuthUserResponse>('/api/v1/auth/me', { signal: controller.signal })
      .then(async (response) => {
        setDisplayName((current) => current || response.user.displayName);
        setEmail((current) => current || response.user.email);
        const organisations = await apiRequest<OrganisationListResponse>(
          '/api/v1/organisations',
          { signal: controller.signal },
        );
        const organisation = organisations.organisations.find(
          (item) => item.slug === route.organisationSlug,
        );
        setRelationship(organisation ? relationshipForRole(organisation.role) : 'visitor');
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        if (requestError instanceof ApiClientError && requestError.status === 401) {
          setRelationship('visitor');
        } else {
          setRelationship('unknown');
        }
      });
    return () => controller.abort();
  }, [route.organisationSlug]);

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
    const timer = window.setInterval(() => void refreshStatus(), 5_000);
    return () => window.clearInterval(timer);
  }, [refreshStatus, statusToken]);

  useEffect(() => {
    if (
      relationship === 'production' ||
      relationship === 'moderator' ||
      relationship === 'analyst'
    ) {
      setOpen(false);
    }
  }, [relationship]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSubmitted(false);
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
      setSubmitted(true);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (relationship === 'checking' || relationship === 'unknown' || !broadcastStatus) {
    return null;
  }

  if (relationship === 'production') {
    return (
      <aside className="listener-call-in listener-call-in-role-action">
        <a className="listener-call-in-launcher" href="/creator/broadcasts">
          Manage broadcast
        </a>
      </aside>
    );
  }

  if (relationship === 'moderator') {
    return (
      <aside className="listener-call-in listener-call-in-role-action">
        <a className="listener-call-in-launcher" href="/creator/studio-lobby">
          Open Studio Lobby
        </a>
      </aside>
    );
  }

  if (relationship === 'analyst') return null;
  if (!statusToken && !acceptsCallIns(broadcastStatus)) return null;

  const launcherText = status
    ? status.status === 'pending'
      ? 'Call-in pending'
      : statusLabel(status.status)
    : statusToken
      ? 'Checking call-in…'
      : 'Request to speak';

  return (
    <aside className={`listener-call-in ${open ? 'open' : ''}`} style={overlayStyle}>
      {!open ? (
        <button
          aria-expanded="false"
          aria-haspopup="dialog"
          className="listener-call-in-launcher"
          onClick={() => setOpen(true)}
          type="button"
        >
          {launcherText}
        </button>
      ) : null}

      {open ? (
        <>
          <button
            aria-label="Close request-to-speak panel"
            className="listener-call-in-backdrop"
            onClick={() => setOpen(false)}
            tabIndex={-1}
            type="button"
          />
          <section
            aria-labelledby="listener-call-in-title"
            aria-modal="true"
            className="listener-call-in-panel echoo-call-in-panel"
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <header className="echoo-call-in-header">
              <h2 id="listener-call-in-title">Request to join the conversation</h2>
              <button
                aria-label="Close request-to-speak panel"
                data-dialog-initial-focus
                onClick={() => setOpen(false)}
                type="button"
              >
                <Icon name="close" />
              </button>
            </header>

            {error ? <div className="listener-call-in-error" role="alert">{error}</div> : null}
            {submitted ? (
              <div className="listener-call-in-success" role="status">
                Request sent. Your status will update here while the production team reviews it.
              </div>
            ) : null}

            {statusToken ? (
              <div className="echoo-call-in-request-card listener-call-in-status" aria-live="polite">
                <div className={`echoo-call-in-mic is-${status?.status ?? 'pending'}`} aria-hidden="true">
                  <Icon name="microphone" size={40} />
                </div>
                <h3>{status ? statusLabel(status.status) : 'Checking your request'}</h3>
                <p>{status?.guidance ?? pendingGuidance()}</p>

                {status?.status === 'approved' ? (
                  <div className="listener-call-in-guidance">
                    <strong>Prepare for the Studio Lobby</strong>
                    <ul>
                      <li>Use headphones to prevent echo.</li>
                      <li>Move somewhere quiet with a stable connection.</li>
                      <li>Allow microphone access only after receiving the guest link.</li>
                    </ul>
                  </div>
                ) : null}

                <div className="listener-call-in-actions echoo-call-in-actions">
                  <button disabled={refreshing} onClick={() => void refreshStatus()} type="button">
                    {refreshing ? 'Checking…' : 'Check status'}
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
              <form className="echoo-call-in-request-card" onSubmit={submit}>
                <div className="echoo-call-in-mic" aria-hidden="true">
                  <Icon name="microphone" size={40} />
                </div>
                <p className="echoo-call-in-reference-copy">
                  You’ll be added to the talk when the host accepts your request.
                </p>

                <div className="echoo-call-in-fields">
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
                    Note to the host <small>Optional</small>
                    <textarea
                      maxLength={500}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={3}
                      value={message}
                    />
                    <span>{message.length}/500</span>
                  </label>
                </div>

                <button className="listener-call-in-submit echoo-call-in-submit" disabled={busy} type="submit">
                  {busy ? 'Sending request…' : 'Request to speak'}
                </button>
                <small className="echoo-call-in-microphone-note">
                  Make sure your microphone is ready. Approval does not turn it on automatically.
                </small>
                <small className="listener-call-in-privacy">
                  Echoo stores a one-way request fingerprint for duplicate and abuse prevention. Your raw IP address is not stored with the call-in.
                </small>
              </form>
            )}
          </section>
        </>
      ) : null}
    </aside>
  );
}
