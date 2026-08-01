import { useEffect, useRef, useState } from 'react';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize(options: {
    client_id: string;
    callback(response: GoogleCredentialResponse): void;
    nonce: string;
    auto_select: boolean;
    cancel_on_tap_outside: boolean;
    context: 'signin' | 'signup' | 'use';
    ux_mode: 'popup';
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type: 'standard';
      theme: 'filled_black';
      size: 'large';
      text: 'continue_with';
      shape: 'rectangular';
      logo_alignment: 'left';
      width: number;
    },
  ): void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

const SCRIPT_ID = 'digistream-google-identity-services';
const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Google sign-in could not be loaded.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'));
    document.head.append(script);
  });

  return scriptPromise;
}

function createNonce(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function GoogleIdentityButton({
  clientId,
  disabled = false,
  mode,
  onCredential,
}: {
  clientId: string;
  disabled?: boolean;
  mode: 'login' | 'register';
  onCredential(credential: string, nonce: string): void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onCredential);
  const [error, setError] = useState('');

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !clientId || disabled) return;

    let cancelled = false;
    const nonce = createNonce();
    setError('');

    void loadGoogleIdentityServices()
      .then(() => {
        if (cancelled || !container || !window.google?.accounts.id) return;
        container.replaceChildren();
        const width = Math.max(240, Math.min(400, Math.floor(container.clientWidth || 400)));
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response.credential) {
              setError('Google did not return a sign-in credential.');
              return;
            }
            callbackRef.current(response.credential, nonce);
          },
          nonce,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: mode === 'register' ? 'signup' : 'signin',
          ux_mode: 'popup',
        });
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width,
        });
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Google sign-in could not be loaded.',
          );
        }
      });

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [clientId, disabled, mode]);

  return (
    <div className={`auth-google ${disabled ? 'is-disabled' : ''}`}>
      <div
        aria-label={mode === 'register' ? 'Create account with Google' : 'Sign in with Google'}
        className="auth-google-button"
        ref={containerRef}
      />
      {error ? <p className="auth-inline-error" role="alert">{error}</p> : null}
    </div>
  );
}
