import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const authSource = readFileSync('apps/web/src/auth/AuthScreen.tsx', 'utf8');

test('restores only a verified creator route after session expiry', () => {
  expect(authSource).toContain("parameters.get('reason') !== 'session-expired'");
  expect(authSource).toContain("requestedPath.startsWith('/')");
  expect(authSource).toContain("requestedPath.startsWith('//')");
  expect(authSource).toContain('destination.origin !== origin');
  expect(authSource).toContain("destination.pathname === '/creator'");
  expect(authSource).toContain("destination.pathname.startsWith('/creator/')");
  expect(authSource).toContain('`${destination.pathname}${destination.search}${destination.hash}`');
});

test('rejects lookalike paths outside the creator route boundary', () => {
  expect(authSource).toContain('const isCreatorRoute =');
  expect(authSource).toContain('!isCreatorRoute');
  expect(authSource).not.toContain("destination.pathname.startsWith('/creator'))");
});

test('email and Google authentication restore before mounting creator state', () => {
  expect(authSource).toContain("window.history.replaceState({}, '', returnPath)");
  expect(authSource).toContain('finishAuthentication(response.user)');
  expect(authSource).toContain('onAuthenticated(response.user)');
  expect(authSource).toContain('Your creator session expired. Sign in again');
});

test('the return path is ignored without the session-expiry reason', () => {
  expect(authSource).toContain("if (parameters.get('reason') !== 'session-expired') return null");
  expect(authSource).toContain('if (!requestedPath');
  expect(authSource).toContain('catch {\n    return null;');
});
