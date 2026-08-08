import {
  boolean,
  index,
  inet,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'suspended',
  'deleted',
]);

export const platformCapabilityEnum = pgEnum('platform_capability', [
  'broadcaster',
  'platform_admin',
]);

export const membershipRoleEnum = pgEnum('membership_role', [
  'owner',
  'admin',
  'broadcaster',
  'moderator',
  'analyst',
]);

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

export const broadcastStatusEnum = pgEnum('broadcast_status', [
  'draft',
  'scheduled',
  'live',
  'ended',
  'cancelled',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    status: userStatusEnum('status').default('active').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export const userProfiles = pgTable(
  'user_profiles',
  {
    userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    username: varchar('username', { length: 30 }).notNull(),
    biography: varchar('biography', { length: 500 }),
    isDiscoverable: boolean('is_discoverable').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_profiles_username_unique').on(table.username),
    index('user_profiles_discoverable_username_idx').on(table.username),
  ],
);

export const userPlatformCapabilities = pgTable(
  'user_platform_capabilities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    capability: platformCapabilityEnum('capability').notNull(),
    grantedByUserId: uuid('granted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    grantedAt: timestamp('granted_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    uniqueIndex('user_platform_capabilities_user_capability_unique').on(table.userId, table.capability),
    index('user_platform_capabilities_active_idx').on(table.capability, table.userId),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    userAgent: varchar('user_agent', { length: 500 }),
    ipAddress: inet('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_sessions_token_hash_unique').on(table.tokenHash),
    index('auth_sessions_user_id_idx').on(table.userId),
    index('auth_sessions_active_expiry_idx').on(table.expiresAt),
  ],
);

export const organisations = pgTable(
  'organisations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 80 }).notNull(),
    createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organisations_slug_unique').on(table.slug),
    index('organisations_created_by_user_idx').on(table.createdByUserId),
  ],
);

export const organisationMemberships = pgTable(
  'organisation_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: membershipRoleEnum('role').notNull(),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('organisation_memberships_org_user_unique').on(table.organisationId, table.userId),
    index('organisation_memberships_user_idx').on(table.userId),
    index('organisation_memberships_org_role_idx').on(table.organisationId, table.role),
  ],
);

export const channels = pgTable(
  'channels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 80 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 40 }),
    status: channelStatusEnum('status').default('draft').notNull(),
    visibility: channelVisibilityEnum('visibility').default('public').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'restrict' }),
    moderatedAt: timestamp('moderated_at', { withTimezone: true, mode: 'date' }),
    moderatedByUserId: uuid('moderated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    moderationReason: varchar('moderation_reason', { length: 500 }),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
    retentionUntil: timestamp('retention_until', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('channels_org_slug_unique').on(table.organisationId, table.slug),
    index('channels_organisation_status_idx').on(table.organisationId, table.status, table.createdAt),
    index('channels_public_discovery_idx').on(table.status, table.visibility, table.category, table.createdAt),
    index('channels_retention_cleanup_idx').on(table.retentionUntil, table.id),
  ],
);

export const broadcasts = pgTable(
  'broadcasts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organisationId: uuid('organisation_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 160 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    status: broadcastStatusEnum('status').default('draft').notNull(),
    scheduledStartAt: timestamp('scheduled_start_at', { withTimezone: true, mode: 'date' }),
    liveStartedAt: timestamp('live_started_at', { withTimezone: true, mode: 'date' }),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('broadcasts_channel_slug_unique').on(table.channelId, table.slug),
    index('broadcasts_organisation_status_idx').on(table.organisationId, table.status),
    index('broadcasts_channel_scheduled_idx').on(table.channelId, table.scheduledStartAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserPlatformCapability = typeof userPlatformCapabilities.$inferSelect;
export type NewUserPlatformCapability = typeof userPlatformCapabilities.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;
export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;
export type OrganisationMembership = typeof organisationMemberships.$inferSelect;
export type Channel = typeof channels.$inferSelect;
export type Broadcast = typeof broadcasts.$inferSelect;
