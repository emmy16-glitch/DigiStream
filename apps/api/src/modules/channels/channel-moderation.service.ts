import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import {
  findChannelIncludingDeleted,
  restoreDeletedChannelRecord,
  restoreSuspendedChannelRecord,
  softDeleteChannelRecord,
  suspendChannelRecord,
} from './channel-moderation.repository.js';

export type ChannelModerationBody = {
  action?: unknown;
  reason?: unknown;
};

export type ChannelDeletionBody = {
  reason?: unknown;
};

const MODERATION_ROLES = new Set<OrganisationRole>(['owner', 'admin', 'moderator']);
const DELETION_ROLES = new Set<OrganisationRole>(['owner', 'admin']);
const RETENTION_DAYS = 30;

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normaliseReason(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const reason = value.trim().replace(/\s+/g, ' ');
  return reason.length >= 3 && reason.length <= 500 ? reason : null;
}

function notFound(code: 'ORGANISATION_NOT_FOUND' | 'CHANNEL_NOT_FOUND'): never {
  throw new ApiError(
    404,
    code,
    code === 'ORGANISATION_NOT_FOUND'
      ? 'The requested organisation was not found.'
      : 'The requested channel was not found.',
  );
}

async function requireRole(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
): Promise<OrganisationRole> {
  if (!validUuid(organisationId)) return notFound('ORGANISATION_NOT_FOUND');
  const role = await findOrganisationRole(db, organisationId, userId);
  return role ?? notFound('ORGANISATION_NOT_FOUND');
}

async function requireChannel(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
) {
  if (!validUuid(channelId)) return notFound('CHANNEL_NOT_FOUND');
  const channel = await findChannelIncludingDeleted(db, organisationId, channelId);
  return channel ?? notFound('CHANNEL_NOT_FOUND');
}

export async function moderateChannel(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  userId: string,
  body: ChannelModerationBody,
) {
  const role = await requireRole(db, organisationId, userId);
  if (!MODERATION_ROLES.has(role)) {
    throw new ApiError(403, 'CHANNEL_MODERATION_REQUIRED', 'Owner, administrator or moderator permission is required.');
  }

  const reason = normaliseReason(body.reason);
  if (!reason || (body.action !== 'suspend' && body.action !== 'restore')) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Provide a moderation action and a reason between 3 and 500 characters.');
  }

  const current = await requireChannel(db, organisationId, channelId);
  if (current.deletedAt) return notFound('CHANNEL_NOT_FOUND');

  if (body.action === 'suspend') {
    if (current.status === 'suspended') return current;
    if (current.status !== 'active') {
      throw new ApiError(409, 'INVALID_CHANNEL_MODERATION_STATE', 'Only an active channel can be suspended.');
    }
    return (await suspendChannelRecord(db, organisationId, channelId, userId, reason)) ?? notFound('CHANNEL_NOT_FOUND');
  }

  if (current.status === 'active') return current;
  if (current.status !== 'suspended') {
    throw new ApiError(409, 'INVALID_CHANNEL_MODERATION_STATE', 'Only a suspended channel can be restored to active.');
  }
  return (await restoreSuspendedChannelRecord(db, organisationId, channelId, userId, reason)) ?? notFound('CHANNEL_NOT_FOUND');
}

export async function softDeleteChannel(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  userId: string,
  body: ChannelDeletionBody,
) {
  const role = await requireRole(db, organisationId, userId);
  if (!DELETION_ROLES.has(role)) {
    throw new ApiError(403, 'CHANNEL_DELETION_REQUIRED', 'Owner or administrator permission is required.');
  }

  const reason = normaliseReason(body.reason);
  if (!reason) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Provide a deletion reason between 3 and 500 characters.');
  }

  const current = await requireChannel(db, organisationId, channelId);
  if (current.deletedAt) return current;

  const retentionUntil = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return (await softDeleteChannelRecord(db, organisationId, channelId, userId, reason, retentionUntil)) ?? notFound('CHANNEL_NOT_FOUND');
}

export async function restoreDeletedChannel(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  userId: string,
  body: ChannelDeletionBody,
) {
  const role = await requireRole(db, organisationId, userId);
  if (!DELETION_ROLES.has(role)) {
    throw new ApiError(403, 'CHANNEL_DELETION_REQUIRED', 'Owner or administrator permission is required.');
  }

  const reason = normaliseReason(body.reason);
  if (!reason) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Provide a restoration reason between 3 and 500 characters.');
  }

  const current = await requireChannel(db, organisationId, channelId);
  if (!current.deletedAt) return current;
  if (!current.retentionUntil || current.retentionUntil.getTime() <= Date.now()) {
    throw new ApiError(409, 'CHANNEL_RETENTION_EXPIRED', 'The channel retention window has expired and it can no longer be restored.');
  }

  return (await restoreDeletedChannelRecord(db, organisationId, channelId, userId, reason)) ?? notFound('CHANNEL_NOT_FOUND');
}
