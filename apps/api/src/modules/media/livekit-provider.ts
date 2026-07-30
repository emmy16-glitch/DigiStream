import { randomUUID } from 'node:crypto';
import {
  ContributionProviderError,
  type ContributionCredential,
  type ContributionCredentialRequest,
  type ContributionProvider,
  type ContributionRoomRequest,
} from './contribution-provider.js';
import { signLiveKitToken, type LiveKitVideoGrant } from './livekit-jwt.js';

export type LiveKitProviderConfig = {
  clientUrl: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  tokenTtlSeconds: number;
  roomEmptyTimeoutSeconds: number;
  roomDepartureTimeoutSeconds: number;
  roomMaxParticipants: number;
  requestTimeoutMs: number;
};

export type LiveKitProviderOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

type TwirpErrorPayload = {
  code?: string;
  msg?: string;
  meta?: Record<string, string>;
};

function parseInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ContributionProviderError(
      'invalid_configuration',
      `${name} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
  return parsed;
}

function parseUrl(value: string, protocols: readonly string[], name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ContributionProviderError(
      'invalid_configuration',
      `${name} must be a valid absolute URL.`,
    );
  }
  if (!protocols.includes(parsed.protocol)) {
    throw new ContributionProviderError(
      'invalid_configuration',
      `${name} must use ${protocols.join(' or ')}.`,
    );
  }
  return parsed.toString().replace(/\/$/, '');
}

function deriveApiUrl(clientUrl: string): string {
  const parsed = new URL(clientUrl);
  parsed.protocol = parsed.protocol === 'wss:' ? 'https:' : 'http:';
  return parsed.toString().replace(/\/$/, '');
}

export function readLiveKitProviderConfig(
  environment: NodeJS.ProcessEnv = process.env,
): LiveKitProviderConfig | null {
  const rawClientUrl = environment.LIVEKIT_URL?.trim();
  const rawApiUrl = environment.LIVEKIT_API_URL?.trim();
  const apiKey = environment.LIVEKIT_API_KEY?.trim();
  const apiSecret = environment.LIVEKIT_API_SECRET?.trim();
  const supplied = [rawClientUrl, rawApiUrl, apiKey, apiSecret].some(Boolean);

  if (!supplied) return null;
  if (!rawClientUrl || !apiKey || !apiSecret) {
    throw new ContributionProviderError(
      'invalid_configuration',
      'LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be configured together.',
    );
  }

  const clientUrl = parseUrl(rawClientUrl, ['ws:', 'wss:'], 'LIVEKIT_URL');
  const apiUrl = rawApiUrl
    ? parseUrl(rawApiUrl, ['http:', 'https:'], 'LIVEKIT_API_URL')
    : deriveApiUrl(clientUrl);

  return {
    clientUrl,
    apiUrl,
    apiKey,
    apiSecret,
    tokenTtlSeconds: parseInteger(
      environment.LIVEKIT_TOKEN_TTL_SECONDS,
      300,
      60,
      900,
      'LIVEKIT_TOKEN_TTL_SECONDS',
    ),
    roomEmptyTimeoutSeconds: parseInteger(
      environment.LIVEKIT_ROOM_EMPTY_TIMEOUT_SECONDS,
      600,
      60,
      3_600,
      'LIVEKIT_ROOM_EMPTY_TIMEOUT_SECONDS',
    ),
    roomDepartureTimeoutSeconds: parseInteger(
      environment.LIVEKIT_ROOM_DEPARTURE_TIMEOUT_SECONDS,
      60,
      10,
      600,
      'LIVEKIT_ROOM_DEPARTURE_TIMEOUT_SECONDS',
    ),
    roomMaxParticipants: parseInteger(
      environment.LIVEKIT_ROOM_MAX_PARTICIPANTS,
      12,
      2,
      100,
      'LIVEKIT_ROOM_MAX_PARTICIPANTS',
    ),
    requestTimeoutMs: parseInteger(
      environment.LIVEKIT_REQUEST_TIMEOUT_MS,
      5_000,
      500,
      30_000,
      'LIVEKIT_REQUEST_TIMEOUT_MS',
    ),
  };
}

export class LiveKitContributionProvider implements ContributionProvider {
  readonly provider = 'livekit' as const;
  readonly clientUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(
    private readonly config: LiveKitProviderConfig,
    options: LiveKitProviderOptions = {},
  ) {
    this.clientUrl = config.clientUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  private serviceToken(video: LiveKitVideoGrant): string {
    return signLiveKitToken({
      apiKey: this.config.apiKey,
      apiSecret: this.config.apiSecret,
      ttlSeconds: 60,
      video,
      now: this.now(),
    }).token;
  }

  private async roomServiceCall(
    method: 'ListRooms' | 'CreateRoom',
    video: LiveKitVideoGrant,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.config.apiUrl}/twirp/livekit.RoomService/${method}`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.serviceToken(video)}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        },
      );
    } catch (error) {
      throw new ContributionProviderError(
        'request_failed',
        'LiveKit RoomService could not be reached.',
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
          'LiveKit RoomService returned invalid JSON.',
          error,
        );
      }
    }

    if (!response.ok) {
      throw new ContributionProviderError(
        'request_failed',
        'LiveKit RoomService rejected the request.',
        payload,
      );
    }

    return payload;
  }

  async ensureRoom(request: ContributionRoomRequest): Promise<void> {
    const listed = (await this.roomServiceCall(
      'ListRooms',
      { roomList: true },
      { names: [request.roomName] },
    )) as { rooms?: Array<{ name?: string }> };

    if (listed.rooms?.some((room) => room.name === request.roomName)) return;

    try {
      await this.roomServiceCall(
        'CreateRoom',
        { roomCreate: true },
        {
          name: request.roomName,
          empty_timeout: this.config.roomEmptyTimeoutSeconds,
          departure_timeout: this.config.roomDepartureTimeoutSeconds,
          max_participants: this.config.roomMaxParticipants,
          metadata: JSON.stringify({
            product: 'DigiStream',
            broadcastId: request.broadcastId,
            organisationId: request.organisationId,
            channelId: request.channelId,
          }),
        },
      );
    } catch (error) {
      const payload =
        error instanceof ContributionProviderError
          ? (error.cause as TwirpErrorPayload | undefined)
          : undefined;
      if (payload?.code === 'already_exists') return;
      throw error;
    }
  }

  async issueCredential(
    request: ContributionCredentialRequest,
  ): Promise<ContributionCredential> {
    const canPublish = request.participantRole !== 'monitor';
    const participantIdentity = `${request.participantRole}-${request.userId}-${randomUUID()
      .replaceAll('-', '')
      .slice(0, 12)}`;
    const permissions = {
      canPublish,
      canSubscribe: true,
      canPublishData: false,
      canPublishSources: canPublish ? ['microphone'] : [],
    } as const;

    const signed = signLiveKitToken({
      apiKey: this.config.apiKey,
      apiSecret: this.config.apiSecret,
      ttlSeconds: this.config.tokenTtlSeconds,
      identity: participantIdentity,
      name: request.displayName,
      metadata: JSON.stringify({
        product: 'DigiStream',
        userId: request.userId,
        broadcastId: request.broadcastId,
        organisationId: request.organisationId,
        channelId: request.channelId,
        participantRole: request.participantRole,
      }),
      attributes: {
        'digistream.user_id': request.userId,
        'digistream.broadcast_id': request.broadcastId,
        'digistream.role': request.participantRole,
      },
      video: {
        room: request.roomName,
        roomJoin: true,
        canPublish,
        canSubscribe: true,
        canPublishData: false,
        canPublishSources: permissions.canPublishSources,
        canUpdateOwnMetadata: false,
      },
      now: this.now(),
    });

    return {
      provider: 'livekit',
      url: this.config.clientUrl,
      token: signed.token,
      roomName: request.roomName,
      participantIdentity,
      participantRole: request.participantRole,
      expiresAt: signed.expiresAt,
      permissions,
    };
  }
}

export function createLiveKitContributionProviderFromEnv(
  environment: NodeJS.ProcessEnv = process.env,
  options: LiveKitProviderOptions = {},
): LiveKitContributionProvider | null {
  const config = readLiveKitProviderConfig(environment);
  return config ? new LiveKitContributionProvider(config, options) : null;
}
