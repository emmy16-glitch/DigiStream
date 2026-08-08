import { and, desc, eq, or } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { organisations } from '../../db/schema.js';
import { channelRecords } from './channels.schema.js';
import type {
  ChannelDto,
  CreateChannelInput,
  PublicChannelDto,
  UpdateChannelInput,
} from './channels.types.js';

export async function createChannelRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  userId: string,
  input: CreateChannelInput,
): Promise<ChannelDto> {
  const [row] = await db
    .insert(channelRecords)
    .values({
      organisationId,
      createdByUserId: userId,
      ...input,
    })
    .returning();

  if (!row) {
    throw new Error('Channel insertion returned no row.');
  }

  return row;
}

export async function listOrganisationChannelRecords(
  db: DigiStreamDatabase,
  organisationId: string,
): Promise<ChannelDto[]> {
  return db
    .select()
    .from(channelRecords)
    .where(eq(channelRecords.organisationId, organisationId))
    .orderBy(desc(channelRecords.createdAt), desc(channelRecords.id));
}

export async function findOrganisationChannelRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
): Promise<ChannelDto | null> {
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

export async function updateChannelRecord(
  db: DigiStreamDatabase,
  organisationId: string,
  channelId: string,
  input: UpdateChannelInput,
): Promise<ChannelDto | null> {
  const [row] = await db
    .update(channelRecords)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(channelRecords.id, channelId),
        eq(channelRecords.organisationId, organisationId),
      ),
    )
    .returning();

  return row ?? null;
}

export async function listPublicChannelRecords(
  db: DigiStreamDatabase,
  category: string | null,
  limit: number,
): Promise<PublicChannelDto[]> {
  const conditions = [
    eq(channelRecords.status, 'active'),
    eq(channelRecords.visibility, 'public'),
  ];
  if (category) {
    conditions.push(eq(channelRecords.category, category));
  }

  const rows = await db
    .select({
      id: channelRecords.id,
      name: channelRecords.name,
      slug: channelRecords.slug,
      description: channelRecords.description,
      category: channelRecords.category,
      organisationId: organisations.id,
      organisationName: organisations.name,
      organisationSlug: organisations.slug,
      createdAt: channelRecords.createdAt,
      updatedAt: channelRecords.updatedAt,
    })
    .from(channelRecords)
    .innerJoin(
      organisations,
      eq(channelRecords.organisationId, organisations.id),
    )
    .where(and(...conditions))
    .orderBy(desc(channelRecords.createdAt), desc(channelRecords.id))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    organisation: {
      id: row.organisationId,
      name: row.organisationName,
      slug: row.organisationSlug,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function findPublicChannelRecord(
  db: DigiStreamDatabase,
  organisationSlug: string,
  channelSlug: string,
): Promise<PublicChannelDto | null> {
  const [row] = await db
    .select({
      id: channelRecords.id,
      name: channelRecords.name,
      slug: channelRecords.slug,
      description: channelRecords.description,
      category: channelRecords.category,
      organisationId: organisations.id,
      organisationName: organisations.name,
      organisationSlug: organisations.slug,
      createdAt: channelRecords.createdAt,
      updatedAt: channelRecords.updatedAt,
    })
    .from(channelRecords)
    .innerJoin(
      organisations,
      eq(channelRecords.organisationId, organisations.id),
    )
    .where(
      and(
        eq(organisations.slug, organisationSlug),
        eq(channelRecords.slug, channelSlug),
        eq(channelRecords.status, 'active'),
        or(
          eq(channelRecords.visibility, 'public'),
          eq(channelRecords.visibility, 'unlisted'),
        ),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    organisation: {
      id: row.organisationId,
      name: row.organisationName,
      slug: row.organisationSlug,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
