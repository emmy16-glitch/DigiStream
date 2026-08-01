import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export type RecordingAccessMode = 'playback' | 'download';

export type RecordingAccessGrant = {
  organisationId: string;
  recordingId: string;
  mode: RecordingAccessMode;
  expiresAt: Date;
};

export type RecordingAccessVerification =
  | { status: 'valid'; grant: RecordingAccessGrant }
  | { status: 'expired' }
  | { status: 'invalid' };

type TokenPayload = {
  v: 1;
  organisationId: string;
  recordingId: string;
  mode: RecordingAccessMode;
  exp: number;
  nonce: string;
};

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function signature(secret: string, encodedPayload: string): string {
  return createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
}

function validMode(value: unknown): value is RecordingAccessMode {
  return value === 'playback' || value === 'download';
}

export class RecordingAccessManager {
  readonly ttlSeconds: number;

  constructor(
    private readonly secret: string,
    ttlSeconds = 120,
  ) {
    if (Buffer.byteLength(secret) < 32) {
      throw new Error('Recording access secret must contain at least 32 bytes.');
    }
    this.ttlSeconds = Math.min(900, Math.max(30, positiveInteger(ttlSeconds, 120)));
  }

  mint(input: {
    organisationId: string;
    recordingId: string;
    mode: RecordingAccessMode;
  }): { token: string; grant: RecordingAccessGrant } {
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const payload: TokenPayload = {
      v: 1,
      organisationId: input.organisationId,
      recordingId: input.recordingId,
      mode: input.mode,
      exp: Math.floor(expiresAt.getTime() / 1000),
      nonce: randomBytes(12).toString('base64url'),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    return {
      token: `${encodedPayload}.${signature(this.secret, encodedPayload)}`,
      grant: {
        organisationId: payload.organisationId,
        recordingId: payload.recordingId,
        mode: payload.mode,
        expiresAt,
      },
    };
  }

  verify(token: string): RecordingAccessVerification {
    const parts = token.split('.');
    if (parts.length !== 2) return { status: 'invalid' };
    const encodedPayload = parts[0] ?? '';
    const providedSignature = parts[1] ?? '';
    const expectedSignature = signature(this.secret, encodedPayload);
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return { status: 'invalid' };
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as Partial<TokenPayload>;
      if (
        payload.v !== 1 ||
        typeof payload.organisationId !== 'string' ||
        typeof payload.recordingId !== 'string' ||
        !validMode(payload.mode) ||
        typeof payload.exp !== 'number' ||
        !Number.isSafeInteger(payload.exp) ||
        typeof payload.nonce !== 'string' ||
        payload.nonce.length < 8
      ) {
        return { status: 'invalid' };
      }
      if (payload.exp <= Math.floor(Date.now() / 1000)) {
        return { status: 'expired' };
      }
      return {
        status: 'valid',
        grant: {
          organisationId: payload.organisationId,
          recordingId: payload.recordingId,
          mode: payload.mode,
          expiresAt: new Date(payload.exp * 1000),
        },
      };
    } catch {
      return { status: 'invalid' };
    }
  }
}

export function createRecordingAccessManagerFromEnv(): RecordingAccessManager | null {
  const secret = process.env.RECORDING_ACCESS_SECRET?.trim();
  if (!secret) return null;
  return new RecordingAccessManager(
    secret,
    positiveInteger(process.env.RECORDING_ACCESS_TTL_SECONDS, 120),
  );
}
