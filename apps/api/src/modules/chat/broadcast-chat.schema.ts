import {
  index,
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

export type BroadcastChatMessageRecord =
  typeof broadcastChatMessages.$inferSelect;
