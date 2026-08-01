import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { recordingRecords } from './recordings.schema.js';

export const recordingProcessingJobStateEnum = pgEnum(
  'recording_processing_job_state',
  ['pending', 'leased', 'completed', 'dead'],
);

export const recordingProcessingJobs = pgTable(
  'recording_processing_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordingRecords.id, { onDelete: 'cascade' }),
    state: recordingProcessingJobStateEnum('state').default('pending').notNull(),
    attemptCount: integer('attempt_count').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(5).notNull(),
    nextAttemptAt: timestamp('next_attempt_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    leaseOwner: varchar('lease_owner', { length: 100 }),
    leaseTokenHash: varchar('lease_token_hash', { length: 64 }),
    leaseExpiresAt: timestamp('lease_expires_at', {
      withTimezone: true,
      mode: 'date',
    }),
    lastHeartbeatAt: timestamp('last_heartbeat_at', {
      withTimezone: true,
      mode: 'date',
    }),
    lastFailureCode: varchar('last_failure_code', { length: 100 }),
    lastFailureMessage: varchar('last_failure_message', { length: 1000 }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('recording_processing_jobs_recording_unique').on(
      table.recordingId,
    ),
    index('recording_processing_jobs_claim_idx').on(
      table.state,
      table.nextAttemptAt,
      table.createdAt,
      table.id,
    ),
    index('recording_processing_jobs_lease_expiry_idx').on(
      table.leaseExpiresAt,
      table.id,
    ),
  ],
);

export type RecordingProcessingJob =
  typeof recordingProcessingJobs.$inferSelect;
