import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { RecordingAccessManager } from './recording-access.js';
import {
  findMemberReplayRecord,
  findPublicReplayRecord,
  listPublicReplayRecords,
  type ReplayRecord,
  type ReplayVisibility,
} from './public-replays.repository.js';

export type ReplayDto = {
  id: string;
  recordingId: string;
  organisationId: string;
  channelId: string;
  broadcastId: string;
  title: string;
  slug: string;
  description: string | null;
  endedAt: Date | null;
  publishedAt: Date | null;
  media: {
    format: string;
    contentType: string;
    sizeBytes: number;
    durationMs: number;
  };
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    visibility: ReplayVisibility;
  };
  access: 'public' | 'unlisted' | 'member';
  updatedAt: Date;
};

function replayNotFound(): never {
  throw new ApiError(404, 'REPLAY_NOT_FOUND', 'The requested replay was not found.');
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function validSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;
}

function parseLimit(value: unknown): number {
  const parsed = value === undefined ? 40 : Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Limit must be between 1 and 100.');
  }
  return parsed;
}

function toReplayDto(
  replay: ReplayRecord,
  access: ReplayDto['access'],
): ReplayDto {
  return {
    id: replay.recordingId,
    recordingId: replay.recordingId,
    organisationId: replay.organisationId,
    channelId: replay.channelId,
    broadcastId: replay.broadcastId,
    title: replay.title,
    slug: replay.broadcastSlug,
    description: replay.description,
    endedAt: replay.endedAt,
    publishedAt: replay.publishedAt,
    media: {
      format: replay.mediaFormat,
      contentType: replay.contentType,
      sizeBytes: replay.sizeBytes,
      durationMs: replay.durationMs,
    },
    organisation: {
      id: replay.organisationId,
      name: replay.organisationName,
      slug: replay.organisationSlug,
    },
    channel: {
      id: replay.channelId,
      name: replay.channelName,
      slug: replay.channelSlug,
      category: replay.channelCategory,
      visibility: replay.channelVisibility,
    },
    access,
    updatedAt: replay.updatedAt,
  };
}

async function loadPublicReplay(
  context: DatabaseContext,
  organisationSlug: string,
  channelSlug: string,
  broadcastSlug: string,
): Promise<ReplayRecord> {
  if (
    !validSlug(organisationSlug) ||
    !validSlug(channelSlug) ||
    !validSlug(broadcastSlug)
  ) {
    return replayNotFound();
  }
  return (
    (await findPublicReplayRecord(
      context.pool,
      organisationSlug,
      channelSlug,
      broadcastSlug,
    )) ?? replayNotFound()
  );
}

export async function listPublicReplays(
  context: DatabaseContext,
  rawLimit: unknown,
): Promise<ReplayDto[]> {
  const records = await listPublicReplayRecords(context.pool, parseLimit(rawLimit));
  return records.map((record) => toReplayDto(record, 'public'));
}

export async function getPublicReplay(
  context: DatabaseContext,
  organisationSlug: string,
  channelSlug: string,
  broadcastSlug: string,
): Promise<ReplayDto> {
  const replay = await loadPublicReplay(
    context,
    organisationSlug,
    channelSlug,
    broadcastSlug,
  );
  return toReplayDto(
    replay,
    replay.channelVisibility === 'unlisted' ? 'unlisted' : 'public',
  );
}

export async function createPublicReplayAccess(
  context: DatabaseContext,
  accessManager: RecordingAccessManager,
  organisationSlug: string,
  channelSlug: string,
  broadcastSlug: string,
): Promise<{
  access: { mode: 'playback'; url: string; expiresAt: Date };
}> {
  const replay = await loadPublicReplay(
    context,
    organisationSlug,
    channelSlug,
    broadcastSlug,
  );
  const minted = accessManager.mint({
    organisationId: replay.organisationId,
    recordingId: replay.recordingId,
    mode: 'playback',
  });
  return {
    access: {
      mode: 'playback',
      url: `/api/v1/recording-media?token=${encodeURIComponent(minted.token)}`,
      expiresAt: minted.grant.expiresAt,
    },
  };
}

export async function getMemberReplay(
  context: DatabaseContext,
  organisationId: string,
  recordingId: string,
  userId: string,
): Promise<ReplayDto> {
  if (!validUuid(organisationId) || !validUuid(recordingId)) {
    return replayNotFound();
  }
  const role = await findOrganisationRole(context.db, organisationId, userId);
  if (!role) return replayNotFound();
  const replay = await findMemberReplayRecord(
    context.pool,
    organisationId,
    recordingId,
  );
  return replay ? toReplayDto(replay, 'member') : replayNotFound();
}
