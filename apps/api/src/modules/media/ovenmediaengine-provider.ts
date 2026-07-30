import { createHmac } from 'node:crypto';
import type {
  DeliveryHealth,
  DeliveryPlayback,
  DeliveryProvider,
} from './delivery-provider.js';

export type OvenMediaEngineConfig = {
  apiUrl: string;
  accessToken: string;
  vhost: string;
  app: string;
  webrtcBaseUrl: string;
  llhlsBaseUrl: string;
  signedPolicySecret: string;
  relayUrlTemplate: string;
};

type FetchLike = typeof fetch;

type OmeEnvelope = {
  statusCode?: number;
  response?: unknown;
};

export class OvenMediaEngineError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'OvenMediaEngineError';
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function parseRequiredUrl(
  value: string,
  protocols: readonly string[],
  label: string,
): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`${label} must use ${protocols.join(' or ')}.`);
  }
  return parsed;
}

function validateConfig(config: OvenMediaEngineConfig): OvenMediaEngineConfig {
  const apiUrl = parseRequiredUrl(config.apiUrl, ['http:', 'https:'], 'OME_API_URL');
  const webrtcUrl = parseRequiredUrl(
    config.webrtcBaseUrl,
    ['ws:', 'wss:'],
    'OME_WEBRTC_BASE_URL',
  );
  const llhlsUrl = parseRequiredUrl(
    config.llhlsBaseUrl,
    ['http:', 'https:'],
    'OME_LLHLS_BASE_URL',
  );

  if (!webrtcUrl.port || !llhlsUrl.port) {
    throw new Error(
      'OME playback base URLs must include explicit ports for signed-policy verification.',
    );
  }
  if (!config.accessToken || !config.signedPolicySecret) {
    throw new Error('OME API and signed-policy secrets are required.');
  }
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(config.vhost)) {
    throw new Error('OME_VHOST contains unsupported characters.');
  }
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(config.app)) {
    throw new Error('OME_APP contains unsupported characters.');
  }
  if (
    !config.relayUrlTemplate.includes('{streamName}') &&
    !config.relayUrlTemplate.includes('{roomName}')
  ) {
    throw new Error(
      'DELIVERY_RELAY_URL_TEMPLATE must contain {streamName} or {roomName}.',
    );
  }

  return {
    ...config,
    apiUrl: trimTrailingSlash(apiUrl.toString()),
    webrtcBaseUrl: trimTrailingSlash(webrtcUrl.toString()),
    llhlsBaseUrl: trimTrailingSlash(llhlsUrl.toString()),
  };
}

function toNonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function parseHealth(response: unknown): DeliveryHealth {
  if (typeof response !== 'object' || response === null) {
    return { ready: true, connections: null };
  }

  const connections = (response as { connections?: unknown }).connections;
  if (typeof connections !== 'object' || connections === null) {
    return { ready: true, connections: null };
  }

  return {
    ready: true,
    connections: {
      webrtc: toNonNegativeInteger(
        (connections as Record<string, unknown>).webrtc,
      ),
      llhls: toNonNegativeInteger((connections as Record<string, unknown>).llhls),
    },
  };
}

function buildSignedPolicyUrl(
  baseUrl: string,
  secret: string,
  expiresAt: Date,
): string {
  const policy = Buffer.from(
    JSON.stringify({
      url_expire: expiresAt.getTime(),
      stream_expire: expiresAt.getTime(),
    }),
  ).toString('base64url');
  const unsignedUrl = `${baseUrl}?policy=${policy}`;
  const signature = createHmac('sha1', secret)
    .update(unsignedUrl)
    .digest('base64url');
  return `${unsignedUrl}&signature=${signature}`;
}

export function createOvenMediaEngineDeliveryProvider(
  rawConfig: OvenMediaEngineConfig,
  fetcher: FetchLike = fetch,
): DeliveryProvider {
  const config = validateConfig(rawConfig);
  const resourcePath = `/v1/vhosts/${encodeURIComponent(config.vhost)}/apps/${encodeURIComponent(config.app)}/streams`;
  const authorization = `Basic ${Buffer.from(config.accessToken).toString('base64')}`;

  async function request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<{ status: number; envelope: OmeEnvelope }> {
    let response: Response;
    try {
      response = await fetcher(`${config.apiUrl}${path}`, {
        method,
        headers: {
          authorization,
          accept: 'application/json',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      throw new OvenMediaEngineError(
        error instanceof Error && error.name === 'TimeoutError'
          ? 'OvenMediaEngine request timed out.'
          : 'OvenMediaEngine is unavailable.',
      );
    }

    let envelope: OmeEnvelope = {};
    try {
      envelope = (await response.json()) as OmeEnvelope;
    } catch {
      // Some successful DELETE responses may not include a useful body.
    }
    return { status: response.status, envelope };
  }

  function streamPath(streamName: string): string {
    return `${resourcePath}/${encodeURIComponent(streamName)}`;
  }

  function relayUrl(streamName: string, roomName: string): string {
    return config.relayUrlTemplate
      .replaceAll('{streamName}', encodeURIComponent(streamName))
      .replaceAll('{roomName}', encodeURIComponent(roomName));
  }

  async function inspectDelivery(streamName: string): Promise<DeliveryHealth> {
    const result = await request('GET', streamPath(streamName));
    if (result.status === 404) {
      return { ready: false, connections: null };
    }
    if (result.status !== 200) {
      throw new OvenMediaEngineError(
        'OvenMediaEngine stream inspection failed.',
        result.status,
      );
    }
    return parseHealth(result.envelope.response);
  }

  return {
    provider: 'ovenmediaengine',

    async ensureDelivery(input) {
      const current = await inspectDelivery(input.streamName);
      if (current.ready) return current;

      const result = await request('POST', resourcePath, {
        name: input.streamName,
        urls: [input.sourceUrl || relayUrl(input.streamName, input.contributionRoomName)],
        properties: {
          persistent: false,
          noInputFailoverTimeoutMs: 5_000,
          unusedStreamDeletionTimeoutMs: 60_000,
        },
      });

      if (result.status !== 201 && result.status !== 409) {
        throw new OvenMediaEngineError(
          'OvenMediaEngine could not start delivery.',
          result.status,
        );
      }
      return inspectDelivery(input.streamName);
    },

    inspectDelivery,

    async stopDelivery(streamName) {
      const result = await request('DELETE', streamPath(streamName));
      if (result.status !== 200 && result.status !== 404) {
        throw new OvenMediaEngineError(
          'OvenMediaEngine could not stop delivery.',
          result.status,
        );
      }
    },

    issuePlayback(streamName, expiresAt): DeliveryPlayback {
      const application = encodeURIComponent(config.app);
      const stream = encodeURIComponent(streamName);
      const webrtcUrl = `${config.webrtcBaseUrl}/${application}/${stream}`;
      const llhlsUrl = `${config.llhlsBaseUrl}/${application}/${stream}/llhls.m3u8`;
      return {
        provider: 'ovenmediaengine',
        streamName,
        expiresAt,
        sources: [
          {
            protocol: 'webrtc',
            url: buildSignedPolicyUrl(
              webrtcUrl,
              config.signedPolicySecret,
              expiresAt,
            ),
          },
          {
            protocol: 'llhls',
            url: buildSignedPolicyUrl(
              llhlsUrl,
              config.signedPolicySecret,
              expiresAt,
            ),
          },
        ],
      };
    },
  };
}

export function createOvenMediaEngineDeliveryProviderFromEnv(): DeliveryProvider | null {
  const required = [
    process.env.OME_API_URL,
    process.env.OME_API_ACCESS_TOKEN,
    process.env.OME_WEBRTC_BASE_URL,
    process.env.OME_LLHLS_BASE_URL,
    process.env.OME_SIGNED_POLICY_SECRET,
    process.env.DELIVERY_RELAY_URL_TEMPLATE,
  ];
  if (required.every((value) => value === undefined || value.length === 0)) {
    return null;
  }
  if (required.some((value) => value === undefined || value.length === 0)) {
    throw new Error('OvenMediaEngine delivery configuration is incomplete.');
  }

  return createOvenMediaEngineDeliveryProvider({
    apiUrl: process.env.OME_API_URL!,
    accessToken: process.env.OME_API_ACCESS_TOKEN!,
    vhost: process.env.OME_VHOST ?? 'default',
    app: process.env.OME_APP ?? 'app',
    webrtcBaseUrl: process.env.OME_WEBRTC_BASE_URL!,
    llhlsBaseUrl: process.env.OME_LLHLS_BASE_URL!,
    signedPolicySecret: process.env.OME_SIGNED_POLICY_SECRET!,
    relayUrlTemplate: process.env.DELIVERY_RELAY_URL_TEMPLATE!,
  });
}

export function resolveDeliveryRelayUrl(
  template: string,
  streamName: string,
  roomName: string,
): string {
  return template
    .replaceAll('{streamName}', encodeURIComponent(streamName))
    .replaceAll('{roomName}', encodeURIComponent(roomName));
}
