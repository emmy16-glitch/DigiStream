import type { Broadcast } from '@digistream/contracts';

export type PublicDeliveryProblem = {
  code: string;
  message: string;
  retryable: boolean;
};

export type PublicDeliverySnapshot = {
  ready: boolean;
  connections: {
    webrtc: number;
    llhls: number;
  } | null;
  relay: {
    provider: 'livekit_egress';
    protocol: 'rtmp' | 'srt';
    status: 'starting' | 'active' | 'stopping' | 'stopped' | 'failed';
  } | null;
  problem: PublicDeliveryProblem | null;
  recovery: {
    checkedAt: string;
    privateStudioPreserved: boolean;
    retryable: boolean;
  };
  broadcast: {
    id: string;
    status: Broadcast['status'];
    lifecycleVersion: number;
  };
};

export type PublicDeliveryRecoveryStage =
  | 'delivery-start'
  | 'delivery-status'
  | 'delivery-timeout';

export type PublicDeliveryRecoveryState = {
  stage: PublicDeliveryRecoveryStage;
  code: string;
  message: string;
  checkedAt: string;
  privateStudioPreserved: boolean;
  retryable: boolean;
};

const terminalBroadcastStatuses = new Set<Broadcast['status']>([
  'completed',
  'cancelled',
  'failed',
]);

function terminalDeliveryMessage(status: Broadcast['status']): string {
  if (status === 'completed') {
    return 'This broadcast has ended. Public delivery cannot be restarted from this Studio session.';
  }
  if (status === 'cancelled') {
    return 'This broadcast was cancelled. Public delivery cannot be started.';
  }
  return 'This broadcast failed and public delivery cannot be retried from this Studio session.';
}

export function publicDeliveryIsLive(
  delivery: PublicDeliverySnapshot,
): boolean {
  return delivery.ready && delivery.broadcast.status === 'live';
}

export function publicDeliveryRecoveryFromSnapshot(
  delivery: PublicDeliverySnapshot,
  stage: PublicDeliveryRecoveryStage,
): PublicDeliveryRecoveryState | null {
  if (publicDeliveryIsLive(delivery)) return null;

  if (terminalBroadcastStatuses.has(delivery.broadcast.status)) {
    return {
      stage,
      code: `BROADCAST_${delivery.broadcast.status.toUpperCase()}`,
      message: terminalDeliveryMessage(delivery.broadcast.status),
      checkedAt: delivery.recovery.checkedAt,
      privateStudioPreserved: false,
      retryable: false,
    };
  }

  const timedOut = stage === 'delivery-timeout';
  return {
    stage,
    code:
      delivery.problem?.code ??
      (timedOut ? 'DELIVERY_VERIFICATION_TIMEOUT' : 'DELIVERY_NOT_READY'),
    message:
      delivery.problem?.message ??
      (timedOut
        ? 'Public listener delivery did not become ready within the verification window. The private Studio remains connected.'
        : 'Public listener delivery is not ready yet. The private Studio remains connected while you check or retry delivery.'),
    checkedAt: delivery.recovery.checkedAt,
    privateStudioPreserved: delivery.recovery.privateStudioPreserved,
    retryable: delivery.problem?.retryable ?? delivery.recovery.retryable,
  };
}

export function publicDeliveryRecoveryFromError(
  message: string,
  code = 'DELIVERY_REQUEST_FAILED',
): PublicDeliveryRecoveryState {
  return {
    stage: 'delivery-start',
    code,
    message,
    checkedAt: new Date().toISOString(),
    privateStudioPreserved: true,
    retryable: true,
  };
}

export function deliveryAttemptKey(
  broadcastId: string,
  lifecycleVersion: number,
  attempt: number,
): string {
  return `creator-delivery-${broadcastId}-${lifecycleVersion}-${attempt}`;
}
