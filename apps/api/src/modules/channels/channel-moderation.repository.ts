import { and, eq } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { organisationAuditEvents } from '../organisations/organisation-audit.schema.js';
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
  return db.transaction(async (transaction) => {
    const now = new Date();
    const [row] = await transaction
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

    if (!row) return null;
    await transaction.insert(organisationAuditEvents).values({
      organisationId,
      actorUserId: moderatorUserId,
      action: 'channel.suspended',
      details: { channelId, reason },
    });
    return row;
  });
}

export async function restoreSuspendedChannelRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  moderatorUserId: string,
  reason: string,
) {
  return db.transaction(async (transaction) => {
    const now = new Date();
    const [row] = await transaction
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

    if (!row) return null;
    await transaction.insert(organisationAuditEvents).values({
      organisationId,
      actorUserId: moderatorUserId,
      action: 'channel.restored',
      details: { channelId, reason },
    });
    return row;
  });
}

export async function softDeleteChannelRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  moderatorUserId: string,
  reason: string,
  retentionUntil: Date,
) {
  return db.transaction(async (transaction) => {
    const now = new Date();
    const [row] = await transaction
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

    if (!row) return null;
    await transaction.insert(organisationAuditEvents).values({
      organisationId,
      actorUserId: moderatorUserId,
      action: 'channel.deleted',
      details: {
        channelId,
        reason,
        retentionUntil: retentionUntil.toISOString(),
      },
    });
    return row;
  });
}

export async function restoreDeletedChannelRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  moderatorUserId: string,
  reason: string,
) {
  return db.transaction(async (transaction) => {
    const now = new Date();
    const [row] = await transaction
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

    if (!row) return null;
    await transaction.insert(organisationAuditEvents).values({
      organisationId,
      actorUserId: moderatorUserId,
      action: 'channel.deletion_restored',
      details: { channelId, reason },
    });
    return row;
  });
}
