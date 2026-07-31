import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './design-system/tokens.css';
import './design-system/base.css';
import './design-system/components.css';
import './design-system/feedback.css';
import './design-system/creator-shell.css';
import './design-system/listener-shell.css';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('DigiStream root element was not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
