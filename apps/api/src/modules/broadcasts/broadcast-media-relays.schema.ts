import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { broadcastRecords } from './broadcasts.schema.js';

export const mediaRelayProtocolEnum = pgEnum('media_relay_protocol', [
  'rtmp',
  'srt',
]);

export const mediaRelayStatusEnum = pgEnum('media_relay_status', [
  'starting',
  'active',
  'stopping',
  'stopped',
  'failed',
]);

export const broadcastMediaRelays = pgTable(
  'broadcast_media_relays',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcastRecords.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 40 })
      .default('livekit_egress')
      .notNull(),
    externalId: varchar('external_id', { length: 160 }),
    protocol: mediaRelayProtocolEnum('protocol').notNull(),
    status: mediaRelayStatusEnum('status').default('starting').notNull(),
    targetHost: varchar('target_host', { length: 255 }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
    stoppedAt: timestamp('stopped_at', { withTimezone: true, mode: 'date' }),
    lastCheckedAt: timestamp('last_checked_at', {
      withTimezone: true,
      mode: 'date',
    }),
    failureReason: varchar('failure_reason', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('broadcast_media_relays_broadcast_unique').on(table.broadcastId),
    uniqueIndex('broadcast_media_relays_external_id_unique').on(table.externalId),
    index('broadcast_media_relays_status_idx').on(table.status, table.updatedAt),
  ],
);

export type BroadcastMediaRelay = typeof broadcastMediaRelays.$inferSelect;
