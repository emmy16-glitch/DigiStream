import {
  ContributionProviderError,
} from './contribution-provider.js';
import {
  readLiveKitProviderConfig,
  type LiveKitProviderConfig,
} from './livekit-provider.js';
import { signLiveKitToken } from './livekit-jwt.js';

export type BackstageTrack = {
  sid: string;
  source: string;
  muted: boolean;
};

export type BackstageParticipant = {
  identity: string;
  name: string;
  role: 'host' | 'guest' | 'monitor' | 'unknown';
  connected: boolean;
  publishing: boolean;
  tracks: BackstageTrack[];
};

export interface BackstageProvider {
  listParticipants(roomName: string): Promise<BackstageParticipant[]>;
  muteMicrophone(
    roomName: string,
    participantIdentity: string,
    muted: boolean,
  ): Promise<BackstageParticipant>;
  removeParticipant(roomName: string, participantIdentity: string): Promise<void>;
}

type LiveKitTrack = {
  sid?: string;
  source?: string | number;
  muted?: boolean;
};

type LiveKitParticipant = {
  identity?: string;
  name?: string;
  state?: string | number;
  is_publisher?: boolean;
  metadata?: string;
  tracks?: LiveKitTrack[];
};

function normaliseSource(value: string | number | undefined): string {
  if (value === 2 || value === 'MICROPHONE' || value === 'TRACK_SOURCE_MICROPHONE') {
    return 'microphone';
  }
  if (value === 3 || value === 'SCREEN_SHARE' || value === 'TRACK_SOURCE_SCREEN_SHARE') {
    return 'screen_share';
  }
  if (value === 1 || value === 'CAMERA' || value === 'TRACK_SOURCE_CAMERA') {
    return 'camera';
  }
  return typeof value === 'string' ? value.toLowerCase() : 'unknown';
}

function participantRole(participant: LiveKitParticipant): BackstageParticipant['role'] {
  if (participant.metadata) {
    try {
      const metadata = JSON.parse(participant.metadata) as { participantRole?: unknown };
      if (
        metadata.participantRole === 'host' ||
        metadata.participantRole === 'guest' ||
        metadata.participantRole === 'monitor'
      ) {
        return metadata.participantRole;
      }
    } catch {
      // Fall back to the server-generated identity prefix.
    }
  }
  const prefix = participant.identity?.split('-', 1)[0];
  return prefix === 'host' || prefix === 'guest' || prefix === 'monitor'
    ? prefix
    : 'unknown';
}

function toParticipant(participant: LiveKitParticipant): BackstageParticipant {
  const identity = participant.identity ?? '';
  return {
    identity,
    name: participant.name?.trim() || identity || 'Unnamed participant',
    role: participantRole(participant),
    connected:
      participant.state === undefined ||
      participant.state === 1 ||
      participant.state === 'ACTIVE' ||
      participant.state === 'JOINED',
    publishing: Boolean(participant.is_publisher),
    tracks: (participant.tracks ?? [])
      .filter((track): track is LiveKitTrack & { sid: string } => Boolean(track.sid))
      .map((track) => ({
        sid: track.sid,
        source: normaliseSource(track.source),
        muted: Boolean(track.muted),
      })),
  };
}

export class LiveKitBackstageProvider implements BackstageProvider {
  constructor(
    private readonly config: LiveKitProviderConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private serviceToken(roomName: string): string {
    return signLiveKitToken({
      apiKey: this.config.apiKey,
      apiSecret: this.config.apiSecret,
      ttlSeconds: 60,
      video: { room: roomName, roomAdmin: true },
    }).token;
  }

  private async call(
    method: 'ListParticipants' | 'MutePublishedTrack' | 'RemoveParticipant',
    roomName: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.config.apiUrl}/twirp/livekit.RoomService/${method}`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.serviceToken(roomName)}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        },
      );
    } catch (error) {
      throw new ContributionProviderError(
        'request_failed',
        'LiveKit backstage control could not be reached.',
        error,
      );
    }

    const text = await response.text();
    let payload: unknown = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new ContributionProviderError(
          'invalid_response',
          'LiveKit backstage control returned invalid JSON.',
          error,
        );
      }
    }
    if (!response.ok) {
      throw new ContributionProviderError(
        'request_failed',
        'LiveKit backstage control rejected the request.',
        payload,
      );
    }
    return payload;
  }

  async listParticipants(roomName: string): Promise<BackstageParticipant[]> {
    const payload = (await this.call('ListParticipants', roomName, {
      room: roomName,
    })) as { participants?: LiveKitParticipant[] };
    return (payload.participants ?? [])
      .map(toParticipant)
      .filter((participant) => participant.identity.length > 0);
  }

  async muteMicrophone(
    roomName: string,
    participantIdentity: string,
    muted: boolean,
  ): Promise<BackstageParticipant> {
    const participants = await this.listParticipants(roomName);
    const participant = participants.find(
      (item) => item.identity === participantIdentity,
    );
    const microphone = participant?.tracks.find(
      (track) => track.source === 'microphone',
    );
    if (!participant || !microphone) {
      throw new ContributionProviderError(
        'invalid_response',
        'The participant has no published microphone track.',
      );
    }

    await this.call('MutePublishedTrack', roomName, {
      room: roomName,
      identity: participantIdentity,
      track_sid: microphone.sid,
      muted,
    });

    return {
      ...participant,
      tracks: participant.tracks.map((track) =>
        track.sid === microphone.sid ? { ...track, muted } : track,
      ),
    };
  }

  async removeParticipant(
    roomName: string,
    participantIdentity: string,
  ): Promise<void> {
    await this.call('RemoveParticipant', roomName, {
      room: roomName,
      identity: participantIdentity,
    });
  }
}

export function createLiveKitBackstageProviderFromEnv(
  environment: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): LiveKitBackstageProvider | null {
  const config = readLiveKitProviderConfig(environment);
  return config ? new LiveKitBackstageProvider(config, fetchImpl) : null;
}
