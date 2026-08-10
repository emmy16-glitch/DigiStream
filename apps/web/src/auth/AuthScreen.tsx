import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import type { AuthUser, AuthUserResponse } from '@digistream/contracts';
import { BrandLockup } from '../design-system/components';
import { ApiClientError, apiRequest, jsonBody } from '../lib/api-client';
import { GoogleIdentityButton } from './GoogleIdentityButton';

type AuthMode = 'login' | 'register';
type AuthView = 'login' | 'register-choice' | 'register-form';

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
    if (destination.origin !== origin || !isCreatorRoute) return null;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return null;
  }
}

function AuthHeroArtwork() {
  return (
    <svg
      aria-label="Creator wearing headphones and speaking into a studio microphone"
      className="auth-hero-artwork"
      role="img"
      viewBox="0 0 760 760"
    >
      <defs>
        <linearGradient id="authHeroBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8eceb" />
          <stop offset="0.58" stopColor="#f0d2d1" />
          <stop offset="1" stopColor="#e7b6b6" />
        </linearGradient>
        <linearGradient id="authShirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8eceb" />
          <stop offset="1" stopColor="#e7b6b6" />
        </linearGradient>
        <radialGradient id="authFace" cx="45%" cy="35%" r="70%">
          <stop offset="0" stopColor="#9a6651" />
          <stop offset="1" stopColor="#4d2d26" />
        </radialGradient>
        <filter id="authSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <rect width="760" height="760" fill="url(#authHeroBg)" />
      <g opacity="0.7" filter="url(#authSoft)">
        <circle cx="120" cy="150" r="112" fill="#f8eceb" />
        <circle cx="645" cy="120" r="100" fill="#fdf6f4" />
        <circle cx="650" cy="620" r="150" fill="#d58f97" />
      </g>
      <g opacity="0.55">
        <rect x="38" y="62" width="240" height="26" rx="13" fill="#1f2025" />
        <rect x="54" y="104" width="184" height="18" rx="9" fill="#e7b6b6" />
        <rect x="474" y="66" width="220" height="22" rx="11" fill="#1f2025" />
        <rect x="492" y="106" width="170" height="16" rx="8" fill="#e7b6b6" />
      </g>
      <path d="M150 760c25-157 115-241 253-241 139 0 230 84 258 241Z" fill="url(#authShirt)" />
      <ellipse cx="365" cy="345" rx="126" ry="153" fill="url(#authFace)" />
      <path d="M251 330c8-104 50-171 127-171 75 0 121 56 128 139-36-48-95-74-174-59-34 7-61 37-81 91Z" fill="#1f2025" />
      <path d="M244 310c-30 18-44 58-32 99 7 26 24 44 46 52" fill="none" stroke="#1f2025" strokeWidth="28" strokeLinecap="round" />
      <path d="M496 301c32 18 47 60 34 102-8 27-25 46-49 54" fill="none" stroke="#1f2025" strokeWidth="28" strokeLinecap="round" />
      <path d="M236 307c22-89 73-139 139-139 72 0 124 50 143 137" fill="none" stroke="#3d3f47" strokeWidth="26" strokeLinecap="round" />
      <g fill="none" stroke="#1f2025" strokeWidth="11">
        <rect x="267" y="326" width="88" height="55" rx="25" />
        <rect x="382" y="326" width="88" height="55" rx="25" />
        <path d="M355 349h27" />
      </g>
      <circle cx="311" cy="352" r="12" fill="#f8eceb" opacity="0.72" />
      <circle cx="427" cy="352" r="12" fill="#f8eceb" opacity="0.72" />
      <path d="M335 429c27 21 66 21 93-3" fill="none" stroke="#f1c3af" strokeWidth="12" strokeLinecap="round" />
      <path d="M363 375c-9 28-14 43-13 52 11 8 25 10 40 5" fill="none" stroke="#3c211e" strokeWidth="9" strokeLinecap="round" />
      <g transform="translate(515 417) rotate(-8)">
        <rect x="0" y="0" width="98" height="178" rx="48" fill="#1f2025" />
        <rect x="17" y="20" width="64" height="104" rx="32" fill="#3d3f47" />
        <g stroke="#75757c" strokeWidth="5" opacity="0.8">
          <path d="M27 42h44M23 61h52M22 80h54M25 99h48" />
        </g>
        <path d="M49 178v92M-10 268h120" stroke="#1f2025" strokeWidth="18" strokeLinecap="round" />
      </g>
      <path d="M515 491c-67 9-111 6-156-10" fill="none" stroke="#3d3f47" strokeWidth="16" strokeLinecap="round" />
      <rect x="0" y="0" width="760" height="760" fill="none" stroke="rgba(31,32,37,0.45)" strokeWidth="2" />
    </svg>
  );
}

function PasswordField({
  autoComplete,
  label,
  onChange,
  showPassword,
  togglePassword,
  value,
}: {
  autoComplete: 'current-password' | 'new-password';
  label: string;
  onChange(value: string): void;
  showPassword: boolean;
  togglePassword(): void;
  value: string;
}) {
  return (
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      <span className="auth-password-field">
        <input
          aria-label={label}
          autoComplete={autoComplete}
          maxLength={128}
          minLength={12}
          onChange={(event) => onChange(event.target.value)}
          placeholder={label}
          required
          type={showPassword ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="auth-password-toggle"
          onClick={togglePassword}
          type="button"
        >
          <span aria-hidden="true">{showPassword ? '●' : '◉'}</span>
        </button>
      </span>
    </label>
  );
}

export function AuthScreen({
  initialMode = 'login',
  onAuthenticated,
}: {
  initialMode?: AuthMode;
  onAuthenticated(user: AuthUser): void;
}) {
  const [view, setView] = useState<AuthView>(
    initialMode === 'register' ? 'register-choice' : 'login',
  );
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

  function changeView(nextView: AuthView) {
    setView(nextView);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const registering = view === 'register-form';

    if (registering && password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const response = await apiRequest<AuthUserResponse>(
        registering ? '/api/v1/auth/register' : '/api/v1/auth/login',
        {
          method: 'POST',
          body: jsonBody(
            registering
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
        finishAuthentication(response.user);
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
  const authMode: AuthMode = view === 'login' ? 'login' : 'register';

  if (view === 'register-choice') {
    return (
      <main className="auth-page auth-page-choice">
        <section className="auth-mobile-card auth-choice-card" aria-labelledby="auth-heading">
          <div className="auth-choice-hero">
            <AuthHeroArtwork />
            <div className="auth-hero-brand"><BrandLockup /></div>
          </div>
          <div className="auth-choice-content">
            <h1 id="auth-heading">Create an account</h1>
            <p className="auth-choice-subtitle">Choose how you want to create your account.</p>
            <button
              className="auth-provider-pill auth-provider-pill-primary"
              disabled={busy || !providers.email.enabled}
              onClick={() => changeView('register-form')}
              type="button"
            >
              <span className="auth-provider-icon" aria-hidden="true">✉</span>
              Continue with Email
            </button>
            {googleReady && providers.google.clientId ? (
              <div className="auth-google-reference-wrap">
                <GoogleIdentityButton
                  clientId={providers.google.clientId}
                  disabled={busy}
                  mode="register"
                  onCredential={authenticateWithGoogle}
                />
              </div>
            ) : null}
            {checkingProviders ? (
              <p className="auth-provider-check" aria-live="polite">Checking sign-in methods…</p>
            ) : null}
            <p className="auth-switch-copy">
              Already have an account?{' '}
              <button onClick={() => changeView('login')} type="button">Sign in</button>
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section
        className={`auth-mobile-card auth-form-card ${view === 'login' ? 'auth-login-card' : ''}`}
        aria-labelledby="auth-heading"
      >
        <a className="auth-logo-link" href="/" aria-label="Echoo home">
          <BrandLockup />
        </a>

        {view === 'register-form' ? (
          <header className="auth-reference-heading">
            <h1 id="auth-heading">Create your account</h1>
            <p>Get started with your Echoo account.</p>
          </header>
        ) : (
          <header className="auth-reference-heading auth-login-heading">
            <h1 id="auth-heading">Welcome back</h1>
            <p>Sign in to your Echoo account.</p>
          </header>
        )}

        {returnPath ? (
          <div className="auth-provider-note" role="status">
            Your session ended. Sign in to continue.
          </div>
        ) : null}

        <form className="auth-form" onSubmit={submitEmail}>
          {view === 'register-form' ? (
            <label className="auth-field">
              <span className="auth-field-label">Full name</span>
              <input
                aria-label="Full name"
                autoComplete="name"
                maxLength={100}
                minLength={2}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Full name"
                required
                type="text"
                value={displayName}
              />
            </label>
          ) : null}

          <label className="auth-field">
            <span className="auth-field-label">Email</span>
            <input
              aria-label="Email"
              autoComplete="email"
              maxLength={320}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
              type="email"
              value={email}
            />
          </label>

          <PasswordField
            autoComplete={view === 'register-form' ? 'new-password' : 'current-password'}
            label="Password"
            onChange={setPassword}
            showPassword={showPassword}
            togglePassword={() => setShowPassword((value) => !value)}
            value={password}
          />

          {view === 'register-form' ? (
            <PasswordField
              autoComplete="new-password"
              label="Confirm password"
              onChange={setConfirmPassword}
              showPassword={showPassword}
              togglePassword={() => setShowPassword((value) => !value)}
              value={confirmPassword}
            />
          ) : null}

          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <button
            aria-busy={busy || undefined}
            className="auth-primary-button"
            disabled={busy}
            type="submit"
          >
            {busy ? 'Please wait…' : view === 'register-form' ? 'Create account' : 'Login'}
          </button>
        </form>

        {view === 'register-form' ? (
          <p className="auth-legal-copy">
            By creating an account you agree to our<br />Terms of service and Privacy Policy
          </p>
        ) : null}

        {googleReady && providers.google.clientId ? (
          <>
            <div className="auth-reference-divider"><span>or</span></div>
            <div className="auth-google-reference-wrap">
              <GoogleIdentityButton
                clientId={providers.google.clientId}
                disabled={busy}
                mode={authMode}
                onCredential={authenticateWithGoogle}
              />
            </div>
          </>
        ) : checkingProviders ? (
          <p className="auth-provider-check" aria-live="polite">Checking sign-in methods…</p>
        ) : null}

        <p className="auth-switch-copy auth-form-switch-copy">
          {view === 'login' ? 'New to Echoo?' : 'Already have an account?'}{' '}
          <button
            onClick={() => changeView(view === 'login' ? 'register-choice' : 'login')}
            type="button"
          >
            {view === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </p>

        {/* Password recovery is intentionally not rendered until the backend owns a real reset flow. */}
      </section>
    </main>
  );
}
