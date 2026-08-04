import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveInitialRoute } from '../../web/src/routing/initial-route.ts';

test('keeps implemented creator destinations available', () => {
  for (const path of [
    '/creator/overview',
    '/creator/broadcasts',
    '/creator/audience',
    '/creator/recordings',
  ]) {
    assert.deepEqual(resolveInitialRoute(path), {
      path,
      replaceHistory: false,
    });
  }
});

test('replaces unfinished and unknown creator destinations with overview', () => {
  for (const path of [
    '/creator',
    '/creator/',
    '/creator/analytics',
    '/creator/unknown',
    '/creator/recordings/not-a-real-route',
  ]) {
    assert.deepEqual(resolveInitialRoute(path), {
      path: '/creator/overview',
      replaceHistory: true,
    });
  }
});

test('preserves public and authentication routes while normalizing trailing slashes', () => {
  assert.deepEqual(resolveInitialRoute('/listen/replays/'), {
    path: '/listen/replays',
    replaceHistory: true,
  });
  assert.deepEqual(resolveInitialRoute('/signup'), {
    path: '/signup',
    replaceHistory: false,
  });
  assert.deepEqual(resolveInitialRoute('/'), {
    path: '/',
    replaceHistory: false,
  });
});
