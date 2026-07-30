import { and, eq } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { organisations } from '../../db/schema.js';
import { channelRecords } from '../channels/channels.schema.js';
import { broadcastRecords } from './broadcasts.schema.js';
import type { BroadcastStatus } from './broadcasts.types.js';

export type BroadcastDeliveryContext = {
  id: string;
  organisationId: string;
  organisationSlug: string;
  channelId: string;
  channelSlug: string;
  channelStatus: 'draft' | 'pending_review' | 'active' | 'suspended' | 'archived';
  channelVisibility: 'public' | 'unlisted' | 'private';
  status: BroadcastStatus;
  contributionRoomName: string;
  deliveryStreamName: string;
  deliveryReadyAt: Date | null;
  lifecycleVersion: number;
};

const deliveryProjection = {
  id: broadcastRecords.id,
  organisationId: broadcastRecords.organisationId,
  organisationSlug: organisations.slug,
  channelId: broadcastRecords.channelId,
  channelSlug: channelRecords.slug,
  channelStatus: channelRecords.status,
  channelVisibility: channelRecords.visibility,
  status: broadcastRecords.status,
  contributionRoomName: broadcastRecords.contributionRoomName,
  deliveryStreamName: broadcastRecords.deliveryStreamName,
  deliveryReadyAt: broadcastRecords.deliveryReadyAt,
  lifecycleVersion: broadcastRecords.lifecycleVersion,
};

export async function findBroadcastDeliveryById(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
): Promise<BroadcastDeliveryContext | null> {
  const [row] = await db
    .select(deliveryProjection)
    .from(broadcastRecords)
    .innerJoin(
      channelRecords,
      eq(broadcastRecords.channelId, channelRecords.id),
    )
    .innerJoin(
      organisations,
      eq(broadcastRecords.organisationId, organisations.id),
    )
    .where(
      and(
        eq(broadcastRecords.id, broadcastId),
        eq(broadcastRecords.organisationId, organisationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function findBroadcastDeliveryBySlugs(
  db: DigiStreamDatabase,
  organisationSlug: string,
  channelSlug: string,
  broadcastSlug: string,
): Promise<BroadcastDeliveryContext | null> {
  const [row] = await db
    .select(deliveryProjection)
    .from(broadcastRecords)
    .innerJoin(
      channelRecords,
      eq(broadcastRecords.channelId, channelRecords.id),
    )
    .innerJoin(
      organisations,
      eq(broadcastRecords.organisationId, organisations.id),
    )
    .where(
      and(
        eq(organisations.slug, organisationSlug),
        eq(channelRecords.slug, channelSlug),
        eq(broadcastRecords.slug, broadcastSlug),
      ),
    )
    .limit(1);

  return row ?? null;
}
