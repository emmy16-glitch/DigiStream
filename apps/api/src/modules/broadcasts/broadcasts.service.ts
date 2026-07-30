import { createHash, randomUUID } from 'node:crypto';
import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import {
  createBroadcastRecord,
  findBroadcastChannelContext,
  findOrganisationBroadcastRecord,
  findPublicBroadcastRecord,
  listOrganisationBroadcastRecords,
  listPublicBroadcastRecords,
  transitionBroadcastRecord,
  updateBroadcastMetadataRecord,
} from './broadcasts.repository.js';
import type {
  BroadcastCommandName,
  BroadcastDto,
  BroadcastMediaEvent,
  BroadcastStatus,
  BroadcastTransitionResult,
  CreateBroadcastInput,
  PublicBroadcastDto,
  UpdateBroadcastInput,
} from './broadcasts.types.js';

export type CreateBroadcastBody = {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  scheduledStartAt?: unknown;
};

export type UpdateBroadcastBody = {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  expectedVersion?: unknown;
};

export type BroadcastCommandBody = {
  expectedVersion?: unknown;
  scheduledStartAt?: unknown;
};

export type BroadcastMediaEventBody = {
  event?: unknown;
  idempotencyKey?: unknown;
  failureReason?: unknown;
};

const CONTENT_MANAGERS = new Set<OrganisationRole>([
  'owner',
  'admin',
  'broadcaster',
]);

const PUBLIC_FILTER_STATUSES = new Set<BroadcastStatus>([
  'scheduled',
  'starting',
  'live',
  'reconnecting',
  'ending',
  'completed',
]);

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normaliseTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.trim().replace(/\s+/g, ' ');
  return title.length >= 3 && title.length <= 160 ? title : null;
}

function normaliseSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase();
  return slug.length >= 3 &&
    slug.length <= 100 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ? slug
    : null;
}

function normaliseDescription(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const description = value.trim();
  if (description.length > 4_000) return undefined;
  return description.length === 0 ? null : description;
}

function parseFutureDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime() >= Date.now() + 60_000 ? date : null;
}

function parseVersion(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0
    ? value
    : null;
}

function normaliseIdempotencyKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const key = value.trim();
  return key.length >= 8 && key.length <= 128 ? key : null;
}

function normaliseFailureReason(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const reason = value.trim();
  return reason.length >= 2 && reason.length <= 500 ? reason : null;
}

function requestHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
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

async function requireOrganisationRole(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
): Promise<OrganisationRole> {
  if (!validUuid(organisationId)) {
    throw new ApiError(
      404,
      'ORGANISATION_NOT_FOUND',
      'The requested organisation was not found.',
    );
  }

  const role = await findOrganisationRole(db, organisationId, userId);
  if (!role) {
    throw new ApiError(
      404,
      'ORGANISATION_NOT_FOUND',
      'The requested organisation was not found.',
    );
  }
  return role;
}

async function requireContentManager(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
): Promise<OrganisationRole> {
  const role = await requireOrganisationRole(db, organisationId, userId);
  if (!CONTENT_MANAGERS.has(role)) {
    throw new ApiError(
      403,
      'BROADCAST_MANAGEMENT_REQUIRED',
      'Owner, administrator or broadcaster permission is required.',
    );
  }
  return role;
}

function broadcastNotFound(): never {
  throw new ApiError(
    404,
    'BROADCAST_NOT_FOUND',
    'The requested broadcast was not found.',
  );
}

function handleTransitionResult(
  result: BroadcastTransitionResult,
): BroadcastDto {
  if (result.status === 'updated' || result.status === 'replayed') {
    return result.broadcast;
  }
  if (result.status === 'not_found') return broadcastNotFound();
  if (result.status === 'idempotency_conflict') {
    throw new ApiError(
      409,
      'IDEMPOTENCY_KEY_CONFLICT',
      'That idempotency key was already used for a different request.',
    );
  }
  if (result.status === 'version_conflict') {
    throw new ApiError(
      409,
      'BROADCAST_VERSION_CONFLICT',
      'The broadcast changed since it was last read.',
      { currentVersion: result.currentVersion },
    );
  }
  throw new ApiError(
    409,
    'INVALID_BROADCAST_STATUS_TRANSITION',
    `The command is not valid while the broadcast is ${result.currentStatus}.`,
  );
}

export async function createBroadcast(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  userId: string,
  body: CreateBroadcastBody,
): Promise<BroadcastDto> {
  await requireContentManager(db, organisationId, userId);
  if (!validUuid(channelId)) return broadcastNotFound();

  const channel = await findBroadcastChannelContext(
    db,
    organisationId,
    channelId,
  );
  if (!channel) {
    throw new ApiError(404, 'CHANNEL_NOT_FOUND', 'The requested channel was not found.');
  }
  if (channel.status === 'archived' || channel.status === 'suspended') {
    throw new ApiError(
      409,
      'CHANNEL_UNAVAILABLE',
      'Broadcasts cannot be created for an archived or suspended channel.',
    );
  }

  const title = normaliseTitle(body.title);
  const slug = normaliseSlug(body.slug);
  const description = normaliseDescription(body.description);
  const scheduledStartAt =
    body.scheduledStartAt === undefined
      ? null
      : parseFutureDate(body.scheduledStartAt);

  if (
    !title ||
    !slug ||
    (body.description !== undefined && description === undefined) ||
    (body.scheduledStartAt !== undefined && !scheduledStartAt)
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid title, slug, description and future schedule time.',
    );
  }

  if (scheduledStartAt && channel.status !== 'active') {
    throw new ApiError(
      409,
      'CHANNEL_NOT_ACTIVE',
      'The channel must be active before a broadcast can be scheduled.',
    );
  }

  const identifier = randomUUID().replaceAll('-', '');
  const input: CreateBroadcastInput = {
    title,
    slug,
    description: description ?? null,
    scheduledStartAt,
    status: scheduledStartAt ? 'scheduled' : 'draft',
    contributionRoomName: `broadcast-${identifier}`,
    deliveryStreamName: `broadcast-${identifier}`,
  };

  try {
    return await createBroadcastRecord(
      db,
      organisationId,
      channelId,
      userId,
      input,
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(
        409,
        'BROADCAST_SLUG_TAKEN',
        'That broadcast slug is already used in this channel.',
      );
    }
    throw error;
  }
}

export async function listOrganisationBroadcasts(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  userId: string,
): Promise<BroadcastDto[]> {
  await requireOrganisationRole(db, organisationId, userId);
  if (!validUuid(channelId)) return [];
  const channel = await findBroadcastChannelContext(db, organisationId, channelId);
  if (!channel) {
    throw new ApiError(404, 'CHANNEL_NOT_FOUND', 'The requested channel was not found.');
  }
  return listOrganisationBroadcastRecords(db, organisationId, channelId);
}

export async function getOrganisationBroadcast(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  userId: string,
): Promise<BroadcastDto> {
  await requireOrganisationRole(db, organisationId, userId);
  if (!validUuid(broadcastId)) return broadcastNotFound();
  const broadcast = await findOrganisationBroadcastRecord(
    db,
    organisationId,
    broadcastId,
  );
  return broadcast ?? broadcastNotFound();
}

export async function updateBroadcast(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  userId: string,
  body: UpdateBroadcastBody,
): Promise<BroadcastDto> {
  await requireContentManager(db, organisationId, userId);
  const current = await getOrganisationBroadcast(
    db,
    organisationId,
    broadcastId,
    userId,
  );
  if (current.status !== 'draft' && current.status !== 'scheduled') {
    throw new ApiError(
      409,
      'BROADCAST_METADATA_LOCKED',
      'Broadcast metadata can only be changed while draft or scheduled.',
    );
  }

  const expectedVersion = parseVersion(body.expectedVersion);
  if (expectedVersion === null) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'A non-negative expectedVersion is required.',
    );
  }

  const input: UpdateBroadcastInput = {};
  if (body.title !== undefined) {
    const value = normaliseTitle(body.title);
    if (!value) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid title.');
    input.title = value;
  }
  if (body.slug !== undefined) {
    const value = normaliseSlug(body.slug);
    if (!value) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid slug.');
    input.slug = value;
  }
  if (body.description !== undefined) {
    const value = normaliseDescription(body.description);
    if (value === undefined) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid description.');
    }
    input.description = value;
  }
  if (Object.keys(input).length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Provide at least one change.');
  }

  try {
    const result = await updateBroadcastMetadataRecord(
      db,
      organisationId,
      broadcastId,
      expectedVersion,
      input,
    );
    if (result.status === 'not_found') return broadcastNotFound();
    if (result.status === 'version_conflict') {
      throw new ApiError(
        409,
        'BROADCAST_VERSION_CONFLICT',
        'The broadcast changed since it was last read.',
        { currentVersion: result.currentVersion },
      );
    }
    return result.broadcast;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(
        409,
        'BROADCAST_SLUG_TAKEN',
        'That broadcast slug is already used in this channel.',
      );
    }
    throw error;
  }
}

export async function commandBroadcast(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  userId: string,
  command: Extract<BroadcastCommandName, 'schedule' | 'start' | 'cancel' | 'end'>,
  rawIdempotencyKey: unknown,
  body: BroadcastCommandBody,
): Promise<BroadcastDto> {
  await requireContentManager(db, organisationId, userId);
  const expectedVersion = parseVersion(body.expectedVersion);
  const idempotencyKey = normaliseIdempotencyKey(rawIdempotencyKey);
  if (expectedVersion === null || !idempotencyKey) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'expectedVersion and an Idempotency-Key of 8–128 characters are required.',
    );
  }

  const current = await getOrganisationBroadcast(
    db,
    organisationId,
    broadcastId,
    userId,
  );
  const channel = await findBroadcastChannelContext(
    db,
    organisationId,
    current.channelId,
  );
  if (!channel) return broadcastNotFound();

  let scheduledStartAt: Date | null = null;
  if (command === 'schedule') {
    scheduledStartAt = parseFutureDate(body.scheduledStartAt);
    if (!scheduledStartAt) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'A valid future scheduledStartAt is required.',
      );
    }
  }
  if ((command === 'schedule' || command === 'start') && channel.status !== 'active') {
    throw new ApiError(
      409,
      'CHANNEL_NOT_ACTIVE',
      'The channel must be active before scheduling or starting a broadcast.',
    );
  }

  const now = new Date();
  const result = await transitionBroadcastRecord(db, {
    organisationId,
    broadcastId,
    actorUserId: userId,
    command,
    idempotencyKey,
    requestHash: requestHash({ command, expectedVersion, scheduledStartAt }),
    expectedVersion,
    decide: (record) => {
      if (command === 'schedule') {
        if (record.status !== 'draft' && record.status !== 'scheduled') return null;
        return {
          status: 'scheduled',
          scheduledStartAt,
          cancelledAt: null,
          failureReason: null,
        };
      }
      if (command === 'start') {
        if (record.status !== 'draft' && record.status !== 'scheduled') return null;
        return {
          status: 'starting',
          startRequestedAt: now,
          contributionReadyAt: null,
          deliveryReadyAt: null,
          cancelledAt: null,
          failureReason: null,
        };
      }
      if (command === 'cancel') {
        if (
          record.status !== 'draft' &&
          record.status !== 'scheduled' &&
          record.status !== 'starting'
        ) {
          return null;
        }
        return {
          status: 'cancelled',
          cancelledAt: now,
          endedAt: now,
        };
      }
      if (record.status !== 'live' && record.status !== 'reconnecting') {
        return null;
      }
      return {
        status: 'ending',
        endRequestedAt: now,
      };
    },
  });

  return handleTransitionResult(result);
}

export async function applyBroadcastMediaEvent(
  db: DigiStreamDatabase,
  broadcastId: string,
  body: BroadcastMediaEventBody,
): Promise<BroadcastDto> {
  if (!validUuid(broadcastId)) return broadcastNotFound();
  const event = parseMediaEvent(body.event);
  const idempotencyKey = normaliseIdempotencyKey(body.idempotencyKey);
  const failureReason =
    event === 'failed' ? normaliseFailureReason(body.failureReason) : null;

  if (!event || !idempotencyKey || (event === 'failed' && !failureReason)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid media event, idempotencyKey and failureReason when failed.',
    );
  }

  const now = new Date();
  const result = await transitionBroadcastRecord(db, {
    broadcastId,
    actorUserId: null,
    command: event,
    idempotencyKey,
    requestHash: requestHash({ event, failureReason }),
    decide: (record) => {
      if (event === 'contribution_ready') {
        if (record.status !== 'starting' && record.status !== 'reconnecting') return null;
        const live = Boolean(record.deliveryReadyAt);
        return {
          status: live ? 'live' : record.status,
          contributionReadyAt: now,
          liveStartedAt: live ? record.liveStartedAt ?? now : record.liveStartedAt,
        };
      }
      if (event === 'delivery_ready') {
        if (record.status !== 'starting' && record.status !== 'reconnecting') return null;
        const live = Boolean(record.contributionReadyAt);
        return {
          status: live ? 'live' : record.status,
          deliveryReadyAt: now,
          liveStartedAt: live ? record.liveStartedAt ?? now : record.liveStartedAt,
        };
      }
      if (event === 'source_lost') {
        if (record.status !== 'live') return null;
        return {
          status: 'reconnecting',
          contributionReadyAt: null,
        };
      }
      if (event === 'delivery_lost') {
        if (record.status !== 'live') return null;
        return {
          status: 'reconnecting',
          deliveryReadyAt: null,
        };
      }
      if (event === 'failed') {
        if (
          record.status !== 'starting' &&
          record.status !== 'live' &&
          record.status !== 'reconnecting' &&
          record.status !== 'ending'
        ) {
          return null;
        }
        return {
          status: 'failed',
          failureReason,
          endedAt: now,
        };
      }
      if (record.status !== 'ending') return null;
      return {
        status: 'completed',
        endedAt: now,
      };
    },
  });

  return handleTransitionResult(result);
}

function parseMediaEvent(value: unknown): BroadcastMediaEvent | null {
  return value === 'contribution_ready' ||
    value === 'delivery_ready' ||
    value === 'source_lost' ||
    value === 'delivery_lost' ||
    value === 'failed' ||
    value === 'delivery_stopped'
    ? value
    : null;
}

export async function listPublicBroadcasts(
  db: DigiStreamDatabase,
  rawStatus: unknown,
  rawLimit: unknown,
): Promise<PublicBroadcastDto[]> {
  let status: BroadcastStatus | null = null;
  if (rawStatus !== undefined) {
    if (
      typeof rawStatus !== 'string' ||
      !PUBLIC_FILTER_STATUSES.has(rawStatus as BroadcastStatus)
    ) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid public status filter.');
    }
    status = rawStatus as BroadcastStatus;
  }

  const limit = rawLimit === undefined ? 20 : Number.parseInt(String(rawLimit), 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Limit must be between 1 and 50.');
  }

  return listPublicBroadcastRecords(db, status, limit);
}

export async function getPublicBroadcast(
  db: DigiStreamDatabase,
  rawOrganisationSlug: string,
  rawChannelSlug: string,
  rawBroadcastSlug: string,
): Promise<PublicBroadcastDto> {
  const organisationSlug = normaliseSlug(rawOrganisationSlug);
  const channelSlug = normaliseSlug(rawChannelSlug);
  const broadcastSlug = normaliseSlug(rawBroadcastSlug);
  const broadcast =
    organisationSlug && channelSlug && broadcastSlug
      ? await findPublicBroadcastRecord(
          db,
          organisationSlug,
          channelSlug,
          broadcastSlug,
        )
      : null;
  return broadcast ?? broadcastNotFound();
}
