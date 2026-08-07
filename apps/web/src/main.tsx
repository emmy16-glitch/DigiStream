import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
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
import './landing/landing-page.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Echoo root element was not found');
}

const route = resolveInitialRoute(window.location.pathname);

if (route.replaceHistory) {
  window.history.replaceState({}, '', route.path);
}

createRoot(root).render(
  <StrictMode>
    {route.path === '/' ? <LandingPage /> : <App />}
  </StrictMode>,
);