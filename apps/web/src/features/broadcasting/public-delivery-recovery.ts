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
