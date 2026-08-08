import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthUser } from '@digistream/contracts';
import { BrandLockup, Button, LinkButton, StatePanel, StatusBadge } from '../../design-system/components';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import { sessionLoginPath } from '../../lib/session-coordination';
import './platform-admin-users.css';

type AdministrativeUserStatus = 'active' | 'suspended' | 'deleted';
type MutableAdministrativeUserStatus = 'active' | 'suspended';

type AdministrativeUser = {
  id: string;
  email: string;
  displayName: string;
  status: AdministrativeUserStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  capabilities: string[];
};

type AdministrativeUserPage = {
  users: AdministrativeUser[];
  nextCursor: string | null;
};

type AdministrativeUserResponse = {
  user: AdministrativeUser;
};

type StatusFilter = 'all' | AdministrativeUserStatus;

type PendingMutation = {
  user: AdministrativeUser;
  status: MutableAdministrativeUserStatus;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusTone(status: AdministrativeUserStatus) {
  if (status === 'active') return 'success' as const;
  if (status === 'suspended') return 'warning' as const;
  return 'danger' as const;
}

function readableError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Echoo could not complete that request.';
}

function recoverExpiredAdminSession(error: unknown): boolean {
  if (!(error instanceof ApiClientError) || error.status !== 401) return false;
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.sessionStorage.clear();
  window.location.replace(sessionLoginPath('session-expired', returnTo));
  return true;
}

export function PlatformAdminUsersPage({
  actor,
  onSignedOut,
}: {
  actor: AuthUser;
  onSignedOut(): void;
}) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [users, setUsers] = useState<AdministrativeUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);
  const [mutating, setMutating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const mutationCancelRef = useRef<HTMLButtonElement | null>(null);
  const mutationTriggerRef = useRef<HTMLButtonElement | null>(null);

  const loadUsers = useCallback(async (cursor?: string) => {
    const append = Boolean(cursor);
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    if (!append) setForbidden(false);

    try {
      const query = new URLSearchParams({ limit: '25' });
      if (filter !== 'all') query.set('status', filter);
      if (cursor) query.set('cursor', cursor);
      const response = await apiRequest<AdministrativeUserPage>(`/api/v1/admin/users?${query}`);
      setUsers((current) => append ? [...current, ...response.users] : response.users);
      setNextCursor(response.nextCursor);
    } catch (requestError) {
      if (recoverExpiredAdminSession(requestError)) return;
      if (requestError instanceof ApiClientError && requestError.status === 403) {
        setForbidden(true);
        setUsers([]);
        setNextCursor(null);
      } else {
        setError(readableError(requestError));
      }
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (pendingMutation) mutationCancelRef.current?.focus();
  }, [pendingMutation]);

  function openPendingMutation(
    user: AdministrativeUser,
    status: MutableAdministrativeUserStatus,
    trigger: HTMLButtonElement,
  ) {
    mutationTriggerRef.current = trigger;
    setPendingMutation({ user, status });
  }

  function closePendingMutation() {
    setPendingMutation(null);
    window.requestAnimationFrame(() => mutationTriggerRef.current?.focus());
  }

  function focusUpdatedUserAction(userId: string) {
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(`[data-admin-user-id="${userId}"] .platform-admin-user-actions button`)
        ?.focus();
    });
  }

  async function applyStatusChange() {
    if (!pendingMutation || mutating) return;
    setMutating(true);
    setError('');
    try {
      const response = await apiRequest<AdministrativeUserResponse>(
        `/api/v1/admin/users/${encodeURIComponent(pendingMutation.user.id)}/status`,
        {
          method: 'PATCH',
          body: jsonBody({ status: pendingMutation.status }),
        },
      );
      setUsers((current) => current.map((user) => (
        user.id === response.user.id ? response.user : user
      )));
      setPendingMutation(null);
      focusUpdatedUserAction(response.user.id);
    } catch (requestError) {
      if (recoverExpiredAdminSession(requestError)) return;
      setError(readableError(requestError));
    } finally {
      setMutating(false);
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      onSignedOut();
      setSigningOut(false);
    }
  }

  return (
    <main className="platform-admin-page">
      <header className="platform-admin-header">
        <a aria-label="Echoo home" className="platform-admin-brand" href="/">
          <BrandLockup />
        </a>
        <nav aria-label="Platform administration navigation">
          <LinkButton href="/creator/overview" variant="ghost">Creator workspace</LinkButton>
          <Button loading={signingOut} onClick={() => void signOut()} variant="ghost">Sign out</Button>
        </nav>
      </header>

      <section className="platform-admin-shell" aria-labelledby="platform-admin-title">
        <header className="platform-admin-intro">
          <div>
            <span>Platform administration</span>
            <h1 id="platform-admin-title">Users</h1>
            <p>Review persisted account state and suspend or reactivate accounts. Organisation roles remain managed inside their organisation.</p>
          </div>
          <div className="platform-admin-actor">
            <small>Signed in as</small>
            <strong>{actor.displayName}</strong>
            <span>{actor.email}</span>
          </div>
        </header>

        {forbidden ? (
          <StatePanel kind="unauthorized" title="Platform administrator access required">
            This area is available only to active platform administrators. Your creator and listener access is unchanged.
          </StatePanel>
        ) : (
          <>
            <section className="platform-admin-toolbar" aria-label="User filters">
              <label>
                Account status
                <select value={filter} onChange={(event) => setFilter(event.target.value as StatusFilter)}>
                  <option value="all">All accounts</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="deleted">Deleted</option>
                </select>
              </label>
              <Button onClick={() => void loadUsers()} variant="secondary">Refresh</Button>
            </section>

            {pendingMutation ? (
              <section
                aria-describedby="platform-admin-confirm-description"
                aria-labelledby="platform-admin-confirm-title"
                className="platform-admin-confirmation"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    closePendingMutation();
                  }
                }}
                role="alertdialog"
              >
                <div>
                  <strong id="platform-admin-confirm-title">
                    {pendingMutation.status === 'suspended' ? 'Suspend this account?' : 'Reactivate this account?'}
                  </strong>
                  <p id="platform-admin-confirm-description">
                    {pendingMutation.status === 'suspended'
                      ? `Suspending ${pendingMutation.user.displayName} revokes all of their active sessions immediately.`
                      : `Reactivating ${pendingMutation.user.displayName} allows them to sign in again with their existing account.`}
                  </p>
                </div>
                <div className="platform-admin-confirm-actions">
                  <Button
                    disabled={mutating}
                    onClick={closePendingMutation}
                    ref={mutationCancelRef}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    loading={mutating}
                    onClick={() => void applyStatusChange()}
                    variant={pendingMutation.status === 'suspended' ? 'danger' : 'primary'}
                  >
                    {pendingMutation.status === 'suspended' ? 'Confirm suspension' : 'Confirm reactivation'}
                  </Button>
                </div>
              </section>
            ) : null}

            {error ? (
              <StatePanel actionLabel="Retry" kind="error" onAction={() => void loadUsers()} title="User administration could not update">
                {error}
              </StatePanel>
            ) : null}

            {loading ? (
              <StatePanel kind="loading" title="Loading administrative users">
                Echoo is loading persisted user status and platform capabilities.
              </StatePanel>
            ) : users.length === 0 && !error ? (
              <StatePanel kind="empty" title="No users match this filter">
                Choose another account status or refresh the list.
              </StatePanel>
            ) : users.length > 0 ? (
              <section className="platform-admin-list" aria-label="Administrative users">
                {users.map((user) => (
                  <article className="platform-admin-user" data-admin-user-id={user.id} key={user.id}>
                    <div className="platform-admin-user-main">
                      <div>
                        <strong>{user.displayName}</strong>
                        <span>{user.email}</span>
                      </div>
                      <StatusBadge tone={statusTone(user.status)}>{user.status}</StatusBadge>
                    </div>
                    <dl>
                      <div><dt>Created</dt><dd>{formatDate(user.createdAt)}</dd></div>
                      <div><dt>Email</dt><dd>{user.emailVerifiedAt ? 'Verified' : 'Not verified'}</dd></div>
                      <div><dt>Capabilities</dt><dd>{user.capabilities.length ? user.capabilities.join(', ') : 'None'}</dd></div>
                    </dl>
                    <div className="platform-admin-user-actions">
                      {user.status === 'active' ? (
                        <Button
                          disabled={user.id === actor.id}
                          onClick={(event) => openPendingMutation(user, 'suspended', event.currentTarget)}
                          variant="danger"
                        >
                          {user.id === actor.id ? 'Current account' : 'Suspend'}
                        </Button>
                      ) : user.status === 'suspended' ? (
                        <Button
                          onClick={(event) => openPendingMutation(user, 'active', event.currentTarget)}
                          variant="primary"
                        >
                          Reactivate
                        </Button>
                      ) : (
                        <span className="platform-admin-immutable">Deleted accounts cannot be reactivated here.</span>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            ) : null}

            {nextCursor ? (
              <div className="platform-admin-load-more">
                <Button loading={loadingMore} onClick={() => void loadUsers(nextCursor)} variant="secondary">Load more users</Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
