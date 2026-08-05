import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const authSourcePath = resolve(
  process.cwd(),
  'apps/web/src/auth/AuthScreen.tsx',
);

test('authentication screen uses concise human copy', async () => {
  const source = await readFile(authSourcePath, 'utf8');

  expect(source).toContain('Create live audio and manage your broadcasts in one place.');
  expect(source).toContain("mode === 'register' ? 'Create your account' : 'Sign in'");
  expect(source).toContain('Your session ended. Sign in to continue.');
  expect(source).toContain("? 'Use your email to create an account.'");
  expect(source).toContain(": 'Use your email to sign in.'");
  expect(source).toContain('Checking available sign-in methods…');
});

test('Google copy and divider appear only when Google is ready', async () => {
  const source = await readFile(authSourcePath, 'utf8');

  expect(source).toContain("googleReady && providers.google.clientId ? (");
  expect(source).toContain('Use email or Google to get started.');
  expect(source).toContain('Use the email or Google account linked to DigiStream.');
  expect(source).toContain('<div className="auth-divider"><span>or use email</span></div>');
  expect(source).not.toContain('Google sign-in is unavailable here. Use email instead.');
});

test('authentication screen excludes removed generic product copy', async () => {
  const source = await readFile(authSourcePath, 'utf8');

  expect(source).not.toContain('professional live audio from one responsive workspace');
  expect(source).not.toContain('can create its first organisation');
  expect(source).not.toContain('return to the same DigiStream workspace');
  expect(source).not.toContain('not configured in this environment');
});
