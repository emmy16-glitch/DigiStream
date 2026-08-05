import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import type { AuthUser, AuthUserResponse } from '@digistream/contracts';
import {
  BrandLockup,
  Button,
  LinkButton,
  StatusBadge,
} from '../design-system/components';
import { ApiClientError, apiRequest, jsonBody } from '../lib/api-client';
import { GoogleIdentityButton } from './GoogleIdentityButton';

type AuthMode = 'login' | 'register';

type AuthProvidersResponse = {
  providers: {
    email: { enabled: boolean };
    google: { enabled: boolean; clientId: string | null };
  };
};

function readableError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'The account request could not be completed.';
}

export function creatorReturnPath(
  search: string,
  origin: string,
): string | null {
  const parameters = new URLSearchParams(search);
  if (parameters.get('reason') !== 'session-expired') return null;

  const requestedPath = parameters.get('returnTo');
  if (!requestedPath || !requestedPath.startsWith('/') || requestedPath.startsWith('//')) {
    return null;
  }

  try {
    const destination = new URL(requestedPath, origin);
    const isCreatorRoute =
      destination.pathname === '/creator' ||
      destination.pathname.startsWith('/creator/');
    if (destination.origin !== origin || !isCreatorRoute) {
      return null;
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

export function AuthScreen({
  initialMode = 'login',
  onAuthenticated,
}: {
  initialMode?: AuthMode;
  onAuthenticated(user: AuthUser): void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState<AuthProvidersResponse['providers']>({
    email: { enabled: true },
    google: { enabled: false, clientId: null },
  });
  const [checkingProviders, setCheckingProviders] = useState(true);
  const returnPath = useMemo(
    () => creatorReturnPath(window.location.search, window.location.origin),
    [],
  );

  useEffect(() => {
    let active = true;
    void apiRequest<AuthProvidersResponse>('/api/v1/auth/providers')
      .then((response) => {
        if (active) setProviders(response.providers);
      })
      .catch(() => {
        if (active) {
          setProviders({
            email: { enabled: true },
            google: { enabled: false, clientId: null },
          });
        }
      })
      .finally(() => {
        if (active) setCheckingProviders(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function finishAuthentication(user: AuthUser) {
    if (returnPath) window.history.replaceState({}, '', returnPath);
    onAuthenticated(user);
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const response = await apiRequest<AuthUserResponse>(
        mode === 'register' ? '/api/v1/auth/register' : '/api/v1/auth/login',
        {
          method: 'POST',
          body: jsonBody(
            mode === 'register'
              ? { displayName, email, password }
              : { email, password },
          ),
        },
      );
      finishAuthentication(response.user);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setBusy(false);
    }
  }

  const authenticateWithGoogle = useCallback(
    async (credential: string, nonce: string) => {
      setBusy(true);
      setError('');
      try {
        const response = await apiRequest<AuthUserResponse>('/api/v1/auth/google', {
          method: 'POST',
          body: jsonBody({ credential, nonce }),
        });
        if (returnPath) window.history.replaceState({}, '', returnPath);
        onAuthenticated(response.user);
      } catch (requestError) {
        setError(readableError(requestError));
      } finally {
        setBusy(false);
      }
    },
    [onAuthenticated, returnPath],
  );

  const googleReady =
    !checkingProviders &&
    providers.google.enabled &&
    Boolean(providers.google.clientId);
  const supportingCopy = googleReady
    ? mode === 'register'
      ? 'Use email or Google to get started.'
      : 'Use the email or Google account linked to DigiStream.'
    : mode === 'register'
      ? 'Use your email to create an account.'
      : 'Use your email to sign in.';

  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-labelledby="auth-product-title">
        <a className="auth-brand-link" href="/" aria-label="DigiStream home">
          <BrandLockup />
        </a>
        <div className="auth-brand-copy">
          <StatusBadge tone="success">Creator workspace</StatusBadge>
          <h1 id="auth-product-title">DigiStream</h1>
          <p>Create live audio and manage your broadcasts in one place.</p>
        </div>
        <LinkButton href="/listen" icon="headphones" variant="ghost">
          Listen to broadcasts
        </LinkButton>
      </section>

      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-mode-tabs" role="tablist" aria-label="Account action">
          <button
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'active' : ''}
            onClick={() => switchMode('login')}
            role="tab"
            type="button"
          >
            Sign in
          </button>
          <button
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'active' : ''}
            onClick={() => switchMode('register')}
            role="tab"
            type="button"
          >
            Create account
          </button>
        </div>

        <header className="auth-card-header">
          <span>{mode === 'register' ? 'New account' : 'Welcome back'}</span>
          <h2 id="auth-heading">
            {mode === 'register' ? 'Create your account' : 'Sign in'}
          </h2>
          <p>{supportingCopy}</p>
        </header>

        {returnPath ? (
          <div className="auth-provider-note" role="status">
            Your session ended. Sign in to continue.
          </div>
        ) : null}

        {googleReady && providers.google.clientId ? (
          <>
            <GoogleIdentityButton
              clientId={providers.google.clientId}
              disabled={busy}
              mode={mode}
              onCredential={authenticateWithGoogle}
            />
            <div className="auth-divider"><span>or use email</span></div>
          </>
        ) : checkingProviders ? (
          <div className="auth-google-placeholder" aria-busy="true">
            Checking available sign-in methods…
          </div>
        ) : null}

        <form className="auth-form" onSubmit={submitEmail}>
          {mode === 'register' ? (
            <label>
              Display name
              <input
                autoComplete="name"
                maxLength={100}
                minLength={2}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                type="text"
                value={displayName}
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              autoComplete="email"
              maxLength={320}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              maxLength={128}
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
            />
            <small>Use 12–128 characters.</small>
          </label>

          {mode === 'register' ? (
            <label>
              Confirm password
              <input
                autoComplete="new-password"
                maxLength={128}
                minLength={12}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
              />
            </label>
          ) : null}

          <label className="auth-show-password">
            <input
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              type="checkbox"
            />
            Show password
          </label>

          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <Button
            fullWidth
            loading={busy}
            type="submit"
            variant="primary"
          >
            {mode === 'register' ? 'Create account with email' : 'Sign in with email'}
          </Button>
        </form>

        <p className="auth-switch-copy">
          {mode === 'register' ? 'Already have an account?' : 'New to DigiStream?'}{' '}
          <button
            onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
            type="button"
          >
            {mode === 'register' ? 'Sign in' : 'Create account'}
          </button>
        </p>
      </section>
    </main>
  );
}
