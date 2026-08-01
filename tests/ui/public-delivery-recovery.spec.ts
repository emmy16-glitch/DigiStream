import { expect, test } from '@playwright/test';
import {
  deliveryAttemptKey,
  publicDeliveryIsLive,
  publicDeliveryRecoveryFromError,
  publicDeliveryRecoveryFromSnapshot,
  type PublicDeliverySnapshot,
} from '../../apps/web/src/features/broadcasting/public-delivery-recovery';

function snapshot(
  patch: Partial<PublicDeliverySnapshot> = {},
): PublicDeliverySnapshot {
  return {
    ready: false,
    connections: null,
    relay: {
      provider: 'livekit_egress',
      protocol: 'rtmp',
      status: 'failed',
    },
    problem: {
      code: 'MEDIA_RELAY_FAILED',
      message: 'The public-delivery relay failed.',
      retryable: true,
    },
    recovery: {
      checkedAt: '2026-08-01T07:00:00.000Z',
      privateStudioPreserved: true,
      retryable: true,
    },
    broadcast: {
      id: 'broadcast-1',
      status: 'starting',
      lifecycleVersion: 2,
    },
    ...patch,
  };
}

test('failed public delivery remains retryable while private Studio is preserved', () => {
  const recovery = publicDeliveryRecoveryFromSnapshot(
    snapshot(),
    'delivery-start',
  );

  expect(recovery).not.toBeNull();
  expect(recovery?.code).toBe('MEDIA_RELAY_FAILED');
  expect(recovery?.retryable).toBe(true);
  expect(recovery?.privateStudioPreserved).toBe(true);
});

test('verified live delivery clears recovery state', () => {
  const live = snapshot({
    ready: true,
    relay: {
      provider: 'livekit_egress',
      protocol: 'rtmp',
      status: 'active',
    },
    problem: null,
    recovery: {
      checkedAt: '2026-08-01T07:01:00.000Z',
      privateStudioPreserved: false,
      retryable: false,
    },
    broadcast: {
      id: 'broadcast-1',
      status: 'live',
      lifecycleVersion: 3,
    },
  });

  expect(publicDeliveryIsLive(live)).toBe(true);
  expect(
    publicDeliveryRecoveryFromSnapshot(live, 'delivery-status'),
  ).toBeNull();
});

test('verification timeout gives a safe retry state instead of ending contribution', () => {
  const waiting = snapshot({ problem: null, relay: null });
  const recovery = publicDeliveryRecoveryFromSnapshot(
    waiting,
    'delivery-timeout',
  );

  expect(recovery?.code).toBe('DELIVERY_VERIFICATION_TIMEOUT');
  expect(recovery?.message).toContain('private Studio remains connected');
  expect(recovery?.retryable).toBe(true);
});

test('request failures and attempts produce stable recovery references', () => {
  const recovery = publicDeliveryRecoveryFromError(
    'Public delivery could not be reached.',
    'DELIVERY_PROVIDER_ERROR',
  );

  expect(recovery.code).toBe('DELIVERY_PROVIDER_ERROR');
  expect(recovery.privateStudioPreserved).toBe(true);
  expect(deliveryAttemptKey('broadcast-1', 4, 2)).toBe(
    'creator-delivery-broadcast-1-4-2',
  );
});
