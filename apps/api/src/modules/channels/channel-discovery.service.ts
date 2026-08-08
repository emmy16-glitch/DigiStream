import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { searchPublicChannels, type ChannelDiscoveryCursor } from './channel-discovery.repository.js';

export type ChannelDiscoveryQuery = {
  category?: string;
  organisation?: string;
  q?: string;
  cursor?: string;
  limit?: string;
};

function normaliseSlug(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim().toLowerCase();
  return result.length >= 2 && result.length <= maxLength && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)
    ? result
    : null;
}

function normaliseSearch(value: unknown): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') return null;
  const result = value.trim().replace(/\s+/g, ' ');
  return result.length >= 2 && result.length <= 120 ? result : null;
}

function encodeCursor(cursor: ChannelDiscoveryCursor): string {
  return Buffer.from(JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id }), 'utf8').toString('base64url');
}

function decodeCursor(value: unknown): ChannelDiscoveryCursor | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length < 8 || value.length > 256) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { createdAt?: unknown; id?: unknown };
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') return null;
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(parsed.id)) return null;
    return { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

export async function discoverChannels(database: DatabaseContext, query: ChannelDiscoveryQuery) {
  const category = query.category === undefined ? null : normaliseSlug(query.category, 40);
  if (query.category !== undefined && !category) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid channel category.');
  }

  const organisationSlug = query.organisation === undefined ? null : normaliseSlug(query.organisation, 80);
  if (query.organisation !== undefined && !organisationSlug) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid organisation filter.');
  }

  const search = normaliseSearch(query.q);
  if (query.q !== undefined && !search) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Search must contain between 2 and 120 characters.');
  }

  const cursor = decodeCursor(query.cursor);
  if (query.cursor !== undefined && !cursor) {
    throw new ApiError(400, 'INVALID_CURSOR', 'The discovery cursor is invalid or expired.');
  }

  const limit = query.limit === undefined ? 20 : Number.parseInt(query.limit, 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Limit must be between 1 and 50.');
  }

  const rows = await searchPublicChannels(database, {
    category,
    organisationSlug,
    search,
    cursor,
    limit: limit + 1,
  });
  const hasMore = rows.length > limit;
  const channels = hasMore ? rows.slice(0, limit) : rows;
  const last = channels.at(-1);

  return {
    channels,
    nextCursor: hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
  };
}
