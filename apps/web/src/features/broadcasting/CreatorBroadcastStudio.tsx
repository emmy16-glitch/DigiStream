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
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import { startAudioMeter, type AudioMeterController } from './audio-meter';
import {
  loadLiveKitClient,
  type LiveKitLocalAudioTrack,
  type LiveKitRemoteTrack,
  type LiveKitRoom,
} from './livekit-client';
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
  delivery: {
    ready: boolean;
    broadcast: {
      id: string;
      status: Broadcast['status'];
      lifecycleVersion: number;
    };
  };
};

type CreatorBroadcastStudioProps = {
  open: boolean;
  onClose(): void;
};

const contributionStates = new Set<Broadcast['status']>([
  'draft',
  'scheduled',
  'starting',
  'live',
  'reconnecting',
]);

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Microphone permission was denied. Allow microphone access in the browser and try again.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong while preparing the broadcast studio.';
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function CreatorBroadcastStudio({
  open,
  onClose,
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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [phase, setPhase] = useState<StudioPhase>('idle');
  const [level, setLevel] = useState(0);
  const [decibels, setDecibels] = useState(-100);
  const [clipping, setClipping] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [message, setMessage] = useState('Select a broadcast and test your microphone.');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const roomRef = useRef<LiveKitRoom | null>(null);
  const trackRef = useRef<LiveKitLocalAudioTrack | null>(null);
  const meterRef = useRef<AudioMeterController | null>(null);
  const participantIdentityRef = useRef('');
  const remoteAudioRef = useRef<HTMLDivElement | null>(null);

  const selectedBroadcast = useMemo(
    () => broadcasts.find((item) => item.id === broadcastId) ?? null,
    [broadcastId, broadcasts],
  );

  const patchBroadcast = useCallback(
    (id: string, patch: Partial<Broadcast>) => {
      setBroadcasts((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices) return;
    const sdk = await loadLiveKitClient();
    const inputs = await sdk.Room.getLocalDevices('audioinput');
    setDevices(inputs);
    const active = trackRef.current?.mediaStreamTrack.getSettings().deviceId;
    if (active) setSelectedDeviceId(active);
    else if (!selectedDeviceId && inputs[0]) setSelectedDeviceId(inputs[0].deviceId);
  }, [selectedDeviceId]);

  const stopLocalMedia = useCallback(async () => {
    meterRef.current?.stop();
    meterRef.current = null;
    const room = roomRef.current;
    const track = trackRef.current;
    roomRef.current = null;
    trackRef.current = null;
    participantIdentityRef.current = '';
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
    setAudioPlaybackBlocked(false);
  }, []);

  const closeStudio = useCallback(() => {
    void stopLocalMedia().finally(onClose);
  }, [onClose, stopLocalMedia]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeStudio();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeStudio, open]);

  useEffect(() => {
    if (!open) return;
    setCheckingSession(true);
    setError('');
    void apiRequest<AuthUserResponse>('/api/v1/auth/me')
      .then((response) => setUser(response.user))
      .catch((requestError) => {
        if (!(requestError instanceof ApiClientError) || requestError.status !== 401) {
          setError(errorMessage(requestError));
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
    setError('');
    void apiRequest<OrganisationListResponse>('/api/v1/organisations')
      .then((response) => {
        setOrganisations(response.organisations);
        setOrganisationId((current) => current || response.organisations[0]?.id || '');
      })
      .catch((requestError) => setError(errorMessage(requestError)));
  }, [open, user]);

  useEffect(() => {
    if (!organisationId) {
      setChannels([]);
      setChannelId('');
      return;
    }
    setError('');
    void apiRequest<ChannelListResponse>(
      `/api/v1/organisations/${organisationId}/channels`,
    )
      .then((response) => {
        setChannels(response.channels);
        setChannelId((current) =>
          response.channels.some((item) => item.id === current)
            ? current
            : response.channels[0]?.id || '',
        );
      })
      .catch((requestError) => setError(errorMessage(requestError)));
  }, [organisationId]);

  useEffect(() => {
    if (!organisationId || !channelId) {
      setBroadcasts([]);
      setBroadcastId('');
      return;
    }
    setError('');
    void apiRequest<BroadcastListResponse>(
      `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
    )
      .then((response) => {
        setBroadcasts(response.broadcasts);
        const available = response.broadcasts.filter((item) =>
          contributionStates.has(item.status),
        );
        setBroadcastId((current) =>
          available.some((item) => item.id === current)
            ? current
            : available[0]?.id || '',
        );
      })
      .catch((requestError) => setError(errorMessage(requestError)));
  }, [channelId, organisationId]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await apiRequest<AuthUserResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: jsonBody({ email, password }),
      });
      setUser(response.user);
      setPassword('');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function prepareMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not provide microphone capture. Use a current Chrome, Edge, Firefox or Safari browser over HTTPS or localhost.');
      return;
    }
    setBusy(true);
    setError('');
    setPhase('checking-microphone');
    setMessage('Requesting microphone permission…');
    try {
      meterRef.current?.stop();
      trackRef.current?.stop();
      const sdk = await loadLiveKitClient();
      const track = await sdk.createLocalAudioTrack({
        autoGainControl: true,
        channelCount: 1,
        deviceId: selectedDeviceId || undefined,
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48_000,
      });
      trackRef.current = track;
      meterRef.current = startAudioMeter(track.mediaStreamTrack, (reading) => {
        setLevel(reading.level);
        setDecibels(reading.decibels);
        setClipping(reading.clipping);
      });
      await refreshDevices();
      setPhase('microphone-ready');
      setMessage('Microphone ready. Speak normally and keep the meter out of the red zone.');
    } catch (requestError) {
      setPhase('idle');
      setError(errorMessage(requestError));
      setMessage('Microphone setup failed.');
    } finally {
      setBusy(false);
    }
  }

  async function changeDevice(deviceId: string) {
    setSelectedDeviceId(deviceId);
    setError('');
    try {
      if (trackRef.current) await trackRef.current.setDeviceId(deviceId);
      await refreshDevices();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function joinStudio() {
    if (!organisationId || !selectedBroadcast) return;
    setBusy(true);
    setError('');
    setPhase('connecting');
    setMessage('Connecting to the LiveKit contribution room…');
    try {
      if (!trackRef.current) await prepareMicrophone();
      const track = trackRef.current;
      if (!track) throw new Error('The microphone track is not available.');

      const contribution = await apiRequest<ContributionCredentialResponse>(
        `/api/v1/organisations/${organisationId}/broadcasts/${selectedBroadcast.id}/contribution-token`,
        {
          method: 'POST',
          body: jsonBody({ participantRole: 'host' }),
        },
      );
      const sdk = await loadLiveKitClient();
      const room = new sdk.Room({
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: true,
      });
      roomRef.current = room;
      participantIdentityRef.current =
        contribution.credential.participantIdentity;

      room
        .on(sdk.RoomEvent.Reconnecting, () => {
          setPhase('reconnecting');
          setMessage('Connection interrupted. LiveKit is reconnecting…');
        })
        .on(sdk.RoomEvent.Reconnected, () => {
          setPhase(selectedBroadcast.status === 'live' ? 'live' : 'connected');
          setMessage('Connection restored.');
        })
        .on(sdk.RoomEvent.Disconnected, () => {
          setPhase('idle');
          setMessage('Disconnected from the contribution room.');
        })
        .on(sdk.RoomEvent.MediaDevicesChanged, () => {
          void refreshDevices();
        })
        .on(sdk.RoomEvent.MediaDevicesError, (deviceError) => {
          setError(errorMessage(deviceError));
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

      await room.connect(contribution.credential.url, contribution.credential.token);
      await room.localParticipant.publishTrack(track, {
        source: sdk.Track.Source.Microphone,
        name: 'digistream-microphone',
        dtx: true,
        red: true,
      });
      setPhase(selectedBroadcast.status === 'live' ? 'live' : 'connected');
      setMessage('Microphone published. You can now start public delivery.');
      setAudioPlaybackBlocked(!room.canPlaybackAudio);
    } catch (requestError) {
      await stopLocalMedia();
      setPhase('microphone-ready');
      setError(errorMessage(requestError));
      setMessage('Could not join the contribution room.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleMute() {
    const track = trackRef.current;
    if (!track) return;
    setError('');
    try {
      if (track.isMuted) {
        await track.unmute();
        setMuted(false);
        setMessage('Microphone unmuted.');
      } else {
        await track.mute();
        setMuted(true);
        setMessage('Microphone muted. Public delivery remains connected.');
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function enableGuestAudio() {
    try {
      await roomRef.current?.startAudio();
      setAudioPlaybackBlocked(false);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function goLive() {
    if (
      !organisationId ||
      !selectedBroadcast ||
      !roomRef.current ||
      !participantIdentityRef.current
    ) {
      setError('Join the contribution room and publish your microphone first.');
      return;
    }
    setBusy(true);
    setError('');
    setPhase('starting-delivery');
    setMessage('Starting the broadcast and public delivery…');
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
        lifecycleVersion:
          contribution.contribution.broadcast.lifecycleVersion,
        contributionReadyAt:
          contribution.contribution.broadcast.contributionReadyAt,
      });

      let delivery = await apiRequest<DeliveryResponse>(
        `/api/v1/organisations/${organisationId}/broadcasts/${current.id}/delivery/start`,
        { method: 'POST' },
      );
      patchBroadcast(current.id, {
        status: delivery.delivery.broadcast.status,
        lifecycleVersion: delivery.delivery.broadcast.lifecycleVersion,
      });

      const deadline = Date.now() + 90_000;
      while (
        Date.now() < deadline &&
        !(delivery.delivery.ready && delivery.delivery.broadcast.status === 'live')
      ) {
        if (delivery.delivery.broadcast.status === 'failed') {
          throw new Error('The media bridge reported a failed broadcast.');
        }
        await sleep(2_500);
        delivery = await apiRequest<DeliveryResponse>(
          `/api/v1/organisations/${organisationId}/broadcasts/${current.id}/delivery/refresh`,
          { method: 'POST' },
        );
        patchBroadcast(current.id, {
          status: delivery.delivery.broadcast.status,
          lifecycleVersion: delivery.delivery.broadcast.lifecycleVersion,
        });
      }

      if (!delivery.delivery.ready || delivery.delivery.broadcast.status !== 'live') {
        throw new Error('Public delivery did not become ready within 90 seconds.');
      }
      setPhase('live');
      setMessage('You are live. Listeners can now use the signed WebRTC or LL-HLS player.');
    } catch (requestError) {
      setPhase('connected');
      setError(errorMessage(requestError));
      setMessage('The microphone is still connected, but public delivery did not start.');
    } finally {
      setBusy(false);
    }
  }

  async function endBroadcast() {
    if (!organisationId || !selectedBroadcast) return;
    setBusy(true);
    setError('');
    setMessage('Ending public delivery…');
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
      setPhase('ended');
      setMessage('Broadcast completed and the contribution room was left.');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const activeBars = Math.round(level * 24);
  const connected =
    phase === 'connected' ||
    phase === 'starting-delivery' ||
    phase === 'live' ||
    phase === 'reconnecting';

  return (
    <div className="studio-backdrop" role="presentation">
      <section
        aria-labelledby="creator-studio-title"
        aria-modal="true"
        className="creator-studio"
        role="dialog"
      >
        <header className="studio-header">
          <div>
            <span className="eyebrow">Live contribution</span>
            <h2 id="creator-studio-title">Creator broadcast studio</h2>
            <p>Test your input, join LiveKit and start OvenMediaEngine delivery.</p>
          </div>
          <button
            aria-label="Close broadcast studio"
            className="studio-close"
            onClick={closeStudio}
            type="button"
          >
            ×
          </button>
        </header>

        {error ? <div className="studio-alert error" role="alert">{error}</div> : null}

        {checkingSession ? (
          <div className="studio-loading">Checking your session…</div>
        ) : !user ? (
          <form className="studio-login" onSubmit={signIn}>
            <div>
              <h3>Sign in to broadcast</h3>
              <p>Your existing HttpOnly session is used for every creator action.</p>
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
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <div className="studio-body">
            <section className="studio-selection" aria-label="Broadcast selection">
              <div className="studio-user">
                <span>Signed in as</span>
                <strong>{user.displayName}</strong>
                <small>{user.email}</small>
              </div>
              <label>
                Organisation
                <select
                  disabled={connected}
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
              <label>
                Channel
                <select
                  disabled={connected || !organisationId}
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
              <label>
                Broadcast
                <select
                  disabled={connected || !channelId}
                  onChange={(event) => setBroadcastId(event.target.value)}
                  value={broadcastId}
                >
                  <option value="">Select broadcast</option>
                  {broadcasts
                    .filter((broadcast) => contributionStates.has(broadcast.status))
                    .map((broadcast) => (
                      <option key={broadcast.id} value={broadcast.id}>
                        {broadcast.title} · {broadcast.status}
                      </option>
                    ))}
                </select>
              </label>
            </section>

            <section className="studio-console" aria-label="Microphone and live controls">
              <div className="studio-state-row">
                <div>
                  <span className={`connection-dot ${phase}`} aria-hidden="true" />
                  <strong>{phase.replaceAll('-', ' ')}</strong>
                </div>
                {selectedBroadcast ? (
                  <span className={`status-badge ${selectedBroadcast.status}`}>
                    {selectedBroadcast.status}
                  </span>
                ) : null}
              </div>

              <div className="studio-meter" aria-label={`Microphone level ${Math.round(level * 100)} percent`}>
                {Array.from({ length: 24 }, (_, index) => (
                  <i
                    className={index < activeBars ? (index > 20 ? 'hot' : 'active') : ''}
                    key={index}
                  />
                ))}
              </div>
              <div className="meter-readout">
                <span>{Math.round(level * 100)}%</span>
                <span>{Number.isFinite(decibels) ? `${decibels.toFixed(1)} dBFS` : 'silent'}</span>
              </div>
              {clipping ? (
                <div className="studio-alert warning" role="status">
                  Input is clipping. Reduce the microphone gain or move farther away.
                </div>
              ) : null}

              <label>
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

              <p className="studio-message" aria-live="polite">{message}</p>

              {audioPlaybackBlocked ? (
                <button className="secondary-button" onClick={enableGuestAudio} type="button">
                  Enable guest audio
                </button>
              ) : null}

              <div className="studio-actions">
                {!connected ? (
                  <>
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={prepareMicrophone}
                      type="button"
                    >
                      {phase === 'checking-microphone' ? 'Checking…' : 'Test microphone'}
                    </button>
                    <button
                      className="primary-button"
                      disabled={busy || !selectedBroadcast || phase === 'idle'}
                      onClick={joinStudio}
                      type="button"
                    >
                      Join studio
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={toggleMute}
                      type="button"
                    >
                      {muted ? 'Unmute' : 'Mute'}
                    </button>
                    {phase !== 'live' ? (
                      <button
                        className="primary-button"
                        disabled={busy || muted}
                        onClick={goLive}
                        type="button"
                      >
                        {phase === 'starting-delivery' ? 'Starting…' : 'Go live'}
                      </button>
                    ) : (
                      <button
                        className="danger-button"
                        disabled={busy}
                        onClick={endBroadcast}
                        type="button"
                      >
                        End broadcast
                      </button>
                    )}
                    <button
                      className="ghost-button"
                      disabled={busy}
                      onClick={() => void stopLocalMedia().then(() => setPhase('idle'))}
                      type="button"
                    >
                      Leave studio
                    </button>
                  </>
                )}
              </div>
              <div className="remote-audio" ref={remoteAudioRef} />
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
