import { createPublicKey, verify } from 'node:crypto';

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set([
  'accounts.google.com',
  'https://accounts.google.com',
]);

type GoogleTokenHeader = {
  alg?: unknown;
  kid?: unknown;
};

type GoogleTokenClaims = {
  aud?: unknown;
  email?: unknown;
  email_verified?: unknown;
  exp?: unknown;
  iat?: unknown;
  iss?: unknown;
  name?: unknown;
  nonce?: unknown;
  sub?: unknown;
};

type GoogleJwk = JsonWebKey & {
  kid?: string;
};

type GoogleJwksResponse = {
  keys?: GoogleJwk[];
};

export type VerifiedGoogleIdentity = {
  subject: string;
  email: string;
  displayName: string;
};

let cachedKeys: { expiresAt: number; keys: GoogleJwk[] } | null = null;

function decodeJsonSegment<T>(segment: string): T {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
  } catch {
    throw new Error('The Google identity token is malformed.');
  }
}

function cacheLifetimeMilliseconds(cacheControl: string | null): number {
  const maxAge = cacheControl?.match(/(?:^|,)\s*max-age=(\d+)/i)?.[1];
  const seconds = maxAge ? Number(maxAge) : 3_600;
  return Number.isSafeInteger(seconds) && seconds > 0
    ? Math.min(seconds, 24 * 60 * 60) * 1_000
    : 3_600_000;
}

async function googleSigningKeys(): Promise<GoogleJwk[]> {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;

  const response = await fetch(GOOGLE_CERTS_URL, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error('Google signing keys are temporarily unavailable.');
  }

  const payload = (await response.json()) as GoogleJwksResponse;
  const keys = Array.isArray(payload.keys)
    ? payload.keys.filter(
        (key) =>
          key.kty === 'RSA' &&
          typeof key.kid === 'string' &&
          typeof key.n === 'string' &&
          typeof key.e === 'string',
      )
    : [];
  if (keys.length === 0) {
    throw new Error('Google returned no usable signing keys.');
  }

  cachedKeys = {
    keys,
    expiresAt:
      Date.now() + cacheLifetimeMilliseconds(response.headers.get('cache-control')),
  };
  return keys;
}

function validAudience(audience: unknown, clientId: string): boolean {
  return typeof audience === 'string'
    ? audience === clientId
    : Array.isArray(audience) && audience.includes(clientId);
}

function verifiedEmail(value: unknown): boolean {
  return value === true || value === 'true';
}

export async function verifyGoogleIdentityToken(
  credential: string,
  clientId: string,
  expectedNonce: string,
): Promise<VerifiedGoogleIdentity> {
  const segments = credential.split('.');
  if (segments.length !== 3) {
    throw new Error('The Google identity token is malformed.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('The Google identity token is malformed.');
  }

  const header = decodeJsonSegment<GoogleTokenHeader>(encodedHeader);
  const claims = decodeJsonSegment<GoogleTokenClaims>(encodedPayload);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
    throw new Error('The Google identity token uses an unsupported signature.');
  }

  let signingKey = (await googleSigningKeys()).find(
    (candidate) => candidate.kid === header.kid,
  );
  if (!signingKey) {
    cachedKeys = null;
    signingKey = (await googleSigningKeys()).find(
      (candidate) => candidate.kid === header.kid,
    );
  }
  if (!signingKey) {
    throw new Error('The Google identity token signing key is unknown.');
  }

  const signatureValid = verify(
    'RSA-SHA256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8'),
    createPublicKey({ key: signingKey, format: 'jwk' }),
    Buffer.from(encodedSignature, 'base64url'),
  );
  if (!signatureValid) {
    throw new Error('The Google identity token signature is invalid.');
  }

  const nowSeconds = Math.floor(Date.now() / 1_000);
  if (
    !GOOGLE_ISSUERS.has(String(claims.iss)) ||
    !validAudience(claims.aud, clientId) ||
    typeof claims.exp !== 'number' ||
    claims.exp <= nowSeconds ||
    (typeof claims.iat === 'number' && claims.iat > nowSeconds + 60) ||
    claims.nonce !== expectedNonce ||
    typeof claims.sub !== 'string' ||
    claims.sub.length < 1 ||
    claims.sub.length > 255 ||
    typeof claims.email !== 'string' ||
    !verifiedEmail(claims.email_verified)
  ) {
    throw new Error('The Google identity token claims are invalid.');
  }

  const email = claims.email.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error('Google did not provide a valid verified email address.');
  }

  const proposedName =
    typeof claims.name === 'string' ? claims.name : email.split('@')[0];
  const displayName = proposedName.trim().replace(/\s+/g, ' ').slice(0, 100);
  if (displayName.length < 2) {
    throw new Error('Google did not provide a usable account name.');
  }

  return {
    subject: claims.sub,
    email,
    displayName,
  };
}
