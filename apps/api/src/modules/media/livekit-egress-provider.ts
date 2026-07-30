import { readLiveKitProviderConfig } from './livekit-provider.js';
import { signLiveKitToken } from './livekit-jwt.js';
import {
  MediaRelayProviderError,
  type MediaRelayJob,
  type MediaRelayProvider,
  type MediaRelayStatus,
  type StartMediaRelayRequest,
} from './media-relay-provider.js';

type LiveKitEgressConfig = {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  requestTimeoutMs: number;
};

type LiveKitEgressOptions = {
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

type EgressInfo = {
  egress_id?: string;
  status?: string | number;
  error?: string;
};

type TwirpErrorPayload = {
  code?: string;
  msg?: string;
};

function mapStatus(value: unknown): MediaRelayStatus {
  if (value === 0 || value === 'EGRESS_STARTING' || value === 'STARTING') {
    return 'starting';
  }
  if (value === 1 || value === 'EGRESS_ACTIVE' || value === 'ACTIVE') {
    return 'active';
  }
  if (value === 2 || value === 'EGRESS_ENDING' || value === 'ENDING') {
    return 'stopping';
  }
  if (
    value === 3 ||
    value === 'EGRESS_COMPLETE' ||
    value === 'COMPLETE' ||
    value === 5 ||
    value === 'EGRESS_ABORTED' ||
    value === 'ABORTED'
  ) {
    return 'stopped';
  }
  if (
    value === 4 ||
    value === 'EGRESS_FAILED' ||
    value === 'FAILED' ||
    value === 6 ||
    value === 'EGRESS_LIMIT_REACHED' ||
    value === 'LIMIT_REACHED'
  ) {
    return 'failed';
  }
  return 'starting';
}

function toJob(info: EgressInfo): MediaRelayJob {
  if (!info.egress_id) {
    throw new MediaRelayProviderError(
      'invalid_response',
      'LiveKit Egress returned no egress identifier.',
    );
  }
  const status = mapStatus(info.status);
  return {
    externalId: info.egress_id,
    status,
    failureReason: status === 'failed' ? info.error?.slice(0, 500) ?? 'LiveKit egress failed.' : null,
  };
}

export class LiveKitEgressProvider implements MediaRelayProvider {
  readonly provider = 'livekit_egress' as const;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(
    private readonly config: LiveKitEgressConfig,
    options: LiveKitEgressOptions = {},
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date());
  }

  private serviceToken(): string {
    return signLiveKitToken({
      apiKey: this.config.apiKey,
      apiSecret: this.config.apiSecret,
      ttlSeconds: 60,
      video: { roomRecord: true },
      now: this.now(),
    }).token;
  }

  private async call(
    method: 'StartRoomCompositeEgress' | 'ListEgress' | 'StopEgress',
    body: Record<string, unknown>,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.config.apiUrl}/twirp/livekit.Egress/${method}`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.serviceToken()}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.requestTimeoutMs),
        },
      );
    } catch (error) {
      throw new MediaRelayProviderError(
        'request_failed',
        'LiveKit Egress could not be reached.',
        { cause: error },
      );
    }

    const text = await response.text();
    let payload: unknown = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new MediaRelayProviderError(
          'invalid_response',
          'LiveKit Egress returned invalid JSON.',
          { cause: error },
        );
      }
    }

    if (!response.ok) {
      const twirp = payload as TwirpErrorPayload;
      const code = twirp.code === 'not_found' ? 'job_not_found' : 'request_failed';
      throw new MediaRelayProviderError(
        code,
        twirp.msg || 'LiveKit Egress rejected the request.',
        { cause: payload },
      );
    }
    return payload;
  }

  async startAudioRelay(request: StartMediaRelayRequest): Promise<MediaRelayJob> {
    const payload = (await this.call('StartRoomCompositeEgress', {
      room_name: request.roomName,
      audio_only: true,
      audio_mixing: 'DEFAULT_MIXING',
      stream_outputs: [
        {
          protocol: request.protocol === 'srt' ? 'SRT' : 'RTMP',
          urls: [request.targetUrl],
        },
      ],
    })) as EgressInfo;
    return toJob(payload);
  }

  async inspectRelay(externalId: string): Promise<MediaRelayJob> {
    const payload = (await this.call('ListEgress', {
      egress_id: externalId,
    })) as { items?: EgressInfo[] };
    const info = payload.items?.find((item) => item.egress_id === externalId);
    if (!info) {
      throw new MediaRelayProviderError(
        'job_not_found',
        'The LiveKit egress job was not found.',
      );
    }
    return toJob(info);
  }

  async stopRelay(externalId: string): Promise<MediaRelayJob> {
    const payload = (await this.call('StopEgress', {
      egress_id: externalId,
    })) as EgressInfo;
    return toJob(payload);
  }
}

export function createLiveKitEgressProviderFromEnv(
  environment: NodeJS.ProcessEnv = process.env,
  options: LiveKitEgressOptions = {},
): LiveKitEgressProvider | null {
  const config = readLiveKitProviderConfig(environment);
  if (!config) return null;
  return new LiveKitEgressProvider(
    {
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      requestTimeoutMs: config.requestTimeoutMs,
    },
    options,
  );
}
