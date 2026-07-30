import {
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
import { channels, organisations, users } from '../../db/schema.js';

export const broadcastLifecycleStatusEnum = pgEnum('broadcast_status', [
  'draft',
  'scheduled',
  'starting',
  'live',
  'reconnecting',
  'ending',
  'completed',
  'cancelled',
  'failed',
]);

export const broadcastRecords = pgTable(
  'broadcasts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    status: broadcastLifecycleStatusEnum('status').default('draft').notNull(),
    scheduledStartAt: timestamp('scheduled_start_at', {
      withTimezone: true,
      mode: 'date',
    }),
    startRequestedAt: timestamp('start_requested_at', {
      withTimezone: true,
      mode: 'date',
    }),
    liveStartedAt: timestamp('live_started_at', {
      withTimezone: true,
      mode: 'date',
    }),
    endRequestedAt: timestamp('end_requested_at', {
      withTimezone: true,
      mode: 'date',
    }),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    cancelledAt: timestamp('cancelled_at', {
      withTimezone: true,
      mode: 'date',
    }),
    contributionRoomName: varchar('contribution_room_name', {
      length: 160,
    }).notNull(),
    deliveryStreamName: varchar('delivery_stream_name', {
      length: 160,
    }).notNull(),
    contributionReadyAt: timestamp('contribution_ready_at', {
      withTimezone: true,
      mode: 'date',
    }),
    deliveryReadyAt: timestamp('delivery_ready_at', {
      withTimezone: true,
      mode: 'date',
    }),
    failureReason: varchar('failure_reason', { length: 500 }),
    lifecycleVersion: integer('lifecycle_version').default(0).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('broadcasts_channel_slug_unique').on(
      table.channelId,
      table.slug,
    ),
    uniqueIndex('broadcasts_contribution_room_unique').on(
      table.contributionRoomName,
    ),
    uniqueIndex('broadcasts_delivery_stream_unique').on(
      table.deliveryStreamName,
    ),
    index('broadcasts_organisation_status_idx').on(
      table.organisationId,
      table.status,
    ),
    index('broadcasts_channel_scheduled_idx').on(
      table.channelId,
      table.scheduledStartAt,
    ),
    index('broadcasts_public_schedule_idx').on(
      table.status,
      table.scheduledStartAt,
      table.createdAt,
    ),
  ],
);

export const broadcastLifecycleCommands = pgTable(
  'broadcast_lifecycle_commands',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcastRecords.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    command: varchar('command', { length: 40 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    resultStatus: broadcastLifecycleStatusEnum('result_status').notNull(),
    resultVersion: integer('result_version').notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('broadcast_lifecycle_commands_broadcast_key_unique').on(
      table.broadcastId,
      table.idempotencyKey,
    ),
    index('broadcast_lifecycle_commands_broadcast_created_idx').on(
      table.broadcastId,
      table.createdAt,
    ),
  ],
);
