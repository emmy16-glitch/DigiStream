import { expect, test } from '@playwright/test';
import {
  classifyMicrophoneSignal,
  diagnoseStudioFailure,
  microphoneSignalPresentation,
} from '../../apps/web/src/features/broadcasting/studio-diagnostics';

test('microphone signal classification uses measured dBFS and persistent silence', () => {
  const base = {
    prepared: true,
    checking: false,
    muted: false,
    disconnected: false,
    clipping: false,
    silenceDurationMs: 0,
  };

  expect(classifyMicrophoneSignal({ ...base, decibels: -100, silenceDurationMs: 1_000 })).toBe('checking');
  expect(classifyMicrophoneSignal({ ...base, decibels: -100, silenceDurationMs: 4_500 })).toBe('no-signal');
  expect(classifyMicrophoneSignal({ ...base, decibels: -48 })).toBe('quiet');
  expect(classifyMicrophoneSignal({ ...base, decibels: -24 })).toBe('good');
  expect(classifyMicrophoneSignal({ ...base, decibels: -6 })).toBe('loud');
  expect(classifyMicrophoneSignal({ ...base, decibels: -2, clipping: true })).toBe('clipping');
  expect(classifyMicrophoneSignal({ ...base, decibels: -24, disconnected: true })).toBe('disconnected');
  expect(classifyMicrophoneSignal({ ...base, decibels: -24, muted: true })).toBe('muted');

  expect(microphoneSignalPresentation['no-signal'].blocksPublicDelivery).toBe(true);
  expect(microphoneSignalPresentation.good.blocksPublicDelivery).toBe(false);
  expect(microphoneSignalPresentation.loud.blocksPublicDelivery).toBe(false);
  expect(microphoneSignalPresentation.clipping.blocksPublicDelivery).toBe(true);
});

test('studio diagnostics preserve technical references for secondary details', () => {
  const diagnostic = diagnoseStudioFailure('contribution-authorisation', {
    name: 'ApiClientError',
    status: 409,
    code: 'BROADCAST_NOT_READY_FOR_CONTRIBUTION',
    requestId: 'request-studio-123',
    message: 'Contribution access is unavailable for this state.',
  });

  expect(diagnostic.title).toBe('Broadcast is not ready for Studio access');
  expect(diagnostic.stage).toBe('Contribution access');
  expect(diagnostic.code).toBe('BROADCAST_NOT_READY_FOR_CONTRIBUTION');
  expect(diagnostic.status).toBe(409);
  expect(diagnostic.requestId).toBe('request-studio-123');
  expect(diagnostic.recovery).toContain('Refresh the selected broadcast');
});

test('studio diagnostics explain permission and disconnected-device failures', () => {
  const permission = diagnoseStudioFailure('microphone-permission', {
    name: 'NotAllowedError',
    message: 'Permission denied',
  });
  const disconnected = diagnoseStudioFailure('microphone-device', {
    name: 'DeviceDisconnectedError',
    message: 'Track ended',
  });

  expect(permission.title).toBe('Microphone permission blocked');
  expect(permission.recovery).toContain('Allow microphone access');
  expect(disconnected.title).toBe('Microphone disconnected');
  expect(disconnected.code).toBe('MICROPHONE_DISCONNECTED');
});

test('Studio service failures use creator-facing recovery and preserve broadcast truth', () => {
  const unavailable = diagnoseStudioFailure('studio-connect', {
    name: 'ApiClientError',
    status: 503,
    code: 'LIVEKIT_UNAVAILABLE',
    requestId: 'request-livekit-503',
    message: 'upstream unavailable',
  });

  expect(unavailable.title).toBe('Private Studio is unavailable');
  expect(unavailable.message).toBe(
    'The private Studio could not connect. Your broadcast has not started.',
  );
  expect(unavailable.recovery).toContain('try joining the private Studio again');
  expect(unavailable.recovery).toContain('Return to Broadcasts');
  expect(unavailable.recovery).not.toContain('LiveKit');
  expect(unavailable.recovery).not.toContain('service is healthy');
  expect(unavailable.code).toBe('LIVEKIT_UNAVAILABLE');
  expect(unavailable.status).toBe(503);
  expect(unavailable.requestId).toBe('request-livekit-503');
});

test('public delivery failures preserve a healthy private Studio', () => {
  const unavailable = diagnoseStudioFailure('delivery-start', {
    status: 503,
    code: 'DELIVERY_PROVIDER_ERROR',
    message: 'provider unavailable',
  });

  expect(unavailable.title).toBe('Listener delivery is unavailable');
  expect(unavailable.message).toContain('private Studio can stay connected');
  expect(unavailable.recovery).toContain('Keep the private Studio connected');
  expect(unavailable.recovery).not.toContain('media services');
});
