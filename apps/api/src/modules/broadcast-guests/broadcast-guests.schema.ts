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

export const broadcastGuestInvitations = pgTable(
  'broadcast_guest_invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcastRecords.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    invitedEmail: varchar('invited_email', { length: 320 }),
    displayName: varchar('display_name', { length: 80 }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'date' }),
    admittedAt: timestamp('admitted_at', { withTimezone: true, mode: 'date' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    sessionTokenHash: varchar('session_token_hash', { length: 64 }),
    sessionExpiresAt: timestamp('session_expires_at', {
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
    uniqueIndex('broadcast_guest_invitations_token_unique').on(table.tokenHash),
    uniqueIndex('broadcast_guest_invitations_session_unique').on(
      table.sessionTokenHash,
    ),
    index('broadcast_guest_invitations_broadcast_status_idx').on(
      table.broadcastId,
      table.status,
      table.createdAt,
    ),
  ],
);

export const broadcastCallInRequests = pgTable(
  'broadcast_call_in_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcastRecords.id, { onDelete: 'cascade' }),
    displayName: varchar('display_name', { length: 80 }).notNull(),
    contactEmail: varchar('contact_email', { length: 320 }),
    message: varchar('message', { length: 500 }),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    invitationId: uuid('invitation_id').references(
      () => broadcastGuestInvitations.id,
      { onDelete: 'set null' },
    ),
    decidedByUserId: uuid('decided_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('broadcast_call_in_requests_broadcast_status_idx').on(
      table.broadcastId,
      table.status,
      table.createdAt,
    ),
  ],
);

export type BroadcastGuestInvitationRecord =
  typeof broadcastGuestInvitations.$inferSelect;
export type BroadcastCallInRequestRecord =
  typeof broadcastCallInRequests.$inferSelect;
