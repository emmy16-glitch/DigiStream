import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type {
  AuthUser,
  AuthUserResponse,
  Broadcast,
  BroadcastListResponse,
  BroadcastResponse,
  ChannelListResponse,
  OrganisationListResponse,
} from '@digistream/contracts';
import {
  Button,
  IconButton,
  LinkButton,
  StatePanel,
  StatusBadge,
  type StatusTone,
} from '../../design-system/components';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import { useModalHistoryDismiss } from '../../lib/use-modal-history-dismiss';
import { startAudioMeter, type AudioMeterController } from './audio-meter';
import { StudioAudioMeter } from './StudioAudioMeter';
import {
  deliveryAttemptKey,
  publicDeliveryIsLive,
  publicDeliveryRecoveryFromError,
  publicDeliveryRecoveryFromSnapshot,
  type PublicDeliveryRecoveryState,
  type PublicDeliverySnapshot,
} from './public-delivery-recovery';
import {
  classifyMicrophoneSignal,
  diagnoseStudioFailure,
  microphoneSignalPresentation,
  type StudioDiagnostic,
  type StudioFailureStage,
} from './studio-diagnostics';
import {
  browserMediaEndpointProblem,
  loadLiveKitClient,
  type LiveKitLocalAudioTrack,
  type LiveKitRemoteTrack,
  type LiveKitRoom,
} from './livekit-client';
import {
  resolveStudioContextSelection,
  type RequestedStudioContext,
} from './studio-context-selection';
import './creator-broadcast-studio.css';

type StudioPhase =
  | 'idle'
  | 'checking-microphone'
  | 'microphone-ready'
  | 'connecting'
  | 'connected'
  | 'starting-delivery'
  | 'live'
  | 'reconnecting'
  | 'ended';

type ContributionCredentialResponse = {
  credential: {
    provider: 'livekit';
    url: string;
    token: string;
    roomName: string;
    participantIdentity: string;
    participantRole: 'host' | 'guest' | 'monitor';
    expiresAt: string;
  };
};

type ContributionReadyResponse = {
  contribution: {
    ready: true;
    broadcast: {
      id: string;
      status: Broadcast['status'];
      lifecycleVersion: number;
      contributionReadyAt: string | null;
    };
  };
};

type DeliveryResponse = {
  delivery: PublicDeliverySnapshot;
};

type CreatorBroadcastStudioProps = {
  open: boolean;
  onClose(): void;
  requestedContext?: RequestedStudioContext;
};

type StudioPhasePresentation = {
  description: string;
  label: string;
  tone: StatusTone;
};

const contributionStates = new Set<Broadcast['status']>([
  'draft',
  'scheduled',
  'starting',
  'live',
  'reconnecting',
]);

const studioPhasePresentation: Record<StudioPhase, StudioPhasePresentation> = {
  idle: {
    label: 'Setup not started',
    description: 'Select a broadcast and run a real microphone test.',
    tone: 'neutral',
  },
  'checking-microphone': {
    label: 'Checking microphone',
    description: 'DigiStream is requesting permission and opening the selected input.',
    tone: 'warning',
  },
  'microphone-ready': {
    label: 'Microphone ready',
    description: 'Your input is available. Join the private studio before public delivery.',
    tone: 'info',
  },
  connecting: {
    label: 'Connecting studio',
    description: 'DigiStream is joining the authorised contribution room.',
    tone: 'warning',
  },
  connected: {
    label: 'Studio connected',
    description: 'Your microphone is published privately. Public delivery has not started yet.',
    tone: 'success',
  },
  'starting-delivery': {
    label: 'Preparing public delivery',
    description: 'Studio audio is connected while listener delivery is verified.',
    tone: 'warning',
  },
  live: {
    label: 'Live audio ready',
    description: 'Contribution and public delivery are verified for listeners.',
    tone: 'live',
  },
  reconnecting: {
    label: 'Reconnecting audio',
    description: 'The studio connection was interrupted and is attempting recovery.',
    tone: 'warning',
  },
  ended: {
    label: 'Broadcast ended',
    description: 'Public delivery stopped and local studio media was released.',
    tone: 'neutral',
  },
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function formatStatus(value: string): string {
  return value.replaceAll('_', ' ').replaceAll('-', ' ');
}

function broadcastStatusTone(status: Broadcast['status']): StatusTone {
  switch (status) {
    case 'live':
      return 'live';
    case 'starting':
    case 'reconnecting':
    case 'ending':
      return 'warning';
    case 'failed':
    case 'cancelled':
      return 'danger';
    case 'scheduled':
      return 'info';
    case 'completed':
      return 'success';
    default:
      return 'neutral';
  }
}

function isLiveCriticalPhase(phase: StudioPhase): boolean {
  return phase === 'starting-delivery' || phase === 'live' || phase === 'reconnecting';
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);
}

export function CreatorBroadcastStudio({
  open,
  onClose,
  requestedContext,
}: CreatorBroadcastStudioProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organisations, setOrganisations] = useState<
    OrganisationListResponse['organisations']
  >([]);
  const [channels, setChannels] = useState<ChannelListResponse['channels']>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [organisationId, setOrganisationId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [broadcastId, setBroadcastId] = useState('');
  const [loadingOrganisations, setLoadingOrganisations] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [phase, setPhase] = useState<StudioPhase>('idle');
  const [level, setLevel] = useState(0);
  const [decibels, setDecibels] = useState(-100);
  const [clipping, setClipping] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deviceDisconnected, setDeviceDisconnected] = useState(false);
  const [signalClock, setSignalClock] = useState(() => Date.now());
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [message, setMessage] = useState('Select a broadcast and test your microphone.');
  const [error, setError] = useState('');
  const [failure, setFailure] = useState<StudioDiagnostic | null>(null);
  const [failureStage, setFailureStage] = useState<StudioFailureStage | null>(null);
  const [deliveryRecovery, setDeliveryRecovery] =
    useState<PublicDeliveryRecoveryState | null>(null);
  const [busy, setBusy] = useState(false);
  const [endConfirmationOpen, setEndConfirmationOpen] = useState(false);

  const roomRef = useRef<LiveKitRoom | null>(null);
  const trackRef = useRef<LiveKitLocalAudioTrack | null>(null);
  const meterRef = useRef<AudioMeterController | null>(null);
  const participantIdentityRef = useRef('');
  const remoteAudioRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const confirmationRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const lastAudibleAtRef = useRef<number | null>(null);
  const meterStartedAtRef = useRef<number | null>(null);
  const trackLifecycleCleanupRef = useRef<(() => void) | null>(null);
  const publicDeliveryActiveRef = useRef(false);
  const deliveryAttemptRef = useRef(0);

  const selectedBroadcast = useMemo(
    () => broadcasts.find((item) => item.id === broadcastId) ?? null,
    [broadcastId, broadcasts],
  );

  const availableBroadcasts = useMemo(
    () => broadcasts.filter((broadcast) => contributionStates.has(broadcast.status)),
    [broadcasts],
  );

  const connected =
    phase === 'connected' ||
    phase === 'starting-delivery' ||
    phase === 'live' ||
    phase === 'reconnecting';
  const liveCritical = isLiveCriticalPhase(phase) || deliveryRecovery !== null;
  const phasePresentation = studioPhasePresentation[phase];
  const microphonePrepared = phase === 'microphone-ready' || connected;
  const silenceReference = lastAudibleAtRef.current ?? meterStartedAtRef.current;
  const silenceDurationMs = silenceReference
    ? Math.max(0, signalClock - silenceReference)
    : 0;
  const microphoneSignalState = classifyMicrophoneSignal({
    prepared: microphonePrepared,
    checking: phase === 'checking-microphone',
    muted,
    disconnected: deviceDisconnected,
    decibels,
    clipping,
    silenceDurationMs,
  });
  const microphoneSignal = microphoneSignalPresentation[microphoneSignalState];
  const microphoneReadyForDelivery =
    microphonePrepared && !microphoneSignal.blocksPublicDelivery;

  const clearStudioFailure = useCallback(() => {
    setError('');
    setFailure(null);
    setFailureStage(null);
  }, []);

  const reportStudioFailure = useCallback(
    (stage: StudioFailureStage, requestError: unknown) => {
      setError('');
      setFailureStage(stage);
      setFailure(diagnoseStudioFailure(stage, requestError));
    },
    [],
  );

  const patchBroadcast = useCallback(
    (id: string, patch: Partial<Broadcast>) => {
      setBroadcasts((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const monitorMicrophoneTrack = useCallback(
    (track: LiveKitLocalAudioTrack) => {
      meterRef.current?.stop();
      trackLifecycleCleanupRef.current?.();

      const mediaTrack = track.mediaStreamTrack;
      const onEnded = () => {
        setDeviceDisconnected(true);
        setLevel(0);
        setDecibels(-100);
        setClipping(false);
        setMessage(
          'The selected microphone disconnected. Public delivery is blocked until the input is restored.',
        );
        reportStudioFailure(
          'microphone-device',
          Object.assign(
            new Error('The selected microphone stopped or was removed.'),
            {
              name: 'DeviceDisconnectedError',
              code: 'MICROPHONE_DISCONNECTED',
            },
          ),
        );
      };
      const onUnmute = () => {
        if (!track.isMuted) {
          setDeviceDisconnected(false);
          setMessage('Microphone input resumed.');
        }
      };

      mediaTrack.addEventListener('ended', onEnded);
      mediaTrack.addEventListener('unmute', onUnmute);
      trackLifecycleCleanupRef.current = () => {
        mediaTrack.removeEventListener('ended', onEnded);
        mediaTrack.removeEventListener('unmute', onUnmute);
      };

      const startedAt = Date.now();
      meterStartedAtRef.current = startedAt;
      lastAudibleAtRef.current = null;
      setSignalClock(startedAt);
      setDeviceDisconnected(false);
      meterRef.current = startAudioMeter(mediaTrack, (reading) => {
        setLevel(reading.level);
        setDecibels(reading.decibels);
        setClipping(reading.clipping);
        if (reading.decibels > -60 || reading.peak > 0.001) {
          lastAudibleAtRef.current = Date.now();
        }
      });
    },
    [reportStudioFailure],
  );

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices) return;
    const sdk = await loadLiveKitClient();
    const inputs = await sdk.Room.getLocalDevices('audioinput');
    setDevices(inputs);
    const mediaTrack = trackRef.current?.mediaStreamTrack;
    const active = mediaTrack?.getSettings().deviceId;
    if (active) {
      setSelectedDeviceId(active);
      const stillAvailable = inputs.some((input) => input.deviceId === active);
      if (!stillAvailable || mediaTrack?.readyState === 'ended') {
        setDeviceDisconnected(true);
      }
    } else if (!selectedDeviceId && inputs[0]) {
      setSelectedDeviceId(inputs[0].deviceId);
    }
  }, [selectedDeviceId]);

  const stopLocalMedia = useCallback(async () => {
    meterRef.current?.stop();
    meterRef.current = null;
    trackLifecycleCleanupRef.current?.();
    trackLifecycleCleanupRef.current = null;
    const room = roomRef.current;
    const track = trackRef.current;
    roomRef.current = null;
    trackRef.current = null;
    participantIdentityRef.current = '';
    lastAudibleAtRef.current = null;
    meterStartedAtRef.current = null;
    publicDeliveryActiveRef.current = false;
    deliveryAttemptRef.current = 0;
    setDeliveryRecovery(null);
    if (room && track) {
      try {
        await room.localParticipant.unpublishTrack(track);
      } catch {
        // Disconnect still releases the transport if unpublishing has already failed.
      }
    }
    if (room) {
      try {
        await room.disconnect();
      } catch {
        // The room may already have disconnected during a network failure.
      }
    }
    track?.stop();
    remoteAudioRef.current?.replaceChildren();
    setLevel(0);
    setDecibels(-100);
    setClipping(false);
    setMuted(false);
    setDeviceDisconnected(false);
    setSignalClock(Date.now());
    setAudioPlaybackBlocked(false);
  }, []);

  const closeStudio = useCallback(() => {
    void stopLocalMedia().finally(onClose);
  }, [onClose, stopLocalMedia]);

  const explainBlockedClose = useCallback(() => {
    if (endConfirmationOpen) {
      setEndConfirmationOpen(false);
      return;
    }
    setFailure(null);
    setFailureStage(null);
    setError('End the broadcast before closing the studio so public delivery stops safely.');
  }, [endConfirmationOpen]);

  const requestClose = useModalHistoryDismiss({
    active: open,
    blocked: liveCritical || endConfirmationOpen,
    onBlocked: explainBlockedClose,
    onDismiss: closeStudio,
    stateKey: 'digistream.broadcast-studio',
  });

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      const first = dialogRef.current ? focusableElements(dialogRef.current)[0] : null;
      first?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const activeContainer = endConfirmationOpen
        ? confirmationRef.current
        : dialogRef.current;

      if (event.key === 'Escape') {
        event.preventDefault();
        if (endConfirmationOpen) setEndConfirmationOpen(false);
        else requestClose();
        return;
      }

      if (event.key !== 'Tab' || !activeContainer) return;
      const focusable = focusableElements(activeContainer);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [endConfirmationOpen, open, requestClose]);

  useEffect(() => {
    if (!endConfirmationOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const first = confirmationRef.current
        ? focusableElements(confirmationRef.current)[0]
        : null;
      first?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [endConfirmationOpen]);

  useEffect(() => {
    if (!open) return;
    setCheckingSession(true);
    clearStudioFailure();
    void apiRequest<AuthUserResponse>('/api/v1/auth/me')
      .then((response) => setUser(response.user))
      .catch((requestError) => {
        if (!(requestError instanceof ApiClientError) || requestError.status !== 401) {
          reportStudioFailure('workspace', requestError);
        }
        setUser(null);
      })
      .finally(() => setCheckingSession(false));

    return () => {
      void stopLocalMedia();
    };
  }, [open, stopLocalMedia]);

  useEffect(() => {
    if (!open || !user) return;
    clearStudioFailure();
    setLoadingOrganisations(true);
    void apiRequest<OrganisationListResponse>('/api/v1/organisations')
      .then((response) => {
        setOrganisations(response.organisations);
        const requestedOrganisationId = requestedContext?.organisationId?.trim();
        setOrganisationId((current) => {
          if (
            requestedOrganisationId &&
            response.organisations.some((item) => item.id === requestedOrganisationId)
          ) {
            return requestedOrganisationId;
          }
          return response.organisations.some((item) => item.id === current)
            ? current
            : response.organisations[0]?.id || '';
        });
      })
      .catch((requestError) => reportStudioFailure('workspace', requestError))
      .finally(() => setLoadingOrganisations(false));
  }, [open, requestedContext, user]);

  useEffect(() => {
    if (!organisationId) {
      setChannels([]);
      setChannelId('');
      setLoadingChannels(false);
      return;
    }
    clearStudioFailure();
    setLoadingChannels(true);
    void apiRequest<ChannelListResponse>(
      `/api/v1/organisations/${organisationId}/channels`,
    )
      .then((response) => {
        setChannels(response.channels);
        const requestedChannelId = requestedContext?.channelId?.trim();
        const activeChannels = response.channels.filter(
          (item) => item.status === 'active',
        );
        setChannelId((current) => {
          if (
            requestedChannelId &&
            activeChannels.some((item) => item.id === requestedChannelId)
          ) {
            return requestedChannelId;
          }
          return activeChannels.some((item) => item.id === current)
            ? current
            : activeChannels[0]?.id || '';
        });
      })
      .catch((requestError) => reportStudioFailure('workspace', requestError))
      .finally(() => setLoadingChannels(false));
  }, [organisationId, requestedContext]);

  useEffect(() => {
    if (!organisationId || !channelId) {
      setBroadcasts([]);
      setBroadcastId('');
      setLoadingBroadcasts(false);
      return;
    }
    clearStudioFailure();
    setLoadingBroadcasts(true);
    void apiRequest<BroadcastListResponse>(
      `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
    )
      .then((response) => {
        setBroadcasts(response.broadcasts);
        const requestedBroadcastId = requestedContext?.broadcastId?.trim();
        const available = response.broadcasts.filter((item) =>
          contributionStates.has(item.status),
        );
        setBroadcastId((current) => {
          if (
            requestedBroadcastId &&
            available.some((item) => item.id === requestedBroadcastId)
          ) {
            return requestedBroadcastId;
          }
          return available.some((item) => item.id === current)
            ? current
            : available[0]?.id || '';
        });
      })
      .catch((requestError) => reportStudioFailure('workspace', requestError))
      .finally(() => setLoadingBroadcasts(false));
  }, [channelId, organisationId, requestedContext]);

  useEffect(() => {
    if (
      !open ||
      loadingOrganisations ||
      loadingChannels ||
      loadingBroadcasts
    ) {
      return;
    }

    const selection = resolveStudioContextSelection({
      requested: requestedContext ?? {},
      organisations,
      channels,
      broadcasts,
    });

    if (
      selection.organisationId &&
      selection.organisationId !== organisationId
    ) {
      setOrganisationId(selection.organisationId);
      return;
    }
    if (selection.channelId && selection.channelId !== channelId) {
      setChannelId(selection.channelId);
      return;
    }
    if (selection.broadcastId !== broadcastId) {
      setBroadcastId(selection.broadcastId);
      return;
    }

    if (selection.fallbackReason) {
      setMessage(
        'The requested Studio selection was no longer available. DigiStream opened the safest available broadcast instead.',
      );
    }
  }, [
    broadcastId,
    broadcasts,
    channelId,
    channels,
    loadingBroadcasts,
    loadingChannels,
    loadingOrganisations,
    open,
    organisationId,
    organisations,
    requestedContext,
  ]);

  useEffect(() => {
    if (!open || !microphonePrepared || muted) return;
    const timer = window.setInterval(() => setSignalClock(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [microphonePrepared, muted, open]);

  useEffect(() => {
    if (!open || !navigator.mediaDevices) return;
    const onDeviceChange = () => {
      void refreshDevices().catch((requestError) => {
        reportStudioFailure('microphone-device', requestError);
      });
    };
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
    };
  }, [open, refreshDevices, reportStudioFailure]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    clearStudioFailure();
    try {
      const response = await apiRequest<AuthUserResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: jsonBody({ email, password }),
      });
      setUser(response.user);
      setPassword('');
    } catch (requestError) {
      reportStudioFailure('workspace', requestError);
    } finally {
      setBusy(false);
    }
  }

  async function prepareMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      reportStudioFailure(
        'microphone-permission',
        Object.assign(new Error('This browser does not provide microphone capture.'), {
          name: 'SecurityError',
          code: 'MICROPHONE_CAPTURE_UNAVAILABLE',
        }),
      );
      return;
    }
    setBusy(true);
    clearStudioFailure();
    setPhase('checking-microphone');
    setMessage('Requesting microphone permission…');
    setDeviceDisconnected(false);
    let setupStage: StudioFailureStage = 'livekit-module';
    try {
      meterRef.current?.stop();
      trackLifecycleCleanupRef.current?.();
      trackRef.current?.stop();
      const sdk = await loadLiveKitClient();
      setupStage = 'microphone-permission';
      const track = await sdk.createLocalAudioTrack({
        autoGainControl: true,
        channelCount: 1,
        deviceId: selectedDeviceId || undefined,
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48_000,
      });
      trackRef.current = track;
      monitorMicrophoneTrack(track);
      setupStage = 'microphone-device';
      await refreshDevices();
      setPhase('microphone-ready');
      setMessage('Microphone opened. Speak normally while DigiStream classifies the signal level.');
    } catch (requestError) {
      setPhase('idle');
      reportStudioFailure(setupStage, requestError);
      setMessage('Microphone setup did not complete. Follow the recovery guidance and retry.');
    } finally {
      setBusy(false);
    }
  }

  async function changeDevice(deviceId: string) {
    setSelectedDeviceId(deviceId);
    clearStudioFailure();
    try {
      if (trackRef.current) {
        await trackRef.current.setDeviceId(deviceId);
        monitorMicrophoneTrack(trackRef.current);
      }
      await refreshDevices();
    } catch (requestError) {
      reportStudioFailure('microphone-device', requestError);
    }
  }

  async function joinStudio() {
    if (!organisationId || !selectedBroadcast) return;
    setBusy(true);
    clearStudioFailure();
    setPhase('connecting');
    setMessage('Connecting to the private studio…');
    let joinStage: StudioFailureStage = 'microphone-device';
    try {
      if (!trackRef.current) await prepareMicrophone();
      const track = trackRef.current;
      if (!track) throw new Error('The microphone track is not available.');

      joinStage = 'contribution-authorisation';
      const contribution = await apiRequest<ContributionCredentialResponse>(
        `/api/v1/organisations/${organisationId}/broadcasts/${selectedBroadcast.id}/contribution-token`,
        {
          method: 'POST',
          body: jsonBody({ participantRole: 'host' }),
        },
      );
      const endpointProblem = browserMediaEndpointProblem(contribution.credential.url);
      if (endpointProblem) {
        throw new ApiClientError(503, 'MEDIA_ENDPOINT_UNREACHABLE', endpointProblem);
      }
      joinStage = 'livekit-module';
      const sdk = await loadLiveKitClient();
      const room = new sdk.Room({
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: true,
      });
      roomRef.current = room;
      participantIdentityRef.current = contribution.credential.participantIdentity;

      room
        .on(sdk.RoomEvent.Reconnecting, () => {
          setPhase('reconnecting');
          setMessage('Studio audio was interrupted. DigiStream is reconnecting…');
        })
        .on(sdk.RoomEvent.Reconnected, () => {
          setPhase(publicDeliveryActiveRef.current ? 'live' : 'connected');
          setMessage('Studio audio connection restored.');
        })
        .on(sdk.RoomEvent.Disconnected, () => {
          if (publicDeliveryActiveRef.current) {
            setPhase('reconnecting');
            reportStudioFailure(
              'studio-connect',
              Object.assign(new Error('Studio audio disconnected while public delivery may still be active.'), {
                code: 'STUDIO_DISCONNECTED_DURING_DELIVERY',
              }),
            );
            setMessage('Studio audio is disconnected. Public delivery state requires recovery or a safe end.');
          } else {
            setDeliveryRecovery(null);
            setPhase('microphone-ready');
            setMessage('Disconnected from the private studio. Your local microphone remains available.');
          }
        })
        .on(sdk.RoomEvent.MediaDevicesChanged, () => {
          void refreshDevices();
        })
        .on(sdk.RoomEvent.MediaDevicesError, (deviceError) => {
          reportStudioFailure('microphone-device', deviceError);
        })
        .on(sdk.RoomEvent.AudioPlaybackStatusChanged, () => {
          setAudioPlaybackBlocked(!room.canPlaybackAudio);
        })
        .on(sdk.RoomEvent.TrackSubscribed, (remoteTrack) => {
          const trackToAttach = remoteTrack as LiveKitRemoteTrack;
          if (trackToAttach.kind !== sdk.Track.Kind.Audio) return;
          const element = trackToAttach.attach();
          element.autoplay = true;
          remoteAudioRef.current?.appendChild(element);
        })
        .on(sdk.RoomEvent.TrackUnsubscribed, (remoteTrack) => {
          const trackToDetach = remoteTrack as LiveKitRemoteTrack;
          for (const element of trackToDetach.detach()) element.remove();
        });

      joinStage = 'studio-connect';
      await room.connect(contribution.credential.url, contribution.credential.token);
      joinStage = 'microphone-publish';
      await room.localParticipant.publishTrack(track, {
        source: sdk.Track.Source.Microphone,
        name: 'digistream-microphone',
        dtx: true,
        red: true,
      });
      const alreadyLive = selectedBroadcast.status === 'live';
      publicDeliveryActiveRef.current = alreadyLive;
      setDeliveryRecovery(null);
      setPhase(alreadyLive ? 'live' : 'connected');
      setMessage(alreadyLive ? 'Studio audio connected to the active broadcast.' : 'Studio audio connected. Start public delivery when you are ready.');
      setAudioPlaybackBlocked(!room.canPlaybackAudio);
    } catch (requestError) {
      await stopLocalMedia();
      setPhase('idle');
      reportStudioFailure(joinStage, requestError);
      setMessage('The private Studio did not connect. Follow the recovery guidance or return to Broadcasts.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleMute() {
    const track = trackRef.current;
    if (!track) return;
    clearStudioFailure();
    try {
      if (track.isMuted) {
        await track.unmute();
        setMuted(false);
        lastAudibleAtRef.current = Date.now();
        setMessage('Microphone unmuted.');
      } else {
        await track.mute();
        setMuted(true);
        setMessage('Microphone muted. Public delivery remains connected.');
      }
    } catch (requestError) {
      reportStudioFailure('microphone-device', requestError);
    }
  }

  async function enableStudioAudio() {
    try {
      await roomRef.current?.startAudio();
      setAudioPlaybackBlocked(false);
      setMessage('Studio guest audio is enabled.');
    } catch (requestError) {
      reportStudioFailure('studio-audio', requestError);
    }
  }

  function patchDeliverySnapshot(delivery: PublicDeliverySnapshot): void {
    patchBroadcast(delivery.broadcast.id, {
      status: delivery.broadcast.status,
      lifecycleVersion: delivery.broadcast.lifecycleVersion,
    });
  }

  function completePublicDelivery(delivery: PublicDeliverySnapshot): boolean {
    patchDeliverySnapshot(delivery);
    if (!publicDeliveryIsLive(delivery)) return false;
    publicDeliveryActiveRef.current = true;
    setDeliveryRecovery(null);
    clearStudioFailure();
    setPhase('live');
    setMessage(
      'You are live. Listener playback is available through the verified delivery path.',
    );
    return true;
  }

  function enterPublicDeliveryRecovery(
    delivery: PublicDeliverySnapshot,
    stage: 'delivery-start' | 'delivery-status' | 'delivery-timeout',
  ): void {
    patchDeliverySnapshot(delivery);
    const recovery = publicDeliveryRecoveryFromSnapshot(delivery, stage);
    setDeliveryRecovery(recovery);
    setPhase('connected');
    setMessage(
      recovery?.privateStudioPreserved
        ? 'Private Studio audio remains connected. Retry public delivery or check its current status.'
        : 'Public delivery is not ready. Check its current status before retrying.',
    );
  }

  function handlePublicDeliveryFailure(
    stage: StudioFailureStage,
    requestError: unknown,
  ): void {
    const diagnostic = diagnoseStudioFailure(stage, requestError);
    reportStudioFailure(stage, requestError);
    setDeliveryRecovery(
      publicDeliveryRecoveryFromError(
        diagnostic.recovery,
        diagnostic.code ?? 'DELIVERY_REQUEST_FAILED',
      ),
    );
    setPhase('connected');
    setMessage(
      'Private Studio audio remains connected, but public listener delivery needs recovery.',
    );
  }

  async function pollPublicDelivery(
    broadcastId: string,
    initial: PublicDeliverySnapshot,
  ): Promise<boolean> {
    let delivery = initial;
    const deadline = Date.now() + 90_000;

    while (Date.now() < deadline && !publicDeliveryIsLive(delivery)) {
      if (delivery.problem) {
        enterPublicDeliveryRecovery(delivery, 'delivery-start');
        return false;
      }
      await sleep(2_500);
      delivery = (
        await apiRequest<DeliveryResponse>(
          `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/delivery/status`,
          { method: 'POST' },
        )
      ).delivery;
      patchDeliverySnapshot(delivery);
    }

    if (completePublicDelivery(delivery)) return true;
    enterPublicDeliveryRecovery(delivery, 'delivery-timeout');
    return false;
  }

  async function startAndVerifyPublicDelivery(
    broadcastId: string,
    lifecycleVersion: number,
  ): Promise<boolean> {
    const attempt = deliveryAttemptRef.current + 1;
    deliveryAttemptRef.current = attempt;
    const delivery = (
      await apiRequest<DeliveryResponse>(
        `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/delivery/start`,
        {
          method: 'POST',
          headers: {
            'idempotency-key': deliveryAttemptKey(
              broadcastId,
              lifecycleVersion,
              attempt,
            ),
          },
        },
      )
    ).delivery;

    patchDeliverySnapshot(delivery);
    if (completePublicDelivery(delivery)) return true;
    if (delivery.problem) {
      enterPublicDeliveryRecovery(delivery, 'delivery-start');
      return false;
    }
    return pollPublicDelivery(broadcastId, delivery);
  }

  async function retryPublicDelivery() {
    if (!organisationId || !selectedBroadcast || !roomRef.current) return;
    setBusy(true);
    clearStudioFailure();
    setDeliveryRecovery(null);
    setPhase('starting-delivery');
    setMessage('Retrying public listener delivery while private Studio audio stays connected…');
    try {
      const current = (
        await apiRequest<BroadcastResponse>(
          `/api/v1/organisations/${organisationId}/broadcasts/${selectedBroadcast.id}`,
        )
      ).broadcast;
      await startAndVerifyPublicDelivery(current.id, current.lifecycleVersion);
    } catch (requestError) {
      handlePublicDeliveryFailure('delivery-start', requestError);
    } finally {
      setBusy(false);
    }
  }

  async function checkPublicDeliveryStatus() {
    if (!organisationId || !selectedBroadcast || !roomRef.current) return;
    setBusy(true);
    clearStudioFailure();
    setPhase('starting-delivery');
    setMessage('Checking public listener delivery without disconnecting the private Studio…');
    try {
      const delivery = (
        await apiRequest<DeliveryResponse>(
          `/api/v1/organisations/${organisationId}/broadcasts/${selectedBroadcast.id}/delivery/status`,
          { method: 'POST' },
        )
      ).delivery;
      patchDeliverySnapshot(delivery);
      if (!completePublicDelivery(delivery)) {
        enterPublicDeliveryRecovery(delivery, 'delivery-status');
      }
    } catch (requestError) {
      handlePublicDeliveryFailure('delivery-verification', requestError);
    } finally {
      setBusy(false);
    }
  }

  async function goLive() {
    if (
      !organisationId ||
      !selectedBroadcast ||
      !roomRef.current ||
      !participantIdentityRef.current
    ) {
      setFailure(null);
      setFailureStage(null);
      setError('Join the private studio and publish your microphone first.');
      return;
    }
    setBusy(true);
    clearStudioFailure();
    setDeliveryRecovery(null);
    setPhase('starting-delivery');
    setMessage('Verifying studio audio and preparing public delivery…');
    let liveStage: StudioFailureStage = 'broadcast-lifecycle';
    try {
      let current = (
        await apiRequest<BroadcastResponse>(
          `/api/v1/organisations/${organisationId}/broadcasts/${selectedBroadcast.id}`,
        )
      ).broadcast;

      if (current.status === 'draft' || current.status === 'scheduled') {
        current = (
          await apiRequest<BroadcastResponse>(
            `/api/v1/organisations/${organisationId}/broadcasts/${current.id}/start`,
            {
              method: 'POST',
              headers: {
                'idempotency-key': `creator-start-${current.id}-${current.lifecycleVersion}`,
              },
              body: jsonBody({ expectedVersion: current.lifecycleVersion }),
            },
          )
        ).broadcast;
        patchBroadcast(current.id, current);
      }

      liveStage = 'contribution-verification';
      const contribution = await apiRequest<ContributionReadyResponse>(
        `/api/v1/organisations/${organisationId}/broadcasts/${current.id}/contribution/ready`,
        {
          method: 'POST',
          body: jsonBody({
            participantIdentity: participantIdentityRef.current,
          }),
        },
      );
      patchBroadcast(current.id, {
        status: contribution.contribution.broadcast.status,
        lifecycleVersion: contribution.contribution.broadcast.lifecycleVersion,
        contributionReadyAt: contribution.contribution.broadcast.contributionReadyAt,
      });

      liveStage = 'delivery-start';
      await startAndVerifyPublicDelivery(
        current.id,
        contribution.contribution.broadcast.lifecycleVersion,
      );
    } catch (requestError) {
      handlePublicDeliveryFailure(liveStage, requestError);
    } finally {
      setBusy(false);
    }
  }

  async function endBroadcast() {
    if (!organisationId || !selectedBroadcast) return;
    setBusy(true);
    clearStudioFailure();
    setMessage('Ending public delivery safely…');
    try {
      let current = (
        await apiRequest<BroadcastResponse>(
          `/api/v1/organisations/${organisationId}/broadcasts/${selectedBroadcast.id}`,
        )
      ).broadcast;
      if (
        current.status === 'starting' ||
        current.status === 'live' ||
        current.status === 'reconnecting'
      ) {
        current = (
          await apiRequest<BroadcastResponse>(
            `/api/v1/organisations/${organisationId}/broadcasts/${current.id}/end`,
            {
              method: 'POST',
              headers: {
                'idempotency-key': `creator-end-${current.id}-${current.lifecycleVersion}`,
              },
              body: jsonBody({ expectedVersion: current.lifecycleVersion }),
            },
          )
        ).broadcast;
      }
      if (current.status === 'ending') {
        const stopped = await apiRequest<DeliveryResponse>(
          `/api/v1/organisations/${organisationId}/broadcasts/${current.id}/delivery/stop`,
          { method: 'POST' },
        );
        patchBroadcast(current.id, {
          status: stopped.delivery.broadcast.status,
          lifecycleVersion: stopped.delivery.broadcast.lifecycleVersion,
        });
      }
      await stopLocalMedia();
      setEndConfirmationOpen(false);
      setPhase('ended');
      setMessage('Broadcast completed and studio audio was released.');
    } catch (requestError) {
      reportStudioFailure('safe-end', requestError);
    } finally {
      setBusy(false);
    }
  }

  async function leaveStudio() {
    await stopLocalMedia();
    setPhase('idle');
    setMessage('You left the private studio. Public delivery was not active.');
  }

  function canRetryStudioFailure(stage: StudioFailureStage | null): boolean {
    return (
      stage === 'livekit-module' ||
      stage === 'microphone-permission' ||
      stage === 'microphone-device' ||
      stage === 'contribution-authorisation' ||
      stage === 'studio-connect' ||
      stage === 'microphone-publish' ||
      stage === 'broadcast-lifecycle' ||
      stage === 'contribution-verification' ||
      stage === 'delivery-start' ||
      stage === 'delivery-verification' ||
      stage === 'studio-audio' ||
      stage === 'safe-end'
    );
  }

  function retryStudioFailure(): void {
    if (!failureStage || busy) return;
    if (
      failureStage === 'livekit-module' ||
      failureStage === 'microphone-permission' ||
      failureStage === 'microphone-device'
    ) {
      void prepareMicrophone();
      return;
    }
    if (
      failureStage === 'contribution-authorisation' ||
      failureStage === 'studio-connect' ||
      failureStage === 'microphone-publish'
    ) {
      void joinStudio();
      return;
    }
    if (
      failureStage === 'broadcast-lifecycle' ||
      failureStage === 'contribution-verification'
    ) {
      void goLive();
      return;
    }
    if (failureStage === 'delivery-start' || failureStage === 'delivery-verification') {
      void retryPublicDelivery();
      return;
    }
    if (failureStage === 'studio-audio') {
      void enableStudioAudio();
      return;
    }
    if (failureStage === 'safe-end') void endBroadcast();
  }

  if (!open) return null;

  return (
    <div className="studio-backdrop" role="presentation">
      <section
        aria-describedby="creator-studio-description"
        aria-labelledby="creator-studio-title"
        aria-modal="true"
        className="creator-studio"
        ref={dialogRef}
        role="dialog"
      >
        <header className="studio-header">
          <div className="studio-title-group">
            <StatusBadge tone={phasePresentation.tone}>{phasePresentation.label}</StatusBadge>
            <div>
              <span className="studio-eyebrow">Creator workspace</span>
              <h2 id="creator-studio-title">
                {liveCritical ? 'Live broadcast control' : 'Broadcast studio'}
              </h2>
              <p id="creator-studio-description">
                Prepare studio audio, verify delivery and control the broadcast without exposing provider credentials.
              </p>
            </div>
          </div>
          <IconButton
            icon="error"
            label="Close broadcast studio"
            onClick={requestClose}
          />
        </header>

        {failure || error ? (
          <div className="studio-global-alert" role="alert">
            <div>
              <strong>{failure?.title ?? 'Studio action needs attention'}</strong>
              <span>{failure?.message ?? error}</span>
              {failure ? <span className="studio-global-alert-recovery">{failure.recovery}</span> : null}
              {failure && !liveCritical ? <span>The broadcast did not start from this failed Studio action.</span> : null}
              {failure ? (
                <details>
                  <summary>Technical details</summary>
                  <small>
                    Stage: {failure.stage}
                    {failure.code ? ` · Code: ${failure.code}` : ''}
                    {failure.status !== null ? ` · HTTP ${failure.status}` : ''}
                    {failure.requestId ? ` · Request: ${failure.requestId}` : ''}
                  </small>
                </details>
              ) : null}
            </div>
            <div className="studio-global-alert-actions">
              {failure && canRetryStudioFailure(failureStage) ? (
                <Button disabled={busy} onClick={retryStudioFailure} variant="primary">
                  Try again
                </Button>
              ) : null}
              {failure && !liveCritical ? (
                <Button disabled={busy} onClick={requestClose} variant="secondary">
                  Return to broadcasts
                </Button>
              ) : null}
              <Button onClick={clearStudioFailure} variant="ghost">Dismiss</Button>
            </div>
          </div>
        ) : null}

        {checkingSession ? (
          <div className="studio-state-wrap">
            <StatePanel kind="loading" title="Checking your creator session">
              DigiStream is verifying the existing secure session before showing organisation data.
            </StatePanel>
          </div>
        ) : !user ? (
          <form className="studio-login" onSubmit={signIn}>
            <div>
              <StatusBadge tone="info">Authentication required</StatusBadge>
              <h3>Sign in to broadcast</h3>
              <p>Your existing HttpOnly session protects every creator and media-control action.</p>
            </div>
            <label>
              Email
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                minLength={12}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <Button fullWidth loading={busy} type="submit" variant="primary">
              Sign in
            </Button>
          </form>
        ) : (
          <div className="studio-body">
            <aside className="studio-setup-panel" aria-label="Broadcast setup">
              <div className="studio-section-heading">
                <div>
                  <span>Step 1</span>
                  <h3>Select broadcast</h3>
                </div>
                <StatusBadge tone={selectedBroadcast ? 'success' : 'neutral'}>
                  {selectedBroadcast ? 'Selected' : 'Required'}
                </StatusBadge>
              </div>

              <div className="studio-user-card">
                <span>Signed in as</span>
                <strong>{user.displayName}</strong>
                <small>{user.email}</small>
              </div>

              <label className="studio-field">
                Organisation
                <select
                  disabled={connected || loadingOrganisations}
                  onChange={(event) => setOrganisationId(event.target.value)}
                  value={organisationId}
                >
                  <option value="">Select organisation</option>
                  {organisations.map((organisation) => (
                    <option key={organisation.id} value={organisation.id}>
                      {organisation.name} · {organisation.role}
                    </option>
                  ))}
                </select>
              </label>

              {loadingOrganisations ? (
                <StatePanel compact kind="loading" title="Loading organisations" />
              ) : organisations.length === 0 ? (
                <StatePanel compact kind="empty" title="No broadcaster organisation">
                  Your account needs an organisation membership and broadcaster capability before it can start a broadcast.
                </StatePanel>
              ) : null}

              <label className="studio-field">
                Channel
                <select
                  disabled={connected || !organisationId || loadingChannels}
                  onChange={(event) => setChannelId(event.target.value)}
                  value={channelId}
                >
                  <option value="">Select channel</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name} · {channel.status}
                    </option>
                  ))}
                </select>
              </label>

              {loadingChannels ? (
                <StatePanel compact kind="loading" title="Loading channels" />
              ) : organisationId && channels.length === 0 ? (
                <StatePanel compact kind="empty" title="No channels available">
                  Create and activate a channel before preparing public audio delivery.
                </StatePanel>
              ) : null}

              <label className="studio-field">
                Broadcast
                <select
                  disabled={connected || !channelId || loadingBroadcasts}
                  onChange={(event) => setBroadcastId(event.target.value)}
                  value={broadcastId}
                >
                  <option value="">Select broadcast</option>
                  {availableBroadcasts.map((broadcast) => (
                    <option key={broadcast.id} value={broadcast.id}>
                      {broadcast.title} · {formatStatus(broadcast.status)}
                    </option>
                  ))}
                </select>
              </label>

              {loadingBroadcasts ? (
                <StatePanel compact kind="loading" title="Loading broadcasts" />
              ) : channelId && availableBroadcasts.length === 0 ? (
                <StatePanel compact kind="empty" title="No broadcast ready for studio">
                  Create a draft or scheduled broadcast first. Completed, cancelled and failed broadcasts cannot re-enter contribution.
                </StatePanel>
              ) : null}

              {selectedBroadcast ? (
                <article className="studio-selected-broadcast">
                  <div>
                    <span>Selected broadcast</span>
                    <strong>{selectedBroadcast.title}</strong>
                  </div>
                  <StatusBadge tone={broadcastStatusTone(selectedBroadcast.status)}>
                    {formatStatus(selectedBroadcast.status)}
                  </StatusBadge>
                </article>
              ) : null}
            </aside>

            <main className="studio-workspace">
              <section className="studio-status-card" aria-live="polite">
                <div className="studio-section-heading">
                  <div>
                    <span>Current state</span>
                    <h3>{phasePresentation.label}</h3>
                  </div>
                  <StatusBadge tone={phasePresentation.tone}>{phasePresentation.label}</StatusBadge>
                </div>
                <p>{phasePresentation.description}</p>
                <p className="studio-message">{message}</p>
                {selectedBroadcast ? (
                  <div className="studio-status-actions">
                    <LinkButton
                      href={`/listen/member/${organisationId}/${selectedBroadcast.id}`}
                      icon="headphones"
                      rel="noreferrer"
                      target="_blank"
                      variant="ghost"
                    >
                      Open listener preview
                    </LinkButton>
                  </div>
                ) : null}
              </section>

              <section className="studio-audio-card" aria-labelledby="studio-audio-title">
                <div className="studio-section-heading">
                  <div>
                    <span>Step 2</span>
                    <h3 id="studio-audio-title">Prepare studio audio</h3>
                  </div>
                  <StatusBadge tone={microphoneSignal.tone}>
                    {microphoneSignal.label}
                  </StatusBadge>
                </div>

                <StudioAudioMeter
                  decibels={decibels}
                  label="Microphone input"
                  level={level}
                  state={microphoneSignalState}
                />

                <label className="studio-field">
                  Microphone input
                  <select
                    disabled={busy}
                    onChange={(event) => void changeDevice(event.target.value)}
                    value={selectedDeviceId}
                  >
                    <option value="">System default</option>
                    {devices.map((device, index) => (
                      <option key={device.deviceId || index} value={device.deviceId}>
                        {device.label || `Microphone ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="studio-audio-actions">
                  <Button
                    icon="microphone"
                    loading={busy && phase === 'checking-microphone'}
                    onClick={prepareMicrophone}
                  >
                    {microphonePrepared ? 'Run sound check again' : 'Test microphone'}
                  </Button>
                  {connected ? (
                    <Button
                      icon="microphone"
                      onClick={toggleMute}
                      variant={muted ? 'primary' : 'secondary'}
                    >
                      {muted ? 'Unmute microphone' : 'Mute microphone'}
                    </Button>
                  ) : null}
                  {audioPlaybackBlocked ? (
                    <Button icon="headphones" onClick={enableStudioAudio}>
                      Hear studio audio
                    </Button>
                  ) : connected ? (
                    <StatusBadge icon="headphones" tone="success">Studio audio enabled</StatusBadge>
                  ) : null}
                </div>
              </section>

              <section className="studio-delivery-card" aria-labelledby="studio-delivery-title">
                <div className="studio-section-heading">
                  <div>
                    <span>Step 3</span>
                    <h3 id="studio-delivery-title">Verify and go live</h3>
                  </div>
                  <StatusBadge
                    tone={
                      phase === 'live'
                        ? 'live'
                        : deliveryRecovery || phase === 'starting-delivery'
                          ? 'warning'
                          : connected
                            ? 'success'
                            : 'neutral'
                    }
                  >
                    {phase === 'live'
                      ? 'Public delivery live'
                      : deliveryRecovery
                        ? 'Delivery needs recovery'
                        : phase === 'starting-delivery'
                          ? 'Checking delivery'
                          : connected
                            ? 'Studio connected'
                            : 'Not connected'}
                  </StatusBadge>
                </div>

                <ol className="studio-readiness-list">
                  <li className={microphoneReadyForDelivery ? 'complete' : ''}>
                    <span aria-hidden="true">1</span>
                    <div>
                      <strong>Microphone permission and input</strong>
                      <small>{microphoneReadyForDelivery ? `${microphoneSignal.label}: ${microphoneSignal.guidance}` : microphoneSignal.guidance}</small>
                    </div>
                  </li>
                  <li className={connected ? 'complete' : ''}>
                    <span aria-hidden="true">2</span>
                    <div>
                      <strong>Private studio connection</strong>
                      <small>{connected ? 'Microphone is published to the authorised room.' : 'Join the studio after the input is ready.'}</small>
                    </div>
                  </li>
                  <li
                    className={
                      phase === 'live'
                        ? 'complete live'
                        : phase === 'starting-delivery' || deliveryRecovery
                          ? 'active'
                          : ''
                    }
                  >
                    <span aria-hidden="true">3</span>
                    <div>
                      <strong>Public listener delivery</strong>
                      <small>
                        {phase === 'live'
                          ? 'Contribution and public delivery are verified.'
                          : deliveryRecovery
                            ? 'Private Studio audio is healthy while public delivery waits for a retry or status check.'
                            : phase === 'starting-delivery'
                              ? 'DigiStream is waiting for verified delivery readiness.'
                              : 'Public playback remains unavailable until Go live succeeds.'}
                      </small>
                    </div>
                  </li>
                </ol>

                {deliveryRecovery ? (
                  <div className="studio-inline-alert studio-inline-warning" role="status">
                    <strong>Private Studio is still connected</strong>
                    <span>{deliveryRecovery.message}</span>
                    <details>
                      <summary>Diagnostics</summary>
                      <small>
                        Stage: {deliveryRecovery.stage.replaceAll('-', ' ')} · Code:{' '}
                        {deliveryRecovery.code} · Checked:{' '}
                        {new Date(deliveryRecovery.checkedAt).toLocaleTimeString()}
                      </small>
                    </details>
                  </div>
                ) : null}

                <div className="studio-primary-actions">
                  {!connected ? (
                    <Button
                      fullWidth
                      icon="broadcast"
                      loading={busy && phase === 'connecting'}
                      disabled={!selectedBroadcast || !microphonePrepared}
                      onClick={joinStudio}
                      variant="primary"
                    >
                      Join private studio
                    </Button>
                  ) : deliveryRecovery ? (
                    <>
                      <Button
                        fullWidth
                        icon="broadcast"
                        loading={busy && phase === 'starting-delivery'}
                        disabled={
                          busy ||
                          !microphoneReadyForDelivery ||
                          !deliveryRecovery.retryable
                        }
                        onClick={retryPublicDelivery}
                        variant="primary"
                      >
                        Retry public delivery
                      </Button>
                      <Button
                        fullWidth
                        disabled={busy}
                        onClick={checkPublicDeliveryStatus}
                      >
                        Check delivery status
                      </Button>
                      <Button
                        fullWidth
                        disabled={busy}
                        onClick={leaveStudio}
                        variant="ghost"
                      >
                        Leave private studio
                      </Button>
                    </>
                  ) : phase !== 'live' && phase !== 'reconnecting' ? (
                    <>
                      <Button
                        fullWidth
                        icon="broadcast"
                        loading={busy && phase === 'starting-delivery'}
                        disabled={!microphoneReadyForDelivery}
                        onClick={goLive}
                        variant="primary"
                      >
                        Go live
                      </Button>
                      <Button fullWidth disabled={busy} onClick={leaveStudio} variant="ghost">
                        Leave private studio
                      </Button>
                    </>
                  ) : (
                    <Button
                      fullWidth
                      disabled={busy}
                      icon="broadcast"
                      onClick={() => setEndConfirmationOpen(true)}
                      variant="danger"
                    >
                      End broadcast
                    </Button>
                  )}
                </div>

                {deliveryRecovery ? (
                  <p className="studio-action-note">
                    Public delivery recovery does not unpublish or disconnect your microphone.
                  </p>
                ) : connected && !microphoneReadyForDelivery && phase !== 'live' ? (
                  <p className="studio-action-note">{microphoneSignal.guidance}</p>
                ) : liveCritical ? (
                  <p className="studio-action-note">Closing the studio is blocked until the broadcast ends safely.</p>
                ) : (
                  <p className="studio-action-note">Complete the steps above before starting listener delivery.</p>
                )}
              </section>

              <div className="remote-audio" ref={remoteAudioRef} />
            </main>
          </div>
        )}
      </section>

      {endConfirmationOpen ? (
        <div className="studio-confirmation-backdrop" role="presentation">
          <section
            aria-describedby="end-broadcast-description"
            aria-labelledby="end-broadcast-title"
            aria-modal="true"
            className="studio-confirmation"
            ref={confirmationRef}
            role="alertdialog"
          >
            <StatusBadge tone="danger">Destructive action</StatusBadge>
            <h3 id="end-broadcast-title">End this live broadcast?</h3>
            <p id="end-broadcast-description">
              Listener delivery will stop, the broadcast will move toward completion and local studio media will be released.
            </p>
            <div className="studio-confirmation-actions">
              <Button autoFocus disabled={busy} onClick={() => setEndConfirmationOpen(false)}>
                Keep broadcasting
              </Button>
              <Button loading={busy} onClick={endBroadcast} variant="danger">
                End broadcast
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
