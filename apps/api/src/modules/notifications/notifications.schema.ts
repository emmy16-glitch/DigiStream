import { boolean, index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from '../../db/schema.js';

export const userNotifications = pgTable(
  'user_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    body: varchar('body', { length: 500 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('user_notifications_user_created_idx').on(
      table.userId,
      table.createdAt,
      table.id,
    ),
    index('user_notifications_user_active_created_idx').on(
      table.userId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const userNotificationPreferences = pgTable('user_notification_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  realtimeDeliveryEnabled: boolean('realtime_delivery_enabled').default(true).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export type UserNotificationRecord = typeof userNotifications.$inferSelect;
export type UserNotificationPreferenceRecord = typeof userNotificationPreferences.$inferSelect;
