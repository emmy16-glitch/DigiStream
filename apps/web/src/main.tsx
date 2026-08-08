import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { EchooSystemStatePage } from './design-system/EchooSystemStatePage';
import { parseGuestRoute } from './features/guests/guest-route';
import { parseListenerRoute } from './features/listening/listener-route';
import { LandingPage } from './landing/LandingPage';
import { resolveInitialRoute } from './routing/initial-route';
import './design-system/tokens.css';
import './design-system/base.css';
import './design-system/components.css';
import './design-system/control-state-consistency.css';
import './design-system/content-resilience.css';
import './design-system/feedback.css';
import './design-system/creator-shell.css';
import './design-system/listener-shell.css';
import './auth/auth-screen.css';
import './features/broadcasting/creator-broadcast-studio-landscape.css';
import './features/broadcasting/creator-broadcast-studio-mobile-clearance.css';
import './features/broadcasting/creator-broadcast-action-truth.css';
import './styles.css';
import './features/onboarding/echoo-onboarding.css';
import './design-system/responsive-operations.css';
import './design-system/manual-review-fixes.css';
import './design-system/semantic-feedback-contrast.css';
import './landing/landing-page.css';
import './features/guests/echoo-backstage.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Echoo root element was not found');
}

const route = resolveInitialRoute(window.location.pathname);

if (route.replaceHistory) {
  window.history.replaceState({}, '', route.path);
}

function isKnownApplicationPath(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/signup') return true;
  if (pathname === '/creator' || pathname.startsWith('/creator/')) return true;
  return Boolean(parseGuestRoute(pathname) || parseListenerRoute(pathname));
}

function RootApplication() {
  const sessionReason = new URLSearchParams(window.location.search).get('reason');
  const [showSessionExpired, setShowSessionExpired] = useState(
    route.path === '/login' && sessionReason === 'session-expired',
  );

  if (route.path === '/') return <LandingPage />;

  if (showSessionExpired) {
    return (
      <EchooSystemStatePage
        actionLabel="Log in again"
        kind="session-expired"
        onAction={() => setShowSessionExpired(false)}
        title="Session Expired"
      >
        Your session has expired.
      </EchooSystemStatePage>
    );
  }

  if (!isKnownApplicationPath(route.path)) {
    const listenerContext = route.path.startsWith('/listen');
    const recoveryPath = listenerContext ? '/listen' : '/';
    return (
      <EchooSystemStatePage
        actionLabel="Go back"
        kind="not-found"
        onAction={() => window.location.assign(recoveryPath)}
        title="Not Found"
      >
        {listenerContext
          ? 'Broadcast not found or no longer available.'
          : 'This page was not found or is no longer available.'}
      </EchooSystemStatePage>
    );
  }

  return <App />;
}

createRoot(root).render(
  <StrictMode>
    <RootApplication />
  </StrictMode>,
);
