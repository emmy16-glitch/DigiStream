import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { organisations } from '../../db/schema.js';
import { channelRecords } from '../channels/channels.schema.js';
import {
  broadcastLifecycleCommands,
  broadcastRecords,
} from './broadcasts.schema.js';
import type {
  BroadcastCommandName,
  BroadcastDto,
  BroadcastStatus,
  BroadcastTransitionPatch,
  BroadcastTransitionResult,
  CreateBroadcastInput,
  PublicBroadcastDto,
  UpdateBroadcastInput,
} from './broadcasts.types.js';

export type BroadcastChannelContext = {
  id: string;
  organisationId: string;
  status: 'draft' | 'pending_review' | 'active' | 'suspended' | 'archived';
  visibility: 'public' | 'unlisted' | 'private';
};

export type MetadataUpdateResult =
  | { status: 'updated'; broadcast: BroadcastDto }
  | { status: 'not_found' }
  | { status: 'version_conflict'; currentVersion: number };

export async function findBroadcastChannelContext(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
): Promise<BroadcastChannelContext | null> {
  const [row] = await db
    .select({
      id: channelRecords.id,
      organisationId: channelRecords.organisationId,
      status: channelRecords.status,
      visibility: channelRecords.visibility,
    })
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

export async function createBroadcastRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  userId: string,
  input: CreateBroadcastInput,
): Promise<BroadcastDto> {
  const [row] = await db
    .insert(broadcastRecords)
    .values({
      organisationId,
      channelId,
      createdByUserId: userId,
      ...input,
    })
    .returning();

  if (!row) {
    throw new Error('Broadcast insertion returned no row.');
  }

  return row;
}

export async function listOrganisationBroadcastRecords(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
): Promise<BroadcastDto[]> {
  return db
    .select()
    .from(broadcastRecords)
    .where(
      and(
        eq(broadcastRecords.organisationId, organisationId),
        eq(broadcastRecords.channelId, channelId),
      ),
    )
    .orderBy(desc(broadcastRecords.createdAt), desc(broadcastRecords.id));
}

export async function findOrganisationBroadcastRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
): Promise<BroadcastDto | null> {
  const [row] = await db
    .select()
    .from(broadcastRecords)
    .where(
      and(
        eq(broadcastRecords.id, broadcastId),
        eq(broadcastRecords.organisationId, organisationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function updateBroadcastMetadataRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  expectedVersion: number,
  input: UpdateBroadcastInput,
): Promise<MetadataUpdateResult> {
  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select id from broadcasts where id = ${broadcastId} and organisation_id = ${organisationId} for update`,
    );

    const [current] = await transaction
      .select()
      .from(broadcastRecords)
      .where(
        and(
          eq(broadcastRecords.id, broadcastId),
          eq(broadcastRecords.organisationId, organisationId),
        ),
      )
      .limit(1);

    if (!current) return { status: 'not_found' };
    if (current.lifecycleVersion !== expectedVersion) {
      return {
        status: 'version_conflict',
        currentVersion: current.lifecycleVersion,
      };
    }

    const [updated] = await transaction
      .update(broadcastRecords)
      .set({
        ...input,
        lifecycleVersion: current.lifecycleVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(broadcastRecords.id, broadcastId),
          eq(broadcastRecords.organisationId, organisationId),
          eq(broadcastRecords.lifecycleVersion, current.lifecycleVersion),
        ),
      )
      .returning();

    if (!updated) {
      return {
        status: 'version_conflict',
        currentVersion: current.lifecycleVersion,
      };
    }

    return { status: 'updated', broadcast: updated };
  });
}

export async function transitionBroadcastRecord(
  db: DigiStreamDatabase,
  options: {
    organisationId?: string;
    broadcastId: string;
    actorUserId: string | null;
    command: BroadcastCommandName;
    idempotencyKey: string;
    requestHash: string;
    expectedVersion?: number;
    decide: (current: BroadcastDto) => BroadcastTransitionPatch | null;
  },
): Promise<BroadcastTransitionResult> {
  return db.transaction(async (transaction) => {
    if (options.organisationId) {
      await transaction.execute(
        sql`select id from broadcasts where id = ${options.broadcastId} and organisation_id = ${options.organisationId} for update`,
      );
    } else {
      await transaction.execute(
        sql`select id from broadcasts where id = ${options.broadcastId} for update`,
      );
    }

    const conditions = [eq(broadcastRecords.id, options.broadcastId)];
    if (options.organisationId) {
      conditions.push(
        eq(broadcastRecords.organisationId, options.organisationId),
      );
    }

    const [current] = await transaction
      .select()
      .from(broadcastRecords)
      .where(and(...conditions))
      .limit(1);

    if (!current) return { status: 'not_found' };

    const [receipt] = await transaction
      .select({
        command: broadcastLifecycleCommands.command,
        requestHash: broadcastLifecycleCommands.requestHash,
      })
      .from(broadcastLifecycleCommands)
      .where(
        and(
          eq(broadcastLifecycleCommands.broadcastId, options.broadcastId),
          eq(
            broadcastLifecycleCommands.idempotencyKey,
            options.idempotencyKey,
          ),
        ),
      )
      .limit(1);

    if (receipt) {
      if (
        receipt.command !== options.command ||
        receipt.requestHash !== options.requestHash
      ) {
        return { status: 'idempotency_conflict' };
      }
      return { status: 'replayed', broadcast: current };
    }

    if (
      options.expectedVersion !== undefined &&
      current.lifecycleVersion !== options.expectedVersion
    ) {
      return {
        status: 'version_conflict',
        currentVersion: current.lifecycleVersion,
      };
    }

    const patch = options.decide(current);
    if (!patch) {
      return { status: 'invalid_state', currentStatus: current.status };
    }

    const [updated] = await transaction
      .update(broadcastRecords)
      .set({
        ...patch,
        lifecycleVersion: current.lifecycleVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(broadcastRecords.id, current.id),
          eq(broadcastRecords.lifecycleVersion, current.lifecycleVersion),
        ),
      )
      .returning();

    if (!updated) {
      return {
        status: 'version_conflict',
        currentVersion: current.lifecycleVersion,
      };
    }

    await transaction.insert(broadcastLifecycleCommands).values({
      broadcastId: current.id,
      actorUserId: options.actorUserId,
      command: options.command,
      idempotencyKey: options.idempotencyKey,
      requestHash: options.requestHash,
      resultStatus: updated.status,
      resultVersion: updated.lifecycleVersion,
    });

    return { status: 'updated', broadcast: updated };
  });
}

const PUBLIC_STATUSES: BroadcastStatus[] = [
  'scheduled',
  'starting',
  'live',
  'reconnecting',
  'ending',
  'completed',
];

export async function listPublicBroadcastRecords(
  db: DigiStreamDatabase,
  status: BroadcastStatus | null,
  limit: number,
): Promise<PublicBroadcastDto[]> {
  const statuses = status ? [status] : PUBLIC_STATUSES;

  const rows = await db
    .select({
      id: broadcastRecords.id,
      title: broadcastRecords.title,
      slug: broadcastRecords.slug,
      description: broadcastRecords.description,
      status: broadcastRecords.status,
      scheduledStartAt: broadcastRecords.scheduledStartAt,
      liveStartedAt: broadcastRecords.liveStartedAt,
      endedAt: broadcastRecords.endedAt,
      organisationId: organisations.id,
      organisationName: organisations.name,
      organisationSlug: organisations.slug,
      channelId: channelRecords.id,
      channelName: channelRecords.name,
      channelSlug: channelRecords.slug,
      channelCategory: channelRecords.category,
      createdAt: broadcastRecords.createdAt,
      updatedAt: broadcastRecords.updatedAt,
    })
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
        inArray(broadcastRecords.status, statuses),
        eq(channelRecords.status, 'active'),
        eq(channelRecords.visibility, 'public'),
      ),
    )
    .orderBy(
      desc(broadcastRecords.liveStartedAt),
      desc(broadcastRecords.scheduledStartAt),
      desc(broadcastRecords.createdAt),
    )
    .limit(limit);

  return rows.map(toPublicBroadcast);
}

export async function findPublicBroadcastRecord(
  db: DigiStreamDatabase,
  organisationSlug: string,
  channelSlug: string,
  broadcastSlug: string,
): Promise<PublicBroadcastDto | null> {
  const [row] = await db
    .select({
      id: broadcastRecords.id,
      title: broadcastRecords.title,
      slug: broadcastRecords.slug,
      description: broadcastRecords.description,
      status: broadcastRecords.status,
      scheduledStartAt: broadcastRecords.scheduledStartAt,
      liveStartedAt: broadcastRecords.liveStartedAt,
      endedAt: broadcastRecords.endedAt,
      organisationId: organisations.id,
      organisationName: organisations.name,
      organisationSlug: organisations.slug,
      channelId: channelRecords.id,
      channelName: channelRecords.name,
      channelSlug: channelRecords.slug,
      channelCategory: channelRecords.category,
      createdAt: broadcastRecords.createdAt,
      updatedAt: broadcastRecords.updatedAt,
    })
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
        inArray(broadcastRecords.status, PUBLIC_STATUSES),
        eq(channelRecords.status, 'active'),
        or(
          eq(channelRecords.visibility, 'public'),
          eq(channelRecords.visibility, 'unlisted'),
        ),
      ),
    )
    .limit(1);

  return row ? toPublicBroadcast(row) : null;
}

function toPublicBroadcast(row: {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: BroadcastStatus;
  scheduledStartAt: Date | null;
  liveStartedAt: Date | null;
  endedAt: Date | null;
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  channelId: string;
  channelName: string;
  channelSlug: string;
  channelCategory: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PublicBroadcastDto {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    scheduledStartAt: row.scheduledStartAt,
    liveStartedAt: row.liveStartedAt,
    endedAt: row.endedAt,
    organisation: {
      id: row.organisationId,
      name: row.organisationName,
      slug: row.organisationSlug,
    },
    channel: {
      id: row.channelId,
      name: row.channelName,
      slug: row.channelSlug,
      category: row.channelCategory,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
