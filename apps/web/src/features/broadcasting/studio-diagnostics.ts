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
    guidance: 'No usable audio is reaching DigiStream. Check the selected input, hardware mute and device input level.',
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
  'broadcast-lifecycle': 'Broadcast state',
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
    message: text(value.message) ?? 'This Studio step could not finish.',
    recovery: 'Try the step again. Technical details are available when support needs them.',
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
      recovery: 'Connect a microphone or headset, confirm the device can see it, then try again.',
      code: code ?? 'MICROPHONE_NOT_FOUND',
    };
  }
  if (name === 'OverconstrainedError') {
    return {
      ...diagnostic,
      title: 'Selected microphone unavailable',
      message: 'The selected microphone no longer supports the requested audio settings.',
      recovery: 'Choose System default or another input and run the sound check again.',
      code: code ?? 'MICROPHONE_CONSTRAINT_FAILED',
    };
  }
  if (name === 'NotReadableError') {
    return {
      ...diagnostic,
      title: 'Microphone is busy',
      message: 'The selected microphone could not be opened.',
      recovery: 'Close other apps using the microphone, reconnect the device and try again.',
      code: code ?? 'MICROPHONE_NOT_READABLE',
    };
  }
  if (name === 'SecurityError') {
    return {
      ...diagnostic,
      title: 'Secure microphone access required',
      message: 'The browser blocked microphone capture on this page.',
      recovery: 'Open DigiStream through its secure address and allow microphone access.',
      code: code ?? 'MICROPHONE_SECURITY_BLOCKED',
    };
  }

  switch (code) {
    case 'AUTHENTICATION_REQUIRED':
      return {
        ...diagnostic,
        title: 'Creator session expired',
        recovery: 'Sign in again, reselect the broadcast and try this Studio step again.',
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
        title: 'Broadcast is not ready for Studio access',
        recovery: 'Refresh the selected broadcast. Completed, cancelled and failed broadcasts cannot re-enter the Studio.',
      };
    case 'BROADCAST_CONTRIBUTION_FORBIDDEN':
      return {
        ...diagnostic,
        title: 'Your role cannot host this broadcast',
        recovery: 'Ask an organisation owner or administrator for Creator access.',
      };
    case 'LIVEKIT_NOT_CONFIGURED':
    case 'LIVEKIT_VERIFICATION_UNAVAILABLE':
    case 'LIVEKIT_UNAVAILABLE':
      return {
        ...diagnostic,
        title: 'Private Studio is unavailable',
        message: 'The private Studio could not connect. Your broadcast has not started.',
        recovery: 'Keep this page open and try joining the private Studio again. Return to Broadcasts if it remains unavailable.',
      };
    case 'MICROPHONE_NOT_PUBLISHED':
      return {
        ...diagnostic,
        title: 'Microphone was not verified',
        recovery: 'Confirm the private Studio is connected and the microphone is unmuted, then try Go live again.',
      };
    case 'API_UNREACHABLE':
      return {
        ...diagnostic,
        title: 'DigiStream is temporarily unreachable',
        message: 'The Studio could not contact DigiStream. Your broadcast has not started.',
        recovery: 'Check your connection and try again. Return to Broadcasts if the problem continues.',
      };
    case 'DELIVERY_OPERATION_IN_PROGRESS':
      return {
        ...diagnostic,
        title: 'Public delivery is already being checked',
        recovery: 'Wait for the current check to finish, then use Check delivery status. Keep the private Studio connected.',
      };
    case 'MEDIA_RELAY_PROVIDER_ERROR':
    case 'DELIVERY_PROVIDER_ERROR':
    case 'MEDIA_RELAY_NOT_CONFIGURED':
    case 'OVENMEDIAENGINE_NOT_CONFIGURED':
      return {
        ...diagnostic,
        title: 'Listener delivery is unavailable',
        message: 'The private Studio can stay connected, but listeners cannot receive audio yet.',
        recovery: 'Keep the private Studio connected and try public delivery again. Return to Broadcasts if it remains unavailable.',
      };
    default:
      break;
  }

  if (stage === 'livekit-module') {
    return {
      ...diagnostic,
      title: 'Studio could not load',
      recovery: 'Check your connection, reload DigiStream and try again.',
      code: code ?? 'LIVEKIT_CLIENT_LOAD_FAILED',
    };
  }
  if (stage === 'studio-connect') {
    return {
      ...diagnostic,
      title: 'Private Studio connection failed',
      message: 'The private Studio could not connect. Your broadcast has not started.',
      recovery: 'Check your connection and try joining the private Studio again.',
      code: code ?? 'STUDIO_CONNECT_FAILED',
    };
  }
  if (stage === 'microphone-publish') {
    return {
      ...diagnostic,
      title: 'Microphone could not join the Studio',
      recovery: 'Run the sound check again, confirm the input is connected, then try joining again.',
      code: code ?? 'MICROPHONE_PUBLISH_FAILED',
    };
  }
  if (stage === 'delivery-verification') {
    return {
      ...diagnostic,
      title: 'Listener delivery was not verified',
      message: 'The private Studio remains connected, but listener audio is not ready.',
      recovery: 'Keep the private Studio connected and try Go live again.',
      code: code ?? 'DELIVERY_VERIFICATION_FAILED',
    };
  }

  return diagnostic;
}
