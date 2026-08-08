import type { DatabaseContext } from '../../db/client.js';
import type { PublicChannelDto } from './channels.types.js';

export type ChannelDiscoveryCursor = {
  createdAt: Date;
  id: string;
};

export type ChannelDiscoveryFilters = {
  category: string | null;
  organisationSlug: string | null;
  search: string | null;
  cursor: ChannelDiscoveryCursor | null;
  limit: number;
};

export async function searchPublicChannels(
  database: DatabaseContext,
  filters: ChannelDiscoveryFilters,
): Promise<PublicChannelDto[]> {
  const values: unknown[] = [];
  const where = [
    "c.status = 'active'",
    "c.visibility = 'public'",
    'c.deleted_at is null',
  ];

  const bind = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (filters.category) {
    where.push(`c.category = ${bind(filters.category)}`);
  }
  if (filters.organisationSlug) {
    where.push(`o.slug = ${bind(filters.organisationSlug)}`);
  }
  if (filters.search) {
    const parameter = bind(filters.search);
    where.push(`to_tsvector('simple', coalesce(c.name, '') || ' ' || coalesce(c.description, '') || ' ' || coalesce(c.category, '')) @@ websearch_to_tsquery('simple', ${parameter})`);
  }
  if (filters.cursor) {
    const createdAt = bind(filters.cursor.createdAt);
    const id = bind(filters.cursor.id);
    where.push(`(c.created_at, c.id) < (${createdAt}, ${id})`);
  }

  const limit = bind(filters.limit);
  const result = await database.pool.query<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string | null;
    organisation_id: string;
    organisation_name: string;
    organisation_slug: string;
    created_at: Date;
    updated_at: Date;
  }>(
    `select c.id, c.name, c.slug, c.description, c.category,
            o.id as organisation_id, o.name as organisation_name, o.slug as organisation_slug,
            c.created_at, c.updated_at
       from channels c
       join organisations o on o.id = c.organisation_id
      where ${where.join(' and ')}
      order by c.created_at desc, c.id desc
      limit ${limit}`,
    values,
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: row.category,
    organisation: {
      id: row.organisation_id,
      name: row.organisation_name,
      slug: row.organisation_slug,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
