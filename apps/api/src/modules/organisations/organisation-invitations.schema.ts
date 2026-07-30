import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import {
  membershipRoleEnum,
  organisations,
  users,
} from '../../db/schema.js';

export const organisationInvitations = pgTable(
  'organisation_invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 320 }).notNull(),
    role: membershipRoleEnum('role').notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    acceptedAt: timestamp('accepted_at', {
      withTimezone: true,
      mode: 'date',
    }),
    revokedAt: timestamp('revoked_at', {
      withTimezone: true,
      mode: 'date',
    }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('organisation_invitations_token_hash_unique').on(
      table.tokenHash,
    ),
    index('organisation_invitations_organisation_idx').on(
      table.organisationId,
      table.createdAt,
    ),
    index('organisation_invitations_pending_expiry_idx').on(table.expiresAt),
  ],
);

export type OrganisationInvitation =
  typeof organisationInvitations.$inferSelect;
export type NewOrganisationInvitation =
  typeof organisationInvitations.$inferInsert;
