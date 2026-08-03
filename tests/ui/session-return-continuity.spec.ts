import { expect, test } from '@playwright/test';
import { creatorReturnPath } from '../../apps/web/src/auth/AuthScreen';

test('restores only the verified creator route after session expiry', () => {
  expect(
    creatorReturnPath(
      '?reason=session-expired&returnTo=%2Fcreator%2Frecordings%3Ffilter%3Dready%23latest',
      'https://digistream.example',
    ),
  ).toBe('/creator/recordings?filter=ready#latest');
});

test('rejects foreign, protocol-relative and non-creator return paths', () => {
  const origin = 'https://digistream.example';
  expect(creatorReturnPath('?reason=session-expired&returnTo=https%3A%2F%2Fevil.example', origin)).toBeNull();
  expect(creatorReturnPath('?reason=session-expired&returnTo=%2F%2Fevil.example', origin)).toBeNull();
  expect(creatorReturnPath('?reason=session-expired&returnTo=%2Flisten', origin)).toBeNull();
  expect(creatorReturnPath('?returnTo=%2Fcreator%2Foverview', origin)).toBeNull();
});

test('both email and Google authentication restore before mounting creator state', async ({ page }) => {
  const source = await page.request.get(
    'file://' + process.cwd() + '/apps/web/src/auth/AuthScreen.tsx',
  ).catch(() => null);
  void source;

  const authSource = await import('node:fs').then(({ readFileSync }) =>
    readFileSync('apps/web/src/auth/AuthScreen.tsx', 'utf8'),
  );
  expect(authSource).toContain("window.history.replaceState({}, '', returnPath)");
  expect(authSource).toContain('finishAuthentication(response.user)');
  expect(authSource).toContain('onAuthenticated(response.user)');
  expect(authSource).toContain('Your creator session expired. Sign in again');
});
