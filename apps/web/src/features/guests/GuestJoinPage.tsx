import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import { startAudioMeter, type AudioMeterController } from '../broadcasting/audio-meter';
import {
  loadLiveKitClient,
  type LiveKitLocalAudioTrack,
  type LiveKitRemoteTrack,
  type LiveKitRoom,
} from '../broadcasting/livekit-client';
import type { GuestRoute } from './guest-route';
import './guest-join.css';

type GuestSession = {
  invitationId: string;
  organisationId: string;
  broadcastId: string;
  displayName: string;
  admitted: boolean;
  expiresAt: string;
  sessionToken: string;
};

type GuestSessionResponse = {
  guestSession: GuestSession;
};

type GuestCredential = {
  provider: 'livekit';
  url: string;
  token: string;
  roomName: string;
  participantIdentity: string;
  participantRole: 'guest';
  expiresAt: string;
  permissions: {
    canPublish: boolean;
    canSubscribe: boolean;
    canPublishData: boolean;
    canPublishSources: readonly string[];
  };
};

type GuestCredentialResponse = {
  credential: GuestCredential;
};

type GuestPhase =
  | 'invitation'
  | 'waiting'
  | 'microphone-ready'
  | 'admitted'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'left'
  | 'error';

type StoredGuestSession = {
  tokenSuffix: string;
  session: GuestSession;
};

const storageKey = 'digistream-external-guest-session';

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Microphone permission was denied. Allow microphone access and try again.';
  }
  if (error instanceof Error) return error.message;
  return 'The guest waiting room could not continue.';
}

function readStoredSession(token: string): GuestSession | null {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredGuestSession;
    if (stored.tokenSuffix !== token.slice(-12)) return null;
    if (new Date(stored.session.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(storageKey);
      return null;
    }
    return stored.session;
  } catch {
    return null;
  }
}

function saveSession(token: string, session: GuestSession): void {
  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ tokenSuffix: token.slice(-12), session } satisfies StoredGuestSession),
    );
  } catch {
    // The in-memory session remains usable when browser storage is unavailable.
  }
}

export function GuestJoinPage({ route }: { route: GuestRoute }) {
  const [displayName, setDisplayName] = useState('');
  const [session, setSession] = useState<GuestSession | null>(() =>
    readStoredSession(route.token),
  );
  const [credential, setCredential] = useState<GuestCredential | null>(null);
  const [phase, setPhase] = useState<GuestPhase>(() =>
    readStoredSession(route.token) ? 'waiting' : 'invitation',
  );
  const [message, setMessage] = useState(
    session
      ? 'Your invitation was accepted. Waiting for the host to admit you.'
      : 'Enter the name the host should see in the Studio Lobby.',
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [level, setLevel] = useState(0);
  const [clipping, setClipping] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);

  const roomRef = useRef<LiveKitRoom | null>(null);
  const trackRef = useRef<LiveKitLocalAudioTrack | null>(null);
  const meterRef = useRef<AudioMeterController | null>(null);
  const remoteAudioRef = useRef<HTMLDivElement | null>(null);
  const admissionRequestRef = useRef(false);

  const expiresAt = session ? new Date(session.expiresAt) : null;
  const expired = expiresAt ? expiresAt.getTime() <= Date.now() : false;

  const stopMedia = useCallback(async () => {
    meterRef.current?.stop();
    meterRef.current = null;
    const room = roomRef.current;
    const track = trackRef.current;
    roomRef.current = null;
    trackRef.current = null;
    if (room && track) {
      try {
        await room.localParticipant.unpublishTrack(track);
      } catch {
        // Disconnect releases the transport if unpublishing already failed.
      }
    }
    if (room) {
      try {
        await room.disconnect();
      } catch {
        // The room may already be disconnected.
      }
    }
    track?.stop();
    remoteAudioRef.current?.replaceChildren();
    setLevel(0);
    setClipping(false);
    setMuted(false);
    setAudioPlaybackBlocked(false);
  }, []);

  useEffect(() => () => void stopMedia(), [stopMedia]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices) return;
    const sdk = await loadLiveKitClient();
    const inputs = await sdk.Room.getLocalDevices('audioinput');
    setDevices(inputs);
    const active = trackRef.current?.mediaStreamTrack.getSettings().deviceId;
    if (active) setSelectedDeviceId(active);
    else if (!selectedDeviceId && inputs[0]) setSelectedDeviceId(inputs[0].deviceId);
  }, [selectedDeviceId]);

  async function acceptInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await apiRequest<GuestSessionResponse>(
        `/api/v1/guest-invitations/${encodeURIComponent(route.token)}/accept`,
        {
          method: 'POST',
          body: jsonBody({ displayName }),
        },
      );
      setSession(response.guestSession);
      saveSession(route.token, response.guestSession);
      setPhase('waiting');
      setMessage('Invitation accepted. Prepare your microphone while the host reviews your admission.');
    } catch (requestError) {
      setPhase('error');
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function prepareMicrophone() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot capture a microphone. Use a current browser over HTTPS or localhost.');
      return;
    }
    setBusy(true);
    setError('');
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
        setClipping(reading.clipping);
      });
      await refreshDevices();
      setPhase(credential ? 'admitted' : 'microphone-ready');
      setMessage(
        credential
          ? 'The host admitted you. Your microphone is ready to join the Studio Lobby.'
          : 'Microphone ready. Waiting for the host to admit you.',
      );
    } catch (requestError) {
      setError(errorMessage(requestError));
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

  const checkAdmission = useCallback(async () => {
    if (!session || expired || admissionRequestRef.current || roomRef.current) return;
    admissionRequestRef.current = true;
    try {
      const response = await apiRequest<GuestCredentialResponse>(
        '/api/v1/guest-contribution-token',
        {
          method: 'POST',
          headers: { 'x-guest-session-token': session.sessionToken },
        },
      );
      setCredential(response.credential);
      setPhase(trackRef.current ? 'admitted' : 'waiting');
      setMessage(
        trackRef.current
          ? 'You were admitted. Join the Studio Lobby when ready.'
          : 'You were admitted. Prepare your microphone to join the Studio Lobby.',
      );
    } catch (requestError) {
      if (
        requestError instanceof ApiClientError &&
        requestError.code === 'GUEST_SESSION_UNAVAILABLE' &&
        !expired
      ) {
        setMessage('Waiting for the host to admit you…');
      } else {
        setPhase('error');
        setError(errorMessage(requestError));
      }
    } finally {
      admissionRequestRef.current = false;
    }
  }, [expired, session]);

  useEffect(() => {
    if (!session || credential || expired || phase === 'connected' || phase === 'left') return;
    void checkAdmission();
    const timer = window.setInterval(() => void checkAdmission(), 3_000);
    return () => window.clearInterval(timer);
  }, [checkAdmission, credential, expired, phase, session]);

  async function joinBackstage() {
    const track = trackRef.current;
    if (!credential || !track) {
      setError('Prepare your microphone and wait for host admission first.');
      return;
    }
    setBusy(true);
    setError('');
    setPhase('connecting');
    setMessage('Connecting to the private Studio Lobby…');
    try {
      const sdk = await loadLiveKitClient();
      const room = new sdk.Room({
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: true,
      });
      roomRef.current = room;
      room
        .on(sdk.RoomEvent.Reconnecting, () => {
          setPhase('reconnecting');
          setMessage('Connection interrupted. Reconnecting to the Studio Lobby…');
        })
        .on(sdk.RoomEvent.Reconnected, () => {
          setPhase('connected');
          setMessage('Studio Lobby connection restored.');
        })
        .on(sdk.RoomEvent.Disconnected, () => {
          setPhase('left');
          setMessage('You left the Studio Lobby.');
        })
        .on(sdk.RoomEvent.AudioPlaybackStatusChanged, () => {
          setAudioPlaybackBlocked(!room.canPlaybackAudio);
        })
        .on(sdk.RoomEvent.TrackSubscribed, (remoteTrack) => {
          const audioTrack = remoteTrack as LiveKitRemoteTrack;
          if (audioTrack.kind !== sdk.Track.Kind.Audio) return;
          const element = audioTrack.attach();
          element.autoplay = true;
          remoteAudioRef.current?.appendChild(element);
        })
        .on(sdk.RoomEvent.TrackUnsubscribed, (remoteTrack) => {
          const audioTrack = remoteTrack as LiveKitRemoteTrack;
          for (const element of audioTrack.detach()) element.remove();
        });

      await room.connect(credential.url, credential.token);
      await room.localParticipant.publishTrack(track, {
        source: sdk.Track.Source.Microphone,
        name: 'digistream-guest-microphone',
        dtx: true,
        red: true,
      });
      setPhase('connected');
      setMessage('You are in the Studio Lobby. The host can hear and manage your microphone.');
      setAudioPlaybackBlocked(!room.canPlaybackAudio);
    } catch (requestError) {
      await stopMedia();
      setPhase('admitted');
      setError(errorMessage(requestError));
      setMessage('Could not join the Studio Lobby.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleMute() {
    const track = trackRef.current;
    if (!track) return;
    try {
      if (track.isMuted) {
        await track.unmute();
        setMuted(false);
      } else {
        await track.mute();
        setMuted(true);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function leaveBackstage() {
    await stopMedia();
    setPhase('left');
    setMessage('You left the Studio Lobby. This invitation session remains valid until it expires or is revoked.');
  }

  const activeBars = Math.round(level * 20);
  const joined = phase === 'connected' || phase === 'reconnecting';

  return (
    <main className="guest-page">
      <header className="guest-header">
        <a className="guest-brand" href="/">
          <span aria-hidden="true">D</span>
          DigiStream
        </a>
        <span>External guest Studio Lobby</span>
      </header>

      <section className="guest-shell" aria-live="polite">
        <div className="guest-intro">
          <span className="guest-kicker">Private contribution room</span>
          <h1>Join the Studio Lobby</h1>
          <p>
            Your microphone is sent through LiveKit only after you accept the invitation,
            prepare your device and the host admits you.
          </p>
        </div>

        <article className="guest-card">
          {error ? <div className="guest-alert" role="alert">{error}</div> : null}

          {!session ? (
            <form className="guest-form" onSubmit={acceptInvitation}>
              <label>
                Display name
                <input
                  autoComplete="name"
                  maxLength={80}
                  minLength={2}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Name the host will see"
                  required
                  value={displayName}
                />
              </label>
              <button className="guest-primary" disabled={busy} type="submit">
                {busy ? 'Accepting…' : 'Accept invitation'}
              </button>
            </form>
          ) : (
            <>
              <div className={`guest-state guest-state-${phase}`}>
                <span className="guest-state-dot" />
                <div>
                  <strong>{message}</strong>
                  <small>
                    Session expires {expiresAt?.toLocaleString() ?? 'soon'}
                  </small>
                </div>
              </div>

              <div className="guest-meter" aria-label={`Microphone level ${Math.round(level * 100)} percent`}>
                {Array.from({ length: 20 }, (_, index) => (
                  <i
                    className={index < activeBars ? (index > 16 ? 'hot' : 'active') : ''}
                    key={index}
                  />
                ))}
              </div>
              {clipping ? (
                <div className="guest-warning" role="status">
                  Your microphone is clipping. Lower the input gain or move farther away.
                </div>
              ) : null}

              <label className="guest-device">
                Microphone input
                <select
                  disabled={busy || joined}
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

              {audioPlaybackBlocked ? (
                <button
                  className="guest-secondary"
                  onClick={() => void roomRef.current?.startAudio().then(() => setAudioPlaybackBlocked(false))}
                  type="button"
                >
                  Enable Studio Lobby audio
                </button>
              ) : null}

              <div className="guest-actions">
                {!trackRef.current && !joined ? (
                  <button className="guest-secondary" disabled={busy || expired} onClick={prepareMicrophone} type="button">
                    Prepare microphone
                  </button>
                ) : null}
                {!joined ? (
                  <button
                    className="guest-primary"
                    disabled={busy || expired || !credential || !trackRef.current}
                    onClick={joinBackstage}
                    type="button"
                  >
                    {phase === 'connecting' ? 'Connecting…' : 'Join Studio Lobby'}
                  </button>
                ) : (
                  <>
                    <button className="guest-secondary" disabled={busy} onClick={toggleMute} type="button">
                      {muted ? 'Unmute microphone' : 'Mute microphone'}
                    </button>
                    <button className="guest-danger" disabled={busy} onClick={leaveBackstage} type="button">
                      Leave Studio Lobby
                    </button>
                  </>
                )}
              </div>
              <div className="guest-remote-audio" ref={remoteAudioRef} />
            </>
          )}
        </article>
      </section>
    </main>
  );
}
