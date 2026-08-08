import { useCallback, useEffect, useState } from 'react';
import type { AuthUser, AuthUserResponse } from '@digistream/contracts';
import { AuthScreen } from '../../auth/AuthScreen';
import { LinkButton, StatePanel } from '../../design-system/components';
import { ApiClientError, apiRequest } from '../../lib/api-client';
import { PlatformAdminUsersPage } from './PlatformAdminUsersPage';

function readableError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Echoo could not check your administrative session.';
}

export function PlatformAdminApplication() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState('');

  const checkSession = useCallback(async () => {
    setChecking(true);
    setError('');
    try {
      const session = await apiRequest<AuthUserResponse>('/api/v1/auth/me');
      setUser(session.user);
    } catch (requestError) {
      if (requestError instanceof ApiClientError && requestError.status === 401) {
        setUser(null);
      } else {
        setUser(null);
        setError(readableError(requestError));
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  if (checking) {
    return (
      <main className="application-gate">
        <StatePanel kind="loading" title="Opening platform administration">
          Echoo is checking your secure session before loading administrative data.
        </StatePanel>
      </main>
    );
  }

  if (error) {
    return (
      <main className="application-gate">
        <StatePanel actionLabel="Retry" kind="offline" onAction={() => void checkSession()} title="Platform administration is unavailable">
          {error}
        </StatePanel>
        <LinkButton href="/" variant="ghost">Go to Echoo home</LinkButton>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen initialMode="login" onAuthenticated={setUser} />;
  }

  return <PlatformAdminUsersPage actor={user} onSignedOut={() => setUser(null)} />;
}
