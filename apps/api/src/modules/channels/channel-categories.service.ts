import type { DatabaseContext } from '../../db/client.js';

export type PublicChannelCategory = {
  slug: string;
  channelCount: number;
};

/**
 * Returns the currently discoverable category catalogue.
 *
 * Categories are not a separate source of truth in the current schema: they are
 * normalized values owned by channels. This catalogue therefore exposes only
 * categories that are backed by at least one active, public, non-deleted
 * channel. Private, unlisted, suspended, archived and soft-deleted channels do
 * not contribute either names or counts.
 */
export async function listPublicChannelCategories(
  database: DatabaseContext,
): Promise<PublicChannelCategory[]> {
  const result = await database.pool.query<{
    category: string;
    channel_count: string;
  }>(
    `select c.category, count(*)::text as channel_count
       from channels c
      where c.status = 'active'
        and c.visibility = 'public'
        and c.deleted_at is null
        and c.category is not null
      group by c.category
      order by count(*) desc, c.category asc`,
  );

  return result.rows.map((row) => ({
    slug: row.category,
    channelCount: Number.parseInt(row.channel_count, 10),
  }));
}
