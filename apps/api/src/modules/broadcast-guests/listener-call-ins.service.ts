import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findPublicBroadcastRecord } from '../broadcasts/broadcasts.repository.js';
import type { BroadcastStatus } from '../broadcasts/broadcasts.types.js';
import type { CallInRequestDto, CallInStatus } from './broadcast-guests.types.js';

const CALL_IN_ACTIVE_STATES = new Set<BroadcastStatus>([
  'scheduled',
  'starting',
  'live',
  'reconnecting',
]);

const DEFAULT_RATE_LIMIT_MAX = 3;
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 30 * 60;
const DEFAULT_STATUS_TTL_SECONDS = 24 * 60 * 60;
const DEVELOPMENT_FINGERPRINT_SECRET =
  'digistream-development-call-in-fingerprint-change-me';

export type CreateListenerCallInBody = {
  displayName?: unknown;
  email?: unknown;
  message?: unknown;
};

export type ListenerRequestMetadata = {
  ipAddress: string;
  userAgent: string;
};

export type CreatedListenerCallIn = {
  callIn: CallInRequestDto;
  statusToken: string;
  statusExpiresAt: Date;
};

export type PublicListenerCallInStatus = {
  id: string;
  status: CallInStatus;
  displayName: string;
  contactProvided: boolean;
  createdAt: Date;
  decidedAt: Date | null;
  statusExpiresAt: Date;
  guidance: string;
};

type StoredCallInRow = {
  id: string;
  organisationId: string;
  broadcastId: string;
  displayName: string;
  contactEmail: string | null;
  message: string | null;
  status: CallInStatus;
  invitationId: string | null;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  statusTokenExpiresAt: Date;
};

type StatusRow = {
  id: string;
  displayName: string;
  contactEmail: string | null;
  status: CallInStatus;
  decidedAt: Date | null;
  createdAt: Date;
  statusTokenExpiresAt: Date;
};

type RateRow = {
  count: number;
  oldestCreatedAt: Date | null;
};

function cleanName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Display name is required.');
  }
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Display name must be between 2 and 80 characters.',
    );
  }
  return name;
}

function cleanEmail(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Email must be text.');
  }
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Provide a valid email address.');
  }
  return email;
}

function cleanMessage(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Message must be text.');
  }
  const message = value.trim();
  if (message.length > 500) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Message cannot exceed 500 characters.',
    );
  }
  return message || null;
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function fingerprintSecret(): string {
  const configured = process.env.CALL_IN_FINGERPRINT_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new ApiError(
      503,
      'CALL_IN_CONFIGURATION_INVALID',
      'Listener call-ins are temporarily unavailable.',
    );
  }
  return DEVELOPMENT_FINGERPRINT_SECRET;
}

function requesterHash(
  metadata: ListenerRequestMetadata,
  contactEmail: string | null,
): string {
  const source = [
    metadata.ipAddress.trim().slice(0, 128),
    metadata.userAgent.trim().slice(0, 512),
    contactEmail ?? '',
  ].join('\n');
  return createHmac('sha256', fingerprintSecret()).update(source).digest('hex');
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function secretToken(): string {
  return randomBytes(32).toString('base64url');
}

function toCallIn(row: StoredCallInRow): CallInRequestDto {
  return {
    id: row.id,
    organisationId: row.organisationId,
    broadcastId: row.broadcastId,
    displayName: row.displayName,
    contactEmail: row.contactEmail,
    message: row.message,
    status: row.status,
    invitationId: row.invitationId,
    decidedByUserId: row.decidedByUserId,
    decidedAt: row.decidedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const databaseError = error as { code?: unknown; constraint?: unknown };
  return databaseError.code === '23505' && databaseError.constraint === constraint;
}

function guidance(status: CallInStatus, contactProvided: boolean): string {
  if (status === 'pending') {
    return 'Your request is waiting for the production team. Keep this page open for updates.';
  }
  if (status === 'approved') {
    return contactProvided
      ? 'Your request was approved. The host may send an expiring guest link using the contact email you provided. Keep this page open and follow the host’s instructions.'
      : 'Your request was approved. Keep this page open and follow the host’s instructions for joining backstage.';
  }
  return 'The production team is not bringing this request on air. You can continue listening to the broadcast.';
}

export async function createListenerCallInRequest(
  context: DatabaseContext,
  organisationSlug: string,
  channelSlug: string,
  broadcastSlug: string,
  body: CreateListenerCallInBody,
  metadata: ListenerRequestMetadata,
): Promise<CreatedListenerCallIn> {
  const broadcast = await findPublicBroadcastRecord(
    context.db,
    organisationSlug,
    channelSlug,
    broadcastSlug,
  );
  if (!broadcast) {
    throw new ApiError(
      404,
      'BROADCAST_NOT_FOUND',
      'The requested broadcast was not found.',
    );
  }
  if (!CALL_IN_ACTIVE_STATES.has(broadcast.status)) {
    throw new ApiError(
      409,
      'CALL_IN_CLOSED',
      'Call-in requests are not open for this broadcast.',
    );
  }

  const displayName = cleanName(body.displayName);
  const contactEmail = cleanEmail(body.email);
  const message = cleanMessage(body.message);
  const fingerprint = requesterHash(metadata, contactEmail);
  const rateLimitMax = positiveInteger(
    process.env.CALL_IN_RATE_LIMIT_MAX,
    DEFAULT_RATE_LIMIT_MAX,
    1,
    20,
  );
  const rateWindowSeconds = positiveInteger(
    process.env.CALL_IN_RATE_LIMIT_WINDOW_SECONDS,
    DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
    60,
    86_400,
  );
  const statusTtlSeconds = positiveInteger(
    process.env.CALL_IN_STATUS_TTL_SECONDS,
    DEFAULT_STATUS_TTL_SECONDS,
    300,
    172_800,
  );

  const duplicate = await context.pool.query<{ id: string }>(
    `SELECT id
       FROM broadcast_call_in_requests
      WHERE broadcast_id = $1
        AND requester_hash = $2
        AND status = 'pending'
      LIMIT 1`,
    [broadcast.id, fingerprint],
  );
  if (duplicate.rowCount) {
    throw new ApiError(
      409,
      'CALL_IN_ALREADY_PENDING',
      'A call-in request from this listener is already waiting for a decision.',
    );
  }

  const windowStartedAt = new Date(Date.now() - rateWindowSeconds * 1_000);
  const recent = await context.pool.query<RateRow>(
    `SELECT count(*)::int AS count,
            min(created_at) AS "oldestCreatedAt"
       FROM broadcast_call_in_requests
      WHERE broadcast_id = $1
        AND requester_hash = $2
        AND created_at >= $3`,
    [broadcast.id, fingerprint, windowStartedAt],
  );
  const rate = recent.rows[0] ?? { count: 0, oldestCreatedAt: null };
  if (rate.count >= rateLimitMax) {
    const oldest = rate.oldestCreatedAt?.getTime() ?? Date.now();
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + rateWindowSeconds * 1_000 - Date.now()) / 1_000),
    );
    throw new ApiError(
      429,
      'CALL_IN_RATE_LIMITED',
      'Too many call-in requests were submitted. Please wait before trying again.',
      { retryAfterSeconds },
    );
  }

  const statusToken = secretToken();
  const statusExpiresAt = new Date(Date.now() + statusTtlSeconds * 1_000);

  try {
    const inserted = await context.pool.query<StoredCallInRow>(
      `INSERT INTO broadcast_call_in_requests (
         organisation_id,
         broadcast_id,
         display_name,
         contact_email,
         message,
         requester_hash,
         status_token_hash,
         status_token_expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING
         id,
         organisation_id AS "organisationId",
         broadcast_id AS "broadcastId",
         display_name AS "displayName",
         contact_email AS "contactEmail",
         message,
         status,
         invitation_id AS "invitationId",
         decided_by_user_id AS "decidedByUserId",
         decided_at AS "decidedAt",
         created_at AS "createdAt",
         updated_at AS "updatedAt",
         status_token_expires_at AS "statusTokenExpiresAt"`,
      [
        broadcast.organisation.id,
        broadcast.id,
        displayName,
        contactEmail,
        message,
        fingerprint,
        tokenHash(statusToken),
        statusExpiresAt,
      ],
    );
    const row = inserted.rows[0];
    if (!row) throw new Error('Call-in request insertion returned no row.');
    return {
      callIn: toCallIn(row),
      statusToken,
      statusExpiresAt: row.statusTokenExpiresAt,
    };
  } catch (error) {
    if (
      isUniqueViolation(
        error,
        'broadcast_call_in_requests_pending_requester_unique',
      )
    ) {
      throw new ApiError(
        409,
        'CALL_IN_ALREADY_PENDING',
        'A call-in request from this listener is already waiting for a decision.',
      );
    }
    throw error;
  }
}

export async function getPublicListenerCallInStatus(
  context: DatabaseContext,
  rawStatusToken: string,
): Promise<PublicListenerCallInStatus> {
  if (rawStatusToken.length < 30 || rawStatusToken.length > 200) {
    throw new ApiError(
      404,
      'CALL_IN_STATUS_NOT_FOUND',
      'The call-in status link is invalid.',
    );
  }
  const result = await context.pool.query<StatusRow>(
    `SELECT
       id,
       display_name AS "displayName",
       contact_email AS "contactEmail",
       status,
       decided_at AS "decidedAt",
       created_at AS "createdAt",
       status_token_expires_at AS "statusTokenExpiresAt"
     FROM broadcast_call_in_requests
     WHERE status_token_hash = $1
     LIMIT 1`,
    [tokenHash(rawStatusToken)],
  );
  const row = result.rows[0];
  if (!row) {
    throw new ApiError(
      404,
      'CALL_IN_STATUS_NOT_FOUND',
      'The call-in status link is invalid.',
    );
  }
  if (row.statusTokenExpiresAt.getTime() <= Date.now()) {
    throw new ApiError(
      410,
      'CALL_IN_STATUS_EXPIRED',
      'The call-in status link has expired.',
    );
  }

  const contactProvided = Boolean(row.contactEmail);
  return {
    id: row.id,
    status: row.status,
    displayName: row.displayName,
    contactProvided,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
    statusExpiresAt: row.statusTokenExpiresAt,
    guidance: guidance(row.status, contactProvided),
  };
}
