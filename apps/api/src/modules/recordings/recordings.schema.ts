import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organisations, users } from '../../db/schema.js';
import { channelRecords } from '../channels/channels.schema.js';
import { broadcastRecords } from '../broadcasts/broadcasts.schema.js';

export const recordingStatusEnum = pgEnum('recording_status', [
  'recording',
  'uploading',
  'processing',
  'ready',
  'failed',
  'published',
  'private',
  'archived',
  'deleted',
]);

export const recordingRecords = pgTable(
  'recordings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channelRecords.id, { onDelete: 'cascade' }),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcastRecords.id, { onDelete: 'cascade' }),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    status: recordingStatusEnum('status').default('recording').notNull(),
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    provider: varchar('provider', { length: 80 }).default('media-worker').notNull(),
    providerArtifactId: varchar('provider_artifact_id', { length: 255 }),
    mediaFormat: varchar('media_format', { length: 32 }),
    contentType: varchar('content_type', { length: 100 }),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    durationMs: bigint('duration_ms', { mode: 'number' }),
    checksumSha256: varchar('checksum_sha256', { length: 64 }),
    processingError: varchar('processing_error', { length: 1000 }),
    retryCount: integer('retry_count').default(0).notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true, mode: 'date' }),
    uploadStartedAt: timestamp('upload_started_at', {
      withTimezone: true,
      mode: 'date',
    }),
    processingStartedAt: timestamp('processing_started_at', {
      withTimezone: true,
      mode: 'date',
    }),
    readyAt: timestamp('ready_at', { withTimezone: true, mode: 'date' }),
    publishedAt: timestamp('published_at', {
      withTimezone: true,
      mode: 'date',
    }),
    archivedAt: timestamp('archived_at', {
      withTimezone: true,
      mode: 'date',
    }),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('recordings_broadcast_unique').on(table.broadcastId),
    uniqueIndex('recordings_storage_key_unique').on(table.storageKey),
    uniqueIndex('recordings_provider_artifact_unique').on(
      table.provider,
      table.providerArtifactId,
    ),
    index('recordings_organisation_status_updated_idx').on(
      table.organisationId,
      table.status,
      table.updatedAt,
      table.id,
    ),
    index('recordings_channel_updated_idx').on(
      table.channelId,
      table.updatedAt,
      table.id,
    ),
  ],
);

export type RecordingRecord = typeof recordingRecords.$inferSelect;
export type NewRecordingRecord = typeof recordingRecords.$inferInsert;
