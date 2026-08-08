import { and, eq } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { channelRecords } from './channels.schema.js';

export async function findChannelIncludingDeleted(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
) {
  const [row] = await db
    .select()
    .from(channelRecords)
    .where(
      and(
        eq(channelRecords.id, channelId),
        eq(channelRecords.organisationId, organisationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function suspendChannelRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  moderatorUserId: string,
  reason: string,
) {
  const now = new Date();
  const [row] = await db
    .update(channelRecords)
    .set({
      status: 'suspended',
      moderatedAt: now,
      moderatedByUserId: moderatorUserId,
      moderationReason: reason,
      updatedAt: now,
    })
    .where(
      and(
        eq(channelRecords.id, channelId),
        eq(channelRecords.organisationId, organisationId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function restoreSuspendedChannelRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  moderatorUserId: string,
  reason: string,
) {
  const now = new Date();
  const [row] = await db
    .update(channelRecords)
    .set({
      status: 'active',
      moderatedAt: now,
      moderatedByUserId: moderatorUserId,
      moderationReason: reason,
      updatedAt: now,
    })
    .where(
      and(
        eq(channelRecords.id, channelId),
        eq(channelRecords.organisationId, organisationId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function softDeleteChannelRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  moderatorUserId: string,
  reason: string,
  retentionUntil: Date,
) {
  const now = new Date();
  const [row] = await db
    .update(channelRecords)
    .set({
      status: 'archived',
      moderatedAt: now,
      moderatedByUserId: moderatorUserId,
      moderationReason: reason,
      deletedAt: now,
      retentionUntil,
      updatedAt: now,
    })
    .where(
      and(
        eq(channelRecords.id, channelId),
        eq(channelRecords.organisationId, organisationId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function restoreDeletedChannelRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  moderatorUserId: string,
  reason: string,
) {
  const now = new Date();
  const [row] = await db
    .update(channelRecords)
    .set({
      status: 'draft',
      moderatedAt: now,
      moderatedByUserId: moderatorUserId,
      moderationReason: reason,
      deletedAt: null,
      retentionUntil: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(channelRecords.id, channelId),
        eq(channelRecords.organisationId, organisationId),
      ),
    )
    .returning();

  return row ?? null;
}
