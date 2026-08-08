import { pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organisations, users } from '../../db/schema.js';

export const personalCreatorWorkspaces = pgTable(
  'personal_creator_workspaces',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('personal_creator_workspaces_organisation_unique').on(
      table.organisationId,
    ),
  ],
);
