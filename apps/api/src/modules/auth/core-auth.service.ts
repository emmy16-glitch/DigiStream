import { createHash, randomBytes } from 'node:crypto';
import type { DatabaseContext } from '../../db/client.js';
import { verifyGoogleIdentityToken } from '../../auth/google-identity.js';
import { hashPassword, verifyPassword } from '../../auth/password.js';
import {
  authenticateGoogleIdentity,
  createSession,
  findCurrentSessionUser,
  findUserByEmail,
  registerEmailUser,
  revokeSessionByTokenHash,
  touchSession,
  type PublicAuthUserRow,
  type SessionMaterial,
} from './core-auth.repository.js';

const DEFAULT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const DUMMY_PASSWORD_HASH =
  'scrypt$32768$8$3$ZGlnaXN0cmVhbS1kdW1teQ$l3AsXzOUIyW_cvzp5bUXEhf5i8zzn9iGBFkAvR6GppxoN83n3zZ-M6DPEUcOAzhYAutZme_ezgXib5vla621Dg';

export type RequestMetadata = {
  userAgent: string | null;
  ipAddress: string | null;
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  status: PublicAuthUserRow['status'];
  emailVerifiedAt: Date | null;
  createdAt: Date;
};

export type AuthResult = {
  user: PublicUser;
  token: string;
  expiresAt: Date;
};

export class CoreAuthError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function publicUser(user: PublicAuthUserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    status: user.status,
    emailVerifiedAt: user.email_verified_at,
    createdAt: user.created_at,
  };
}

export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (
    email.length < 3 ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }
  return email;
}

function normaliseDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const displayName = value.trim().replace(/\s+/g, ' ');
  return displayName.length >= 2 && displayName.length <= 100 ? displayName : null;
}

function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128;
}

function validGoogleCredential(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 100 && value.length <= 10_000;
}

function validGoogleNonce(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 16 &&
    value.length <= 200 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

export function googleClientId(): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  return clientId && clientId.length <= 500 ? clientId : null;
}

function sessionTtlSeconds(): number {
  const configured = Number(process.env.AUTH_SESSION_TTL_SECONDS);
  if (
    Number.isSafeInteger(configured) &&
    configured >= 300 &&
    configured <= 365 * 24 * 60 * 60
  ) {
    return configured;
  }
  return DEFAULT_SESSION_TTL_SECONDS;
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createSessionMaterial(metadata: RequestMetadata): {
  token: string;
  material: SessionMaterial;
} {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    material: {
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + sessionTtlSeconds() * 1000),
      userAgent: metadata.userAgent?.slice(0, 500) ?? null,
      ipAddress: metadata.ipAddress,
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) return false;
    if ('code' in current && (current as { code?: unknown }).code === '23505') {
      return true;
    }
    if (!('cause' in current)) return false;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export async function registerWithEmail(
  database: DatabaseContext,
  body: { email?: unknown; displayName?: unknown; password?: unknown },
  metadata: RequestMetadata,
): Promise<AuthResult> {
  const email = normaliseEmail(body.email);
  const displayName = normaliseDisplayName(body.displayName);
  const password = body.password;
  if (!email || !displayName || !validPassword(password)) {
    throw new CoreAuthError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid email, a 2–100 character display name, and a 12–128 character password.',
    );
  }

  const passwordHash = await hashPassword(password);
  const session = createSessionMaterial(metadata);
  try {
    const user = await registerEmailUser(database, {
      email,
      displayName,
      passwordHash,
      session: session.material,
    });
    return {
      user: publicUser(user),
      token: session.token,
      expiresAt: session.material.expiresAt,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new CoreAuthError(409, 'ACCOUNT_EXISTS', 'An account with this email already exists.');
    }
    throw error;
  }
}

export async function loginWithEmail(
  database: DatabaseContext,
  body: { email?: unknown; password?: unknown },
  metadata: RequestMetadata,
): Promise<AuthResult> {
  const email = normaliseEmail(body.email);
  const password = body.password;
  if (!email || !validPassword(password)) {
    throw new CoreAuthError(400, 'VALIDATION_ERROR', 'Provide a valid email and password.');
  }

  const user = await findUserByEmail(database, email);
  const passwordMatches = user
    ? await verifyPassword(password, user.password_hash)
    : await verifyPassword(password, DUMMY_PASSWORD_HASH);
  if (!user || !passwordMatches) {
    throw new CoreAuthError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
  }
  if (user.status !== 'active') {
    throw new CoreAuthError(403, 'ACCOUNT_UNAVAILABLE', 'This account is not currently available.');
  }

  const session = createSessionMaterial(metadata);
  await createSession(database, user.id, session.material);
  return {
    user: publicUser(user),
    token: session.token,
    expiresAt: session.material.expiresAt,
  };
}

export async function loginWithGoogle(
  database: DatabaseContext,
  body: { credential?: unknown; nonce?: unknown },
  metadata: RequestMetadata,
): Promise<AuthResult> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new CoreAuthError(
      503,
      'GOOGLE_AUTH_NOT_CONFIGURED',
      'Google sign-in is not configured for this DigiStream environment.',
    );
  }
  if (!validGoogleCredential(body.credential) || !validGoogleNonce(body.nonce)) {
    throw new CoreAuthError(400, 'VALIDATION_ERROR', 'Provide a valid Google identity credential.');
  }

  try {
    const identity = await verifyGoogleIdentityToken(body.credential, clientId, body.nonce);
    const placeholderPasswordHash = await hashPassword(randomBytes(48).toString('base64url'));
    const session = createSessionMaterial(metadata);
    const user = await authenticateGoogleIdentity(
      database,
      identity,
      placeholderPasswordHash,
      session.material,
    );
    if (user.status !== 'active') {
      throw new CoreAuthError(403, 'ACCOUNT_UNAVAILABLE', 'This account is not currently available.');
    }
    return {
      user: publicUser(user),
      token: session.token,
      expiresAt: session.material.expiresAt,
    };
  } catch (error) {
    if (error instanceof CoreAuthError) throw error;
    throw new CoreAuthError(
      401,
      'GOOGLE_IDENTITY_INVALID',
      'Google could not verify this sign-in. Please try again.',
    );
  }
}

export async function getCurrentUser(
  database: DatabaseContext,
  token: string,
  now = new Date(),
): Promise<PublicUser | null> {
  if (!token || token.length > 200) return null;
  const result = await findCurrentSessionUser(database, hashSessionToken(token), now);
  if (!result) return null;
  await touchSession(database, result.session_id, now);
  return publicUser(result);
}

export async function logoutCurrentSession(
  database: DatabaseContext,
  token: string | null,
): Promise<void> {
  if (!token || token.length > 200) return;
  await revokeSessionByTokenHash(database, hashSessionToken(token));
}
