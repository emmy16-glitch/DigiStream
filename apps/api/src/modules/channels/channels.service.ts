import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import {
  createChannelRecord,
  findOrganisationChannelRecord,
  findPublicChannelRecord,
  listOrganisationChannelRecords,
  listPublicChannelRecords,
  updateChannelRecord,
} from './channels.repository.js';
import type {
  ChannelDto,
  ChannelStatus,
  ChannelVisibility,
  CreateChannelInput,
  PublicChannelDto,
  UpdateChannelInput,
} from './channels.types.js';

export type CreateChannelBody = {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  category?: unknown;
  visibility?: unknown;
};

export type UpdateChannelBody = CreateChannelBody & {
  status?: unknown;
};

const CONTENT_MANAGERS = new Set<OrganisationRole>([
  'owner',
  'admin',
  'broadcaster',
]);

const STATUS_TRANSITIONS: Record<ChannelStatus, readonly ChannelStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['draft', 'active'],
  active: ['archived'],
  suspended: ['archived'],
  archived: [],
};

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normaliseName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 120 ? name : null;
}

function normaliseSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase();
  return slug.length >= 3 &&
    slug.length <= 80 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ? slug
    : null;
}

function normaliseDescription(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const description = value.trim();
  if (description.length > 2_000) return undefined;
  return description.length === 0 ? null : description;
}

function normaliseCategory(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const category = value.trim().toLowerCase();
  if (category.length === 0) return null;
  return category.length >= 2 &&
    category.length <= 40 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)
    ? category
    : undefined;
}

function parseVisibility(value: unknown): ChannelVisibility | null {
  return value === 'public' || value === 'unlisted' || value === 'private'
    ? value
    : null;
}

function parseStatus(value: unknown): ChannelStatus | null {
  return value === 'draft' ||
    value === 'pending_review' ||
    value === 'active' ||
    value === 'suspended' ||
    value === 'archived'
    ? value
    : null;
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

function channelNotFound(): never {
  throw new ApiError(
    404,
    'CHANNEL_NOT_FOUND',
    'The requested channel was not found.',
  );
}

export async function createChannel(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
  body: CreateChannelBody,
): Promise<ChannelDto> {
  const role = await requireOrganisationRole(db, organisationId, userId);
  if (!CONTENT_MANAGERS.has(role)) {
    throw new ApiError(
      403,
      'CHANNEL_MANAGEMENT_REQUIRED',
      'Owner, administrator or broadcaster permission is required.',
    );
  }

  const name = normaliseName(body.name);
  const slug = normaliseSlug(body.slug);
  const description = normaliseDescription(body.description);
  const category = normaliseCategory(body.category);
  const visibility =
    body.visibility === undefined ? 'public' : parseVisibility(body.visibility);

  if (
    !name ||
    !slug ||
    visibility === null ||
    (body.description !== undefined && description === undefined) ||
    (body.category !== undefined && category === undefined)
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid name, slug, description, category and visibility.',
    );
  }

  const input: CreateChannelInput = {
    name,
    slug,
    description: description ?? null,
    category: category ?? null,
    visibility,
  };

  try {
    return await createChannelRecord(db, organisationId, userId, input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(
        409,
        'CHANNEL_SLUG_TAKEN',
        'That channel slug is already used in this organisation.',
      );
    }
    throw error;
  }
}

export async function listOrganisationChannels(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
): Promise<ChannelDto[]> {
  await requireOrganisationRole(db, organisationId, userId);
  return listOrganisationChannelRecords(db, organisationId);
}

export async function getOrganisationChannel(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  userId: string,
): Promise<ChannelDto> {
  await requireOrganisationRole(db, organisationId, userId);
  if (!validUuid(channelId)) return channelNotFound();
  const channel = await findOrganisationChannelRecord(db, organisationId, channelId);
  return channel ?? channelNotFound();
}

export async function updateChannel(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  userId: string,
  body: UpdateChannelBody,
): Promise<ChannelDto> {
  const role = await requireOrganisationRole(db, organisationId, userId);
  if (!validUuid(channelId)) return channelNotFound();

  const current = await findOrganisationChannelRecord(db, organisationId, channelId);
  if (!current) return channelNotFound();

  if (!CONTENT_MANAGERS.has(role)) {
    throw new ApiError(
      403,
      'CHANNEL_MANAGEMENT_REQUIRED',
      'Owner, administrator or broadcaster permission is required.',
    );
  }

  const input: UpdateChannelInput = {};

  if (body.name !== undefined) {
    const value = normaliseName(body.name);
    if (!value) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid channel name.');
    input.name = value;
  }
  if (body.slug !== undefined) {
    const value = normaliseSlug(body.slug);
    if (!value) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid channel slug.');
    input.slug = value;
  }
  if (body.description !== undefined) {
    const value = normaliseDescription(body.description);
    if (value === undefined) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid channel description.');
    }
    input.description = value;
  }
  if (body.category !== undefined) {
    const value = normaliseCategory(body.category);
    if (value === undefined) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid channel category.');
    }
    input.category = value;
  }
  if (body.visibility !== undefined) {
    const value = parseVisibility(body.visibility);
    if (!value) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid visibility.');
    input.visibility = value;
  }
  if (body.status !== undefined) {
    if (role !== 'owner' && role !== 'admin') {
      throw new ApiError(
        403,
        'CHANNEL_APPROVAL_REQUIRED',
        'Owner or administrator permission is required to change channel status.',
      );
    }
    const value = parseStatus(body.status);
    if (!value) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid channel status.');
    if (value === 'suspended' || (current.status === 'suspended' && value === 'active')) {
      throw new ApiError(
        409,
        'CHANNEL_MODERATION_ROUTE_REQUIRED',
        'Use the channel moderation action so the moderation reason is recorded.',
      );
    }
    if (
      value !== current.status &&
      !STATUS_TRANSITIONS[current.status].includes(value)
    ) {
      throw new ApiError(
        409,
        'INVALID_CHANNEL_STATUS_TRANSITION',
        `A channel cannot move from ${current.status} to ${value}.`,
      );
    }
    input.status = value;
  }

  if (Object.keys(input).length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Provide at least one channel change.');
  }

  try {
    const updated = await updateChannelRecord(
      db,
      organisationId,
      channelId,
      input,
    );
    return updated ?? channelNotFound();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(
        409,
        'CHANNEL_SLUG_TAKEN',
        'That channel slug is already used in this organisation.',
      );
    }
    throw error;
  }
}

export async function listPublicChannels(
  db: DigiStreamDatabase,
  rawCategory: unknown,
  rawLimit: unknown,
): Promise<PublicChannelDto[]> {
  const category = normaliseCategory(rawCategory);
  if (rawCategory !== undefined && category === undefined) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid channel category.');
  }

  const parsedLimit =
    rawLimit === undefined ? 20 : Number.parseInt(String(rawLimit), 10);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Limit must be between 1 and 50.');
  }

  return listPublicChannelRecords(db, category ?? null, parsedLimit);
}

export async function getPublicChannel(
  db: DigiStreamDatabase,
  rawOrganisationSlug: string,
  rawChannelSlug: string,
): Promise<PublicChannelDto> {
  const organisationSlug = normaliseSlug(rawOrganisationSlug);
  const channelSlug = normaliseSlug(rawChannelSlug);
  const channel =
    organisationSlug && channelSlug
      ? await findPublicChannelRecord(db, organisationSlug, channelSlug)
      : null;
  return channel ?? channelNotFound();
}
