import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const authSourcePath = resolve(
  process.cwd(),
  'apps/web/src/auth/AuthScreen.tsx',
);
const authCssPath = resolve(
  process.cwd(),
  'apps/web/src/auth/auth-screen.css',
);

test('authentication screen uses the Echoo reference hierarchy', async () => {
  const source = await readFile(authSourcePath, 'utf8');

  expect(source).toContain('Create an account');
  expect(source).toContain('Continue with Email');
  expect(source).toContain('Hear every audio detail');
  expect(source).toContain('clearly with <span>Echoo</span>');
  expect(source).toContain('Welcome back');
  expect(source).toContain("view === 'register-form' ? 'Create account' : 'Login'");
  expect(source).toContain('Your session ended. Sign in to continue.');
});

test('authentication stays wired to the existing authoritative backend', async () => {
  const source = await readFile(authSourcePath, 'utf8');

  expect(source).toContain("'/api/v1/auth/providers'");
  expect(source).toContain("registering ? '/api/v1/auth/register' : '/api/v1/auth/login'");
  expect(source).toContain("'/api/v1/auth/google'");
  expect(source).toContain("finishAuthentication(response.user)");
  expect(source).toContain('creatorReturnPath(window.location.search, window.location.origin)');
});

test('provider controls are truthful and unsupported providers are absent', async () => {
  const source = await readFile(authSourcePath, 'utf8');

  expect(source).toContain('googleReady && providers.google.clientId');
  expect(source).toContain('Checking sign-in methods…');
  expect(source).not.toContain('Continue With Apple');
  expect(source).not.toContain('Continue with Apple');
  expect(source).not.toContain('AppleIdentity');
});

test('password recovery is not presented before backend ownership exists', async () => {
  const source = await readFile(authSourcePath, 'utf8');

  expect(source).toContain('Password recovery is intentionally not rendered until the backend owns a real reset flow.');
  expect(source).not.toContain('Forgot?');
  expect(source).not.toContain('Forgot password?');
});

test('reference styling preserves mobile, safe-area, focus and reduced-motion requirements', async () => {
  const css = await readFile(authCssPath, 'utf8');

  expect(css).toContain('background: #eff5fd;');
  expect(css).toContain('min-height: 100dvh;');
  expect(css).toContain('env(safe-area-inset-bottom)');
  expect(css).toContain('@media (orientation: landscape) and (max-height: 620px)');
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  expect(css).toContain(':focus-visible');
  expect(css).toContain('min-height: 44px;');
});

test('authentication screen excludes the removed legacy creator panel', async () => {
  const source = await readFile(authSourcePath, 'utf8');

  expect(source).not.toContain('auth-brand-panel');
  expect(source).not.toContain('Creator workspace</StatusBadge>');
  expect(source).not.toContain('Create live audio and manage your broadcasts in one place.');
  expect(source).not.toContain('or use email');
});
