import { expect, test } from '@playwright/test';
import { listenerConnectionPresentation } from '../../apps/web/src/features/listening/listener-connection-presentation';

const liveStatus = 'live' as const;

test('listener connection states use plain language while keeping transport secondary', () => {
  const stable = listenerConnectionPresentation({
    activeProtocol: 'webrtc',
    online: true,
    phase: 'playing',
    playable: true,
    status: liveStatus,
  });
  expect(stable.label).toBe('Stable');
  expect(stable.guidance).toBe('Live audio is playing normally.');
  expect(stable.technical).toContain('WebRTC');

  const buffering = listenerConnectionPresentation({
    activeProtocol: 'llhls',
    online: true,
    phase: 'buffering',
    playable: true,
    status: liveStatus,
  });
  expect(buffering.label).toBe('Buffering');
  expect(buffering.guidance).not.toContain('LL-HLS');
  expect(buffering.technical).toContain('LL-HLS');

  const reconnecting = listenerConnectionPresentation({
    activeProtocol: null,
    online: true,
    phase: 'reconnecting',
    playable: true,
    status: 'reconnecting',
  });
  expect(reconnecting.label).toBe('Reconnecting');
  expect(reconnecting.guidance).toMatch(/automatically/i);
});

test('offline, unavailable and non-playable lifecycle states fail honestly', () => {
  const offline = listenerConnectionPresentation({
    activeProtocol: 'webrtc',
    online: false,
    phase: 'playing',
    playable: true,
    status: liveStatus,
  });
  expect(offline.label).toBe('Offline');
  expect(offline.tone).toBe('danger');

  const exhausted = listenerConnectionPresentation({
    activeProtocol: null,
    online: true,
    phase: 'error',
    playable: true,
    status: liveStatus,
  });
  expect(exhausted.label).toBe('Unavailable');
  expect(exhausted.guidance).toMatch(/retry playback/i);

  const scheduled = listenerConnectionPresentation({
    activeProtocol: null,
    online: true,
    phase: 'waiting',
    playable: false,
    status: 'scheduled',
  });
  expect(scheduled.label).toBe('Upcoming');
  expect(scheduled.guidance).not.toMatch(/WebRTC|LL-HLS/i);

  const failed = listenerConnectionPresentation({
    activeProtocol: null,
    online: true,
    phase: 'ended',
    playable: false,
    status: 'failed',
  });
  expect(failed.label).toBe('Unavailable');
  expect(failed.tone).toBe('danger');
});
