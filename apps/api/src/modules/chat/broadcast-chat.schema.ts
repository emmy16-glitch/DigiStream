import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organisations, users } from '../../db/schema.js';
import { broadcastRecords } from '../broadcasts/broadcasts.schema.js';

export const broadcastChatMessages = pgTable(
  'broadcast_chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcastRecords.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    authorDisplayName: varchar('author_display_name', { length: 100 }).notNull(),
    clientMessageId: uuid('client_message_id').notNull(),
    body: varchar('body', { length: 1000 }).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('broadcast_chat_messages_author_client_unique').on(
      table.broadcastId,
      table.authorUserId,
      table.clientMessageId,
    ),
    index('broadcast_chat_messages_broadcast_created_idx').on(
      table.broadcastId,
      table.createdAt,
      table.id,
    ),
    index('broadcast_chat_messages_organisation_created_idx').on(
      table.organisationId,
      table.createdAt,
    ),
  ],
);

export const broadcastChatSettings = pgTable(
  'broadcast_chat_settings',
  {
    broadcastId: uuid('broadcast_id')
      .primaryKey()
      .references(() => broadcastRecords.id, { onDelete: 'cascade' }),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    chatDisabled: boolean('chat_disabled').default(false).notNull(),
    slowModeSeconds: integer('slow_mode_seconds').default(0).notNull(),
    updatedByUserId: uuid('updated_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('broadcast_chat_settings_organisation_idx').on(
      table.organisationId,
      table.updatedAt,
    ),
  ],
);

export const broadcastChatUserRestrictions = pgTable(
  'broadcast_chat_user_restrictions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcastRecords.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mutedUntil: timestamp('muted_until', {
      withTimezone: true,
      mode: 'date',
    }),
    blockedAt: timestamp('blocked_at', {
      withTimezone: true,
      mode: 'date',
    }),
    reason: varchar('reason', { length: 500 }),
    updatedByUserId: uuid('updated_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('broadcast_chat_user_restrictions_broadcast_user_unique').on(
      table.broadcastId,
      table.userId,
    ),
    index('broadcast_chat_user_restrictions_organisation_idx').on(
      table.organisationId,
      table.updatedAt,
    ),
  ],
);

export const broadcastChatReports = pgTable(
  'broadcast_chat_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcastRecords.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => broadcastChatMessages.id, { onDelete: 'cascade' }),
    reporterUserId: uuid('reporter_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: varchar('reason', { length: 500 }).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('broadcast_chat_reports_message_reporter_unique').on(
      table.messageId,
      table.reporterUserId,
    ),
    index('broadcast_chat_reports_broadcast_created_idx').on(
      table.broadcastId,
      table.createdAt,
      table.id,
    ),
  ],
);

export type BroadcastChatMessageRecord =
  typeof broadcastChatMessages.$inferSelect;
