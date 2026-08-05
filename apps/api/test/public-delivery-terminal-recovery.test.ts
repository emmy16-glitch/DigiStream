import assert from 'node:assert/strict';
import test from 'node:test';
import {
  publicDeliveryRecoveryFromSnapshot,
  type PublicDeliverySnapshot,
} from '../../web/src/features/broadcasting/public-delivery-recovery.js';

function snapshot(status: PublicDeliverySnapshot['broadcast']['status']): PublicDeliverySnapshot {
  return {
    ready: false,
    connections: null,
    relay: null,
    problem: {
      code: 'DELIVERY_FAILED',
      message: 'Provider delivery failed.',
      retryable: true,
    },
    recovery: {
      checkedAt: '2026-08-05T04:00:00.000Z',
      privateStudioPreserved: true,
      retryable: true,
    },
    broadcast: {
      id: 'broadcast-1',
      status,
      lifecycleVersion: 7,
    },
  };
}

for (const status of ['completed', 'cancelled', 'failed'] as const) {
  test(`${status} broadcasts never expose a stale public-delivery retry`, () => {
    const recovery = publicDeliveryRecoveryFromSnapshot(snapshot(status), 'delivery-status');

    assert.ok(recovery);
    assert.equal(recovery.retryable, false);
    assert.equal(recovery.privateStudioPreserved, false);
    assert.equal(recovery.code, `BROADCAST_${status.toUpperCase()}`);
    assert.doesNotMatch(recovery.message, /Provider delivery failed/);
  });
}

test('active lifecycle states preserve provider retry truth', () => {
  const recovery = publicDeliveryRecoveryFromSnapshot(snapshot('reconnecting'), 'delivery-status');

  assert.ok(recovery);
  assert.equal(recovery.retryable, true);
  assert.equal(recovery.privateStudioPreserved, true);
  assert.equal(recovery.code, 'DELIVERY_FAILED');
  assert.equal(recovery.message, 'Provider delivery failed.');
});
