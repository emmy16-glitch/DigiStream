import { createHmac, randomUUID } from 'node:crypto';

export type LiveKitVideoGrant = {
  room?: string;
  roomCreate?: boolean;
  roomList?: boolean;
  roomJoin?: boolean;
  roomAdmin?: boolean;
  canPublish?: boolean;
  canPublishData?: boolean;
  canPublishSources?: readonly string[];
  canSubscribe?: boolean;
  canUpdateOwnMetadata?: boolean;
  hidden?: boolean;
};

export type SignLiveKitTokenInput = {
  apiKey: string;
  apiSecret: string;
  ttlSeconds: number;
  identity?: string;
  name?: string;
  metadata?: string;
  attributes?: Record<string, string>;
  video: LiveKitVideoGrant;
  now?: Date;
};

export type SignedLiveKitToken = {
  token: string;
  expiresAt: Date;
};

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function signLiveKitToken(
  input: SignLiveKitTokenInput,
): SignedLiveKitToken {
  if (!input.apiKey || !input.apiSecret) {
    throw new Error('LiveKit API credentials are required.');
  }
  if (!Number.isInteger(input.ttlSeconds) || input.ttlSeconds < 1) {
    throw new Error('LiveKit token TTL must be a positive integer.');
  }
  if (input.video.roomJoin && (!input.identity || !input.video.room)) {
    throw new Error('LiveKit room-join tokens require identity and room.');
  }

  const now = input.now ?? new Date();
  const issuedAt = Math.floor(now.getTime() / 1_000);
  const expiresAt = new Date((issuedAt + input.ttlSeconds) * 1_000);
  const payload: Record<string, unknown> = {
    iss: input.apiKey,
    nbf: issuedAt,
    exp: issuedAt + input.ttlSeconds,
    jti: randomUUID(),
    video: input.video,
  };

  if (input.identity) payload.sub = input.identity;
  if (input.name) payload.name = input.name;
  if (input.metadata !== undefined) payload.metadata = input.metadata;
  if (input.attributes) payload.attributes = input.attributes;

  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  const unsigned = `${header}.${body}`;
  const signature = createHmac('sha256', input.apiSecret)
    .update(unsigned)
    .digest('base64url');

  return {
    token: `${unsigned}.${signature}`,
    expiresAt,
  };
}
