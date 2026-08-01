import type { BroadcastPresentationStatus } from '../../lib/broadcast-lifecycle';

export type ListenerPlaybackPhase =
  | 'idle'
  | 'waiting'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'reconnecting'
  | 'ended'
  | 'error';

export type ListenerConnectionTone =
  | 'neutral'
  | 'good'
  | 'warning'
  | 'danger';

export type ListenerConnectionPresentation = {
  label: string;
  guidance: string;
  tone: ListenerConnectionTone;
  technical: string;
};

type ListenerConnectionInput = {
  activeProtocol: 'webrtc' | 'llhls' | null;
  online: boolean;
  phase: ListenerPlaybackPhase;
  playable: boolean;
  status: BroadcastPresentationStatus | null;
};

function technicalTransport(protocol: 'webrtc' | 'llhls' | null): string {
  if (protocol === 'webrtc') return 'WebRTC transport selected';
  if (protocol === 'llhls') return 'LL-HLS fallback selected';
  return 'Automatic WebRTC to LL-HLS selection';
}

function lifecyclePresentation(
  status: BroadcastPresentationStatus | null,
): ListenerConnectionPresentation | null {
  if (status === 'scheduled') {
    return {
      label: 'Upcoming',
      guidance: 'Audio controls will appear after the broadcast starts.',
      tone: 'neutral',
      technical: 'No listener transport requested while the event is scheduled',
    };
  }
  if (status === 'overdue') {
    return {
      label: 'Start delayed',
      guidance: 'The scheduled start time passed before live audio became available.',
      tone: 'warning',
      technical: 'No playable listener transport is available',
    };
  }
  if (status === 'starting') {
    return {
      label: 'Preparing audio',
      guidance: 'The creator is connecting the listener audio path.',
      tone: 'warning',
      technical: 'Contribution or delivery readiness is still being verified',
    };
  }
  if (status === 'completed') {
    return {
      label: 'Ended',
      guidance: 'This live broadcast has finished.',
      tone: 'neutral',
      technical: 'Live listener transport is closed',
    };
  }
  if (status === 'cancelled') {
    return {
      label: 'Cancelled',
      guidance: 'This broadcast will not go live.',
      tone: 'neutral',
      technical: 'Live listener transport was not started',
    };
  }
  if (status === 'failed') {
    return {
      label: 'Unavailable',
      guidance: 'The broadcast ended because its audio path could not continue.',
      tone: 'danger',
      technical: 'The broadcast lifecycle is in a failed state',
    };
  }
  if (status === 'draft') {
    return {
      label: 'Not ready',
      guidance: 'The creator has not prepared this broadcast for listeners yet.',
      tone: 'neutral',
      technical: 'The broadcast lifecycle is still draft',
    };
  }
  return null;
}

export function listenerConnectionPresentation({
  activeProtocol,
  online,
  phase,
  playable,
  status,
}: ListenerConnectionInput): ListenerConnectionPresentation {
  if (!online) {
    return {
      label: 'Offline',
      guidance: 'Your device is offline. DigiStream will retry after the connection returns.',
      tone: 'danger',
      technical: `${technicalTransport(activeProtocol)}; browser network is offline`,
    };
  }

  if (!playable) {
    return (
      lifecyclePresentation(status) ?? {
        label: 'Unavailable',
        guidance: 'Live audio is not available in the current broadcast state.',
        tone: 'neutral',
        technical: 'No playable listener transport is available',
      }
    );
  }

  if (phase === 'playing' || phase === 'paused') {
    return {
      label: phase === 'paused' ? 'Paused' : 'Stable',
      guidance:
        phase === 'paused'
          ? 'Playback is paused on this device.'
          : 'Live audio is playing normally.',
      tone: 'good',
      technical: technicalTransport(activeProtocol),
    };
  }

  if (phase === 'buffering') {
    return {
      label: 'Buffering',
      guidance: 'DigiStream is waiting for enough audio to continue smoothly.',
      tone: 'warning',
      technical: technicalTransport(activeProtocol),
    };
  }

  if (phase === 'reconnecting') {
    return {
      label: 'Reconnecting',
      guidance: 'DigiStream is trying fresh playback access automatically.',
      tone: 'warning',
      technical: technicalTransport(activeProtocol),
    };
  }

  if (phase === 'error') {
    return {
      label: 'Unavailable',
      guidance: 'Automatic recovery stopped. Retry playback to request a fresh audio path.',
      tone: 'danger',
      technical: technicalTransport(activeProtocol),
    };
  }

  if (phase === 'ended') {
    return {
      label: 'Ended',
      guidance: 'The live audio session has ended.',
      tone: 'neutral',
      technical: technicalTransport(activeProtocol),
    };
  }

  return {
    label: phase === 'ready' ? 'Ready' : 'Connecting',
    guidance:
      phase === 'ready'
        ? 'Tap Listen live when you are ready.'
        : 'DigiStream is preparing the live audio path.',
    tone: phase === 'ready' ? 'good' : 'warning',
    technical: technicalTransport(activeProtocol),
  };
}
