import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LandingPage } from './landing/LandingPage';
import './design-system/tokens.css';
import './design-system/base.css';
import './design-system/components.css';
import './design-system/feedback.css';
import './design-system/creator-shell.css';
import './design-system/listener-shell.css';
import './auth/auth-screen.css';
import './features/broadcasting/creator-broadcast-studio-landscape.css';
import './styles.css';
import './design-system/responsive-operations.css';
import './design-system/manual-review-fixes.css';
import './landing/landing-page.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('DigiStream root element was not found');
}

let normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/';

// Analytics remains unavailable until real, authorised metrics and complete
// loading, empty and failure states exist. Keep direct or stale bookmarks from
// exposing the placeholder route while preserving a safe creator destination.
if (normalizedPath === '/creator/analytics') {
  normalizedPath = '/creator/overview';
  window.history.replaceState({}, '', normalizedPath);
}

createRoot(root).render(
  <StrictMode>
    {normalizedPath === '/' ? <LandingPage /> : <App />}
  </StrictMode>,
);
