import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { channelRecords } from '../channels/channels.schema.js';
import { broadcastRecords } from '../broadcasts/broadcasts.schema.js';
import { recordingRecords, type RecordingRecord } from './recordings.schema.js';
import type { RecordingDto, RecordingStatus } from './recordings.types.js';

export type RecordingBroadcastContext = {
  id: string;
  organisationId: string;
  channelId: string;
  status: string;
};

export type RecordingArtifactRecord = {
  id: string;
  organisationId: string;
  channelId: string;
  broadcastId: string;
  status: RecordingStatus;
  storageKey: string;
  provider: string;
  providerArtifactId: string | null;
  mediaFormat: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  durationMs: number | null;
  checksumSha256: string | null;
  readyAt: Date | null;
  broadcastTitle: string;
  broadcastSlug: string;
  channelSlug: string;
};

export type RecordingTransitionResult =
  | { status: 'updated'; recording: RecordingDto }
  | { status: 'not_found' }
  | { status: 'invalid_state'; currentStatus: RecordingStatus };

type JoinedRecordingRow = RecordingRecord & {
  broadcastTitle: string;
  broadcastSlug: string;
  broadcastStatus: string;
  broadcastEndedAt: Date | null;
  channelName: string;
  channelSlug: string;
};

function toRecordingDto(row: JoinedRecordingRow): RecordingDto {
  const artifactReady =
    row.readyAt !== null &&
    ['ready', 'published', 'private', 'archived'].includes(row.status);
  const replayAvailable =
    artifactReady && (row.status === 'published' || row.status === 'private');

  return {
    id: row.id,
    organisationId: row.organisationId,
    channelId: row.channelId,
    broadcastId: row.broadcastId,
    requestedByUserId: row.requestedByUserId,
    status: row.status,
    mediaFormat: row.mediaFormat,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    durationMs: row.durationMs,
    checksumSha256: row.checksumSha256,
    processingError: row.processingError,
    retryCount: row.retryCount,
    capturedAt: row.capturedAt,
    uploadStartedAt: row.uploadStartedAt,
    processingStartedAt: row.processingStartedAt,
    readyAt: row.readyAt,
    publishedAt: row.publishedAt,
    archivedAt: row.archivedAt,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    broadcast: {
      title: row.broadcastTitle,
      slug: row.broadcastSlug,
      status: row.broadcastStatus,
      endedAt: row.broadcastEndedAt,
    },
    channel: {
      name: row.channelName,
      slug: row.channelSlug,
    },
    artifactReady,
    replayAvailable,
    downloadAvailable: replayAvailable,
  };
}

function recordingSelection() {
  return {
    ...getTableColumns(recordingRecords),
    broadcastTitle: broadcastRecords.title,
    broadcastSlug: broadcastRecords.slug,
    broadcastStatus: broadcastRecords.status,
    broadcastEndedAt: broadcastRecords.endedAt,
    channelName: channelRecords.name,
    channelSlug: channelRecords.slug,
  };
}

export async function findRecordingBroadcastContext(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
): Promise<RecordingBroadcastContext | null> {
  const [row] = await db
    .select({
      id: broadcastRecords.id,
      organisationId: broadcastRecords.organisationId,
      channelId: broadcastRecords.channelId,
      status: broadcastRecords.status,
    })
    .from(broadcastRecords)
    .where(
      and(
        eq(broadcastRecords.id, broadcastId),
        eq(broadcastRecords.organisationId, organisationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function createRecordingRecord(
  db: DigiStreamDatabase,
  options: {
    organisationId: string;
    channelId: string;
    broadcastId: string;
    requestedByUserId: string;
    storageKey: string;
  },
): Promise<{ recording: RecordingDto; replayed: boolean }> {
  const inserted = await db
    .insert(recordingRecords)
    .values({
      ...options,
      status: 'recording',
      provider: 'media-worker',
    })
    .onConflictDoNothing({ target: recordingRecords.broadcastId })
    .returning({ id: recordingRecords.id });

  const recording = await findRecordingByBroadcastRecord(
    db,
    options.organisationId,
    options.broadcastId,
  );
  if (!recording) throw new Error('Recording insertion returned no record.');

  return { recording, replayed: inserted.length === 0 };
}

export async function listOrganisationRecordingRecords(
  db: DigiStreamDatabase,
  organisationId: string,
  limit: number,
): Promise<RecordingDto[]> {
  const rows = await db
    .select(recordingSelection())
    .from(recordingRecords)
    .innerJoin(
      broadcastRecords,
      eq(recordingRecords.broadcastId, broadcastRecords.id),
    )
    .innerJoin(channelRecords, eq(recordingRecords.channelId, channelRecords.id))
    .where(eq(recordingRecords.organisationId, organisationId))
    .orderBy(desc(recordingRecords.updatedAt), desc(recordingRecords.id))
    .limit(limit);

  return rows.map((row) => toRecordingDto(row as JoinedRecordingRow));
}

export async function findOrganisationRecordingRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  recordingId: string,
): Promise<RecordingDto | null> {
  const [row] = await db
    .select(recordingSelection())
    .from(recordingRecords)
    .innerJoin(
      broadcastRecords,
      eq(recordingRecords.broadcastId, broadcastRecords.id),
    )
    .innerJoin(channelRecords, eq(recordingRecords.channelId, channelRecords.id))
    .where(
      and(
        eq(recordingRecords.id, recordingId),
        eq(recordingRecords.organisationId, organisationId),
      ),
    )
    .limit(1);

  return row ? toRecordingDto(row as JoinedRecordingRow) : null;
}

export async function findRecordingByBroadcastRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
): Promise<RecordingDto | null> {
  const [row] = await db
    .select(recordingSelection())
    .from(recordingRecords)
    .innerJoin(
      broadcastRecords,
      eq(recordingRecords.broadcastId, broadcastRecords.id),
    )
    .innerJoin(channelRecords, eq(recordingRecords.channelId, channelRecords.id))
    .where(
      and(
        eq(recordingRecords.broadcastId, broadcastId),
        eq(recordingRecords.organisationId, organisationId),
      ),
    )
    .limit(1);

  return row ? toRecordingDto(row as JoinedRecordingRow) : null;
}

export async function findRecordingArtifactRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  recordingId: string,
): Promise<RecordingArtifactRecord | null> {
  const [row] = await db
    .select({
      id: recordingRecords.id,
      organisationId: recordingRecords.organisationId,
      channelId: recordingRecords.channelId,
      broadcastId: recordingRecords.broadcastId,
      status: recordingRecords.status,
      storageKey: recordingRecords.storageKey,
      provider: recordingRecords.provider,
      providerArtifactId: recordingRecords.providerArtifactId,
      mediaFormat: recordingRecords.mediaFormat,
      contentType: recordingRecords.contentType,
      sizeBytes: recordingRecords.sizeBytes,
      durationMs: recordingRecords.durationMs,
      checksumSha256: recordingRecords.checksumSha256,
      readyAt: recordingRecords.readyAt,
      broadcastTitle: broadcastRecords.title,
      broadcastSlug: broadcastRecords.slug,
      channelSlug: channelRecords.slug,
    })
    .from(recordingRecords)
    .innerJoin(
      broadcastRecords,
      eq(recordingRecords.broadcastId, broadcastRecords.id),
    )
    .innerJoin(channelRecords, eq(recordingRecords.channelId, channelRecords.id))
    .where(
      and(
        eq(recordingRecords.id, recordingId),
        eq(recordingRecords.organisationId, organisationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function transitionRecordingRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  recordingId: string,
  decide: (
    current: RecordingRecord,
  ) => Partial<typeof recordingRecords.$inferInsert> | null,
): Promise<RecordingTransitionResult> {
  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select id from recordings where id = ${recordingId} and organisation_id = ${organisationId} for update`,
    );

    const [current] = await transaction
      .select()
      .from(recordingRecords)
      .where(
        and(
          eq(recordingRecords.id, recordingId),
          eq(recordingRecords.organisationId, organisationId),
        ),
      )
      .limit(1);

    if (!current) return { status: 'not_found' };
    const patch = decide(current);
    if (!patch) {
      return { status: 'invalid_state', currentStatus: current.status };
    }

    await transaction
      .update(recordingRecords)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(recordingRecords.id, current.id));

    const [row] = await transaction
      .select(recordingSelection())
      .from(recordingRecords)
      .innerJoin(
        broadcastRecords,
        eq(recordingRecords.broadcastId, broadcastRecords.id),
      )
      .innerJoin(channelRecords, eq(recordingRecords.channelId, channelRecords.id))
      .where(eq(recordingRecords.id, current.id))
      .limit(1);

    if (!row) throw new Error('Updated recording could not be reloaded.');
    return {
      status: 'updated',
      recording: toRecordingDto(row as JoinedRecordingRow),
    };
  });
}
