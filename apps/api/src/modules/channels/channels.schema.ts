import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { organisations, users } from '../../db/schema.js';

export const channelStatusEnum = pgEnum('channel_status', [
  'draft',
  'pending_review',
  'active',
  'suspended',
  'archived',
]);

export const channelVisibilityEnum = pgEnum('channel_visibility', [
  'public',
  'unlisted',
  'private',
]);

export const channelRecords = pgTable(
  'channels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 80 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 40 }),
    status: channelStatusEnum('status').default('draft').notNull(),
    visibility: channelVisibilityEnum('visibility').default('public').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
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
    uniqueIndex('channels_org_slug_unique').on(
      table.organisationId,
      table.slug,
    ),
    index('channels_organisation_status_idx').on(
      table.organisationId,
      table.status,
      table.createdAt,
    ),
    index('channels_public_discovery_idx').on(
      table.status,
      table.visibility,
      table.category,
      table.createdAt,
    ),
  ],
);
