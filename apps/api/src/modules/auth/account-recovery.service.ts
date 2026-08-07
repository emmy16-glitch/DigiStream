import { createHash, randomBytes } from 'node:crypto';
import type { DatabaseContext } from '../../db/client.js';
import { authenticateSessionCookie } from '../../auth/session-auth.js';
import { hashPassword } from '../../auth/password.js';
import type { AccountTokenDelivery } from '../../auth/account-token-delivery.js';
import {
  confirmEmailVerification,
  confirmPasswordReset,
  consumeTokenByHash,
  findAccountByEmail,
  findAccountById,
  persistAccountToken,
  type AccountRow,
  type AccountTokenPurpose,
} from './account-recovery.repository.js';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export type RecoveryFailureCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'EMAIL_DELIVERY_UNAVAILABLE'
  | 'VERIFICATION_TOKEN_INVALID'
  | 'RESET_TOKEN_INVALID';

export type RecoveryFailure = { code: RecoveryFailureCode; cause?: unknown };

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function makeToken(): string {
  return randomBytes(32).toString('base64url');
}

function validToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 32 && value.length <= 200;
}

function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128;
}

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

async function issueToken(
  database: DatabaseContext,
  user: AccountRow,
  purpose: AccountTokenPurpose,
  expiresAt: Date,
  delivery: AccountTokenDelivery,
): Promise<void> {
  const token = makeToken();
  const tokenHash = hashToken(token);
  await persistAccountToken(database, user.id, purpose, tokenHash, expiresAt);

  try {
    const message = {
      email: user.email,
      displayName: user.display_name,
      token,
      expiresAt,
    };
    if (purpose === 'email_verification') {
      await delivery.sendEmailVerification(message);
    } else {
      await delivery.sendPasswordReset(message);
    }
  } catch (error) {
    await consumeTokenByHash(database, tokenHash);
    throw error;
  }
}

export async function requestEmailVerification(
  database: DatabaseContext,
  cookieHeader: string | undefined,
  delivery: AccountTokenDelivery | null,
  now = new Date(),
): Promise<
  | { ok: true; status: 'already_verified' | 'verification_sent' }
  | { ok: false; failure: RecoveryFailure }
> {
  const session = await authenticateSessionCookie(database.db, cookieHeader);
  if (!session) {
    return { ok: false, failure: { code: 'AUTHENTICATION_REQUIRED' } };
  }

  const user = await findAccountById(database, session.userId);
  if (!user || user.status !== 'active') {
    return { ok: false, failure: { code: 'AUTHENTICATION_REQUIRED' } };
  }
  if (user.email_verified_at) return { ok: true, status: 'already_verified' };
  if (!delivery) {
    return { ok: false, failure: { code: 'EMAIL_DELIVERY_UNAVAILABLE' } };
  }

  try {
    await issueToken(
      database,
      user,
      'email_verification',
      new Date(now.getTime() + VERIFY_TTL_MS),
      delivery,
    );
    return { ok: true, status: 'verification_sent' };
  } catch (cause) {
    return {
      ok: false,
      failure: { code: 'EMAIL_DELIVERY_UNAVAILABLE', cause },
    };
  }
}

export async function confirmEmailVerificationToken(
  database: DatabaseContext,
  token: unknown,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; failure: RecoveryFailure }> {
  if (!validToken(token)) {
    return { ok: false, failure: { code: 'VERIFICATION_TOKEN_INVALID' } };
  }
  const result = await confirmEmailVerification(database, hashToken(token), now);
  return result === 'confirmed'
    ? { ok: true }
    : { ok: false, failure: { code: 'VERIFICATION_TOKEN_INVALID' } };
}

export async function requestPasswordReset(
  database: DatabaseContext,
  emailValue: unknown,
  delivery: AccountTokenDelivery | null,
  now = new Date(),
): Promise<{ status: 'accepted'; deliveryError?: unknown }> {
  const email = normaliseEmail(emailValue);
  if (!email) return { status: 'accepted' };

  const user = await findAccountByEmail(database, email);
  if (user?.status === 'active' && delivery) {
    try {
      await issueToken(
        database,
        user,
        'password_reset',
        new Date(now.getTime() + RESET_TTL_MS),
        delivery,
      );
    } catch (deliveryError) {
      return { status: 'accepted', deliveryError };
    }
  }

  return { status: 'accepted' };
}

export async function confirmPasswordResetToken(
  database: DatabaseContext,
  token: unknown,
  password: unknown,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; failure: RecoveryFailure }> {
  if (!validToken(token) || !validPassword(password)) {
    return { ok: false, failure: { code: 'RESET_TOKEN_INVALID' } };
  }

  const passwordHash = await hashPassword(password);
  const result = await confirmPasswordReset(
    database,
    hashToken(token),
    passwordHash,
    now,
  );
  return result === 'confirmed'
    ? { ok: true }
    : { ok: false, failure: { code: 'RESET_TOKEN_INVALID' } };
}
