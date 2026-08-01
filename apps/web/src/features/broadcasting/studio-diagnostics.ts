export type MicrophoneSignalState =
  | 'not-tested'
  | 'checking'
  | 'muted'
  | 'no-signal'
  | 'quiet'
  | 'good'
  | 'loud'
  | 'clipping'
  | 'disconnected';

export type MicrophoneSignalInput = {
  prepared: boolean;
  checking: boolean;
  muted: boolean;
  disconnected: boolean;
  decibels: number;
  clipping: boolean;
  silenceDurationMs: number;
};

export type MicrophoneSignalPresentation = {
  label: string;
  guidance: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  blocksPublicDelivery: boolean;
};

export const microphoneSignalPresentation: Record<
  MicrophoneSignalState,
  MicrophoneSignalPresentation
> = {
  'not-tested': {
    label: 'Not tested',
    guidance: 'Run a sound check before joining the private studio.',
    tone: 'neutral',
    blocksPublicDelivery: true,
  },
  checking: {
    label: 'Checking',
    guidance: 'Speak normally for a few seconds while DigiStream measures the selected input.',
    tone: 'info',
    blocksPublicDelivery: true,
  },
  muted: {
    label: 'Muted',
    guidance: 'Unmute the microphone before starting public listener delivery.',
    tone: 'neutral',
    blocksPublicDelivery: true,
  },
  'no-signal': {
    label: 'No signal',
    guidance: 'No usable audio energy is reaching DigiStream. Check the selected input, hardware mute and operating-system input level.',
    tone: 'danger',
    blocksPublicDelivery: true,
  },
  quiet: {
    label: 'Quiet',
    guidance: 'Audio is present but low. Move closer or raise the device input level without causing clipping.',
    tone: 'warning',
    blocksPublicDelivery: false,
  },
  good: {
    label: 'Good',
    guidance: 'The microphone is in a clear, safe range for speech.',
    tone: 'success',
    blocksPublicDelivery: false,
  },
  loud: {
    label: 'Loud',
    guidance: 'Audio is strong and close to the limit. Reduce gain or move slightly farther away.',
    tone: 'warning',
    blocksPublicDelivery: false,
  },
  clipping: {
    label: 'Clipping',
    guidance: 'Peaks are distorting. Reduce microphone gain or move farther away before going live.',
    tone: 'danger',
    blocksPublicDelivery: true,
  },
  disconnected: {
    label: 'Device disconnected',
    guidance: 'The selected microphone stopped or disappeared. Reconnect it, choose another input and run the sound check again.',
    tone: 'danger',
    blocksPublicDelivery: true,
  },
};

export function classifyMicrophoneSignal(
  input: MicrophoneSignalInput,
): MicrophoneSignalState {
  if (input.disconnected) return 'disconnected';
  if (input.muted) return 'muted';
  if (!input.prepared) return input.checking ? 'checking' : 'not-tested';
  if (input.clipping || input.decibels >= -1) return 'clipping';
  if (input.decibels <= -60) {
    return input.silenceDurationMs >= 4_000 ? 'no-signal' : 'checking';
  }
  if (input.decibels < -36) return 'quiet';
  if (input.decibels < -12) return 'good';
  return 'loud';
}

export type StudioFailureStage =
  | 'session'
  | 'workspace'
  | 'livekit-module'
  | 'microphone-permission'
  | 'microphone-device'
  | 'contribution-authorisation'
  | 'studio-connect'
  | 'microphone-publish'
  | 'broadcast-lifecycle'
  | 'contribution-verification'
  | 'delivery-start'
  | 'delivery-verification'
  | 'studio-audio'
  | 'safe-end';

export type StudioDiagnostic = {
  title: string;
  message: string;
  recovery: string;
  stage: string;
  code: string | null;
  status: number | null;
  requestId: string | null;
};

type ErrorShape = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
  requestId?: unknown;
};

const stageNames: Record<StudioFailureStage, string> = {
  session: 'Creator session',
  workspace: 'Workspace data',
  'livekit-module': 'Studio software',
  'microphone-permission': 'Microphone permission',
  'microphone-device': 'Microphone device',
  'contribution-authorisation': 'Contribution access',
  'studio-connect': 'Private studio connection',
  'microphone-publish': 'Microphone publishing',
  'broadcast-lifecycle': 'Broadcast lifecycle',
  'contribution-verification': 'Microphone verification',
  'delivery-start': 'Public delivery start',
  'delivery-verification': 'Public delivery verification',
  'studio-audio': 'Studio playback',
  'safe-end': 'Safe broadcast end',
};

function shape(error: unknown): ErrorShape {
  return typeof error === 'object' && error !== null
    ? (error as ErrorShape)
    : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function status(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function baseDiagnostic(
  stage: StudioFailureStage,
  error: unknown,
): StudioDiagnostic {
  const value = shape(error);
  return {
    title: `${stageNames[stage]} failed`,
    message: text(value.message) ?? 'DigiStream could not complete this Studio step.',
    recovery: 'Retry the step. If it fails again, use the diagnostic reference when reporting the problem.',
    stage: stageNames[stage],
    code: text(value.code),
    status: status(value.status),
    requestId: text(value.requestId),
  };
}

export function diagnoseStudioFailure(
  stage: StudioFailureStage,
  error: unknown,
): StudioDiagnostic {
  const diagnostic = baseDiagnostic(stage, error);
  const value = shape(error);
  const name = text(value.name);
  const code = diagnostic.code;

  if (name === 'DeviceDisconnectedError') {
    return {
      ...diagnostic,
      title: 'Microphone disconnected',
      message: 'The selected microphone stopped or was removed while the Studio was using it.',
      recovery: 'Reconnect the device or select another microphone, then run the sound check again.',
      code: code ?? 'MICROPHONE_DISCONNECTED',
    };
  }
  if (name === 'NotAllowedError') {
    return {
      ...diagnostic,
      title: 'Microphone permission blocked',
      message: 'The browser did not allow DigiStream to use the microphone.',
      recovery: 'Allow microphone access for this site in the browser, then run the sound check again.',
      code: code ?? 'MICROPHONE_PERMISSION_DENIED',
    };
  }
  if (name === 'NotFoundError') {
    return {
      ...diagnostic,
      title: 'No microphone found',
      message: 'The browser could not find an audio input device.',
      recovery: 'Connect a microphone or headset, confirm the operating system can see it, then retry.',
      code: code ?? 'MICROPHONE_NOT_FOUND',
    };
  }
  if (name === 'OverconstrainedError') {
    return {
      ...diagnostic,
      title: 'Selected microphone unavailable',
      message: 'The selected microphone no longer satisfies the requested audio settings.',
      recovery: 'Choose System default or another input and run the sound check again.',
      code: code ?? 'MICROPHONE_CONSTRAINT_FAILED',
    };
  }
  if (name === 'NotReadableError') {
    return {
      ...diagnostic,
      title: 'Microphone is busy',
      message: 'The operating system could not open the selected microphone.',
      recovery: 'Close other apps using the microphone, reconnect the device and retry.',
      code: code ?? 'MICROPHONE_NOT_READABLE',
    };
  }
  if (name === 'SecurityError') {
    return {
      ...diagnostic,
      title: 'Secure microphone access required',
      message: 'The browser blocked microphone capture in this page context.',
      recovery: 'Open DigiStream through its HTTPS address and allow microphone access.',
      code: code ?? 'MICROPHONE_SECURITY_BLOCKED',
    };
  }

  switch (code) {
    case 'AUTHENTICATION_REQUIRED':
      return {
        ...diagnostic,
        title: 'Creator session expired',
        recovery: 'Sign in again, reselect the broadcast and retry this Studio step.',
      };
    case 'BROADCAST_NOT_FOUND':
      return {
        ...diagnostic,
        title: 'Broadcast is no longer available',
        recovery: 'Refresh the broadcast list and select an available draft, scheduled or active broadcast.',
      };
    case 'BROADCAST_NOT_READY_FOR_CONTRIBUTION':
      return {
        ...diagnostic,
        title: 'Broadcast state is not ready for Studio access',
        recovery: 'Refresh the selected broadcast. Completed, cancelled and failed broadcasts cannot re-enter the Studio.',
      };
    case 'BROADCAST_CONTRIBUTION_FORBIDDEN':
      return {
        ...diagnostic,
        title: 'Your role cannot host this broadcast',
        recovery: 'Use an owner, administrator or broadcaster account for the organisation.',
      };
    case 'LIVEKIT_NOT_CONFIGURED':
    case 'LIVEKIT_VERIFICATION_UNAVAILABLE':
      return {
        ...diagnostic,
        title: 'Live Studio service is not configured',
        recovery: 'Start the configured LiveKit media services before retrying Studio access.',
      };
    case 'LIVEKIT_UNAVAILABLE':
      return {
        ...diagnostic,
        title: 'Live Studio service is unavailable',
        recovery: 'Keep the Studio open, verify the LiveKit service is healthy and retry.',
      };
    case 'MICROPHONE_NOT_PUBLISHED':
      return {
        ...diagnostic,
        title: 'Published microphone was not verified',
        recovery: 'Confirm the private Studio is connected and the microphone is unmuted, then retry Go live.',
      };
    case 'API_UNREACHABLE':
      return {
        ...diagnostic,
        title: 'Application server is unreachable',
        recovery: 'Confirm the API server is running and the browser can reach it, then retry.',
      };
    case 'DELIVERY_OPERATION_IN_PROGRESS':
      return {
        ...diagnostic,
        title: 'Public delivery is already being checked',
        recovery: 'Wait for the current operation to finish, then use Check delivery status. Do not disconnect the private Studio.',
      };
    case 'MEDIA_RELAY_PROVIDER_ERROR':
    case 'DELIVERY_PROVIDER_ERROR':
      return {
        ...diagnostic,
        title: 'Public delivery service is unavailable',
        recovery: 'Keep the private Studio connected, verify the media services and retry public delivery.',
      };
    case 'MEDIA_RELAY_NOT_CONFIGURED':
    case 'OVENMEDIAENGINE_NOT_CONFIGURED':
      return {
        ...diagnostic,
        title: 'Public delivery service is not configured',
        recovery: 'Start and configure LiveKit Egress and OvenMediaEngine, then retry public delivery.',
      };
    default:
      break;
  }

  if (stage === 'livekit-module') {
    return {
      ...diagnostic,
      title: 'Studio software could not load',
      recovery: 'Check the network and content-blocking settings, then reload DigiStream and retry.',
      code: code ?? 'LIVEKIT_CLIENT_LOAD_FAILED',
    };
  }
  if (stage === 'studio-connect') {
    return {
      ...diagnostic,
      title: 'Private Studio connection failed',
      recovery: 'Check the network and LiveKit service, then retry joining the private Studio.',
      code: code ?? 'STUDIO_CONNECT_FAILED',
    };
  }
  if (stage === 'microphone-publish') {
    return {
      ...diagnostic,
      title: 'Microphone could not be published',
      recovery: 'Run the sound check again, confirm the input is not disconnected, then retry joining.',
      code: code ?? 'MICROPHONE_PUBLISH_FAILED',
    };
  }
  if (stage === 'delivery-verification') {
    return {
      ...diagnostic,
      title: 'Public listener delivery was not verified',
      recovery: 'Keep the private Studio connected, check the delivery services and retry Go live.',
      code: code ?? 'DELIVERY_VERIFICATION_FAILED',
    };
  }

  return diagnostic;
}
