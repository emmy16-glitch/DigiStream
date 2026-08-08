import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { organisations, users } from '../../db/schema.js';

export type OrganisationAuditAction =
  | 'organisation.created'
  | 'organisation.updated'
  | 'organisation.invitation.created'
  | 'organisation.invitation.revoked'
  | 'organisation.invitation.accepted'
  | 'organisation.member.role_changed'
  | 'organisation.member.removed';

export const organisationAuditEvents = pgTable(
  'organisation_audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 60 })
      .$type<OrganisationAuditAction>()
      .notNull(),
    details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('organisation_audit_events_org_created_idx').on(
      table.organisationId,
      table.createdAt,
      table.id,
    ),
    index('organisation_audit_events_actor_idx').on(
      table.actorUserId,
      table.createdAt,
    ),
  ],
);
