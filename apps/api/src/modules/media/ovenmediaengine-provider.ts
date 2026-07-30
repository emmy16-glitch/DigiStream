import { createHmac } from 'node:crypto';
import type {
  DeliveryHealth,
  DeliveryIngestTarget,
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
  relayUrlTemplate?: string;
  ingestUrlTemplate?: string;
};

type FetchLike = typeof fetch;
type OmeEnvelope = { statusCode?: number; response?: unknown };

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

function requiredUrl(
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

function validateTemplate(
  template: string | undefined,
  protocols: readonly string[],
  label: string,
): string | undefined {
  if (!template) return undefined;
  if (!template.includes('{streamName}')) {
    throw new Error(`${label} must contain {streamName}.`);
  }
  const sample = template
    .replaceAll('{streamName}', 'sample-stream')
    .replaceAll('{app}', 'app')
    .replaceAll('{roomName}', 'sample-room');
  requiredUrl(sample, protocols, label);
  return template;
}

function validateConfig(config: OvenMediaEngineConfig): OvenMediaEngineConfig {
  const api = requiredUrl(config.apiUrl, ['http:', 'https:'], 'OME_API_URL');
  const webrtc = requiredUrl(
    config.webrtcBaseUrl,
    ['ws:', 'wss:'],
    'OME_WEBRTC_BASE_URL',
  );
  const llhls = requiredUrl(
    config.llhlsBaseUrl,
    ['http:', 'https:'],
    'OME_LLHLS_BASE_URL',
  );
  if (!webrtc.port || !llhls.port) {
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

  const ingestUrlTemplate = validateTemplate(
    config.ingestUrlTemplate,
    ['rtmp:', 'rtmps:', 'srt:'],
    'OME_INGEST_URL_TEMPLATE',
  );
  const relayUrlTemplate = validateTemplate(
    config.relayUrlTemplate,
    ['rtsp:', 'rtsps:', 'ovt:', 'http:', 'https:'],
    'DELIVERY_RELAY_URL_TEMPLATE',
  );
  if (!ingestUrlTemplate && !relayUrlTemplate) {
    throw new Error(
      'Configure OME_INGEST_URL_TEMPLATE for push delivery or DELIVERY_RELAY_URL_TEMPLATE for pull delivery.',
    );
  }

  return {
    ...config,
    apiUrl: trimTrailingSlash(api.toString()),
    webrtcBaseUrl: trimTrailingSlash(webrtc.toString()),
    llhlsBaseUrl: trimTrailingSlash(llhls.toString()),
    ingestUrlTemplate,
    relayUrlTemplate,
  };
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

function parseHealth(value: unknown): DeliveryHealth {
  if (typeof value !== 'object' || value === null) {
    return { ready: true, connections: null };
  }
  const connections = (value as { connections?: unknown }).connections;
  if (typeof connections !== 'object' || connections === null) {
    return { ready: true, connections: null };
  }
  const record = connections as Record<string, unknown>;
  return {
    ready: true,
    connections: {
      webrtc: nonNegativeInteger(record.webrtc),
      llhls: nonNegativeInteger(record.llhls),
    },
  };
}

function signedPolicyUrl(
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
  const unsigned = `${baseUrl}?policy=${policy}`;
  const signature = createHmac('sha1', secret)
    .update(unsigned)
    .digest('base64url');
  return `${unsigned}&signature=${signature}`;
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

export function resolveOmeIngestTarget(
  template: string,
  app: string,
  streamName: string,
): DeliveryIngestTarget {
  const url = template
    .replaceAll('{app}', encodeURIComponent(app))
    .replaceAll('{streamName}', encodeURIComponent(streamName));
  const parsed = requiredUrl(
    url,
    ['rtmp:', 'rtmps:', 'srt:'],
    'OME_INGEST_URL_TEMPLATE',
  );
  return {
    protocol: parsed.protocol === 'srt:' ? 'srt' : 'rtmp',
    url,
    host: parsed.host,
  };
}

export function createOvenMediaEngineDeliveryProvider(
  rawConfig: OvenMediaEngineConfig,
  fetcher: FetchLike = fetch,
): DeliveryProvider {
  const config = validateConfig(rawConfig);
  const streamsPath = `/v1/vhosts/${encodeURIComponent(config.vhost)}/apps/${encodeURIComponent(config.app)}/streams`;
  const authorization = `Basic ${Buffer.from(config.accessToken).toString('base64')}`;

  async function request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<{ status: number; envelope: OmeEnvelope }> {
    const init: RequestInit = {
      method,
      headers: {
        authorization,
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      signal: AbortSignal.timeout(5_000),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    };

    let response: Response;
    try {
      response = await fetcher(`${config.apiUrl}${path}`, init);
    } catch (error) {
      throw new OvenMediaEngineError(
        error instanceof Error &&
          (error.name === 'TimeoutError' || error.name === 'AbortError')
          ? 'OvenMediaEngine request timed out.'
          : 'OvenMediaEngine is unavailable.',
      );
    }

    let envelope: OmeEnvelope = {};
    try {
      envelope = (await response.json()) as OmeEnvelope;
    } catch {
      // Successful DELETE responses may have no JSON body.
    }
    return { status: response.status, envelope };
  }

  function streamPath(streamName: string): string {
    return `${streamsPath}/${encodeURIComponent(streamName)}`;
  }

  async function inspectDelivery(streamName: string): Promise<DeliveryHealth> {
    const result = await request('GET', streamPath(streamName));
    if (result.status === 404) return { ready: false, connections: null };
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

    getIngestTarget(streamName) {
      return config.ingestUrlTemplate
        ? resolveOmeIngestTarget(config.ingestUrlTemplate, config.app, streamName)
        : null;
    },

    async ensureDelivery(input) {
      const current = await inspectDelivery(input.streamName);
      if (current.ready || config.ingestUrlTemplate) return current;

      const sourceUrl =
        input.sourceUrl ??
        resolveDeliveryRelayUrl(
          config.relayUrlTemplate!,
          input.streamName,
          input.contributionRoomName,
        );
      const result = await request('POST', streamsPath, {
        name: input.streamName,
        urls: [sourceUrl],
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
      if (config.ingestUrlTemplate) return;
      const result = await request('DELETE', streamPath(streamName));
      if (result.status !== 200 && result.status !== 404) {
        throw new OvenMediaEngineError(
          'OvenMediaEngine could not stop delivery.',
          result.status,
        );
      }
    },

    issuePlayback(streamName, expiresAt): DeliveryPlayback {
      const app = encodeURIComponent(config.app);
      const stream = encodeURIComponent(streamName);
      return {
        provider: 'ovenmediaengine',
        streamName,
        expiresAt,
        sources: [
          {
            protocol: 'webrtc',
            url: signedPolicyUrl(
              `${config.webrtcBaseUrl}/${app}/${stream}`,
              config.signedPolicySecret,
              expiresAt,
            ),
          },
          {
            protocol: 'llhls',
            url: signedPolicyUrl(
              `${config.llhlsBaseUrl}/${app}/${stream}/llhls.m3u8`,
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
  const common = [
    process.env.OME_API_URL,
    process.env.OME_API_ACCESS_TOKEN,
    process.env.OME_WEBRTC_BASE_URL,
    process.env.OME_LLHLS_BASE_URL,
    process.env.OME_SIGNED_POLICY_SECRET,
  ];
  const supplied = [
    ...common,
    process.env.OME_INGEST_URL_TEMPLATE,
    process.env.DELIVERY_RELAY_URL_TEMPLATE,
  ];
  if (supplied.every((value) => !value)) return null;
  if (common.some((value) => !value)) {
    throw new Error('OvenMediaEngine delivery configuration is incomplete.');
  }
  if (!process.env.OME_INGEST_URL_TEMPLATE && !process.env.DELIVERY_RELAY_URL_TEMPLATE) {
    throw new Error(
      'Configure OME_INGEST_URL_TEMPLATE or DELIVERY_RELAY_URL_TEMPLATE.',
    );
  }
  return createOvenMediaEngineDeliveryProvider({
    apiUrl: process.env.OME_API_URL!,
    accessToken: process.env.OME_API_ACCESS_TOKEN!,
    vhost: process.env.OME_VHOST ?? 'default',
    app: process.env.OME_APP ?? 'app',
    webrtcBaseUrl: process.env.OME_WEBRTC_BASE_URL!,
    llhlsBaseUrl: process.env.OME_LLHLS_BASE_URL!,
    signedPolicySecret: process.env.OME_SIGNED_POLICY_SECRET!,
    ingestUrlTemplate: process.env.OME_INGEST_URL_TEMPLATE,
    relayUrlTemplate: process.env.DELIVERY_RELAY_URL_TEMPLATE,
  });
}
