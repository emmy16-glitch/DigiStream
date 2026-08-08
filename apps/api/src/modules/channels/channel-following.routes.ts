import type { FastifyInstance, FastifyRequest } from 'fastify';
import { findAuthenticatedUser } from '../../auth/session.js';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';

function requireDatabase(database: DatabaseContext | null): DatabaseContext {
  if (!database) {
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Channels are temporarily unavailable.');
  }
  return database;
}

async function requireUser(request: FastifyRequest, database: DatabaseContext) {
  const user = await findAuthenticatedUser(request, database);
  if (!user) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.');
  }
  return user;
}

async function findFollowableChannel(
  database: DatabaseContext,
  organisationSlug: string,
  channelSlug: string,
): Promise<{ id: string } | null> {
  const result = await database.pool.query<{ id: string }>(
    `select c.id
       from channels c
       join organisations o on o.id = c.organisation_id
      where o.slug = $1
        and c.slug = $2
        and c.status = 'active'
        and c.visibility in ('public', 'unlisted')
      limit 1`,
    [organisationSlug, channelSlug],
  );
  return result.rows[0] ?? null;
}

export function registerChannelFollowingRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  app.put<{ Params: { organisationSlug: string; channelSlug: string } }>(
    '/api/v1/channels/:organisationSlug/:channelSlug/follow',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const channel = await findFollowableChannel(
        context,
        request.params.organisationSlug,
        request.params.channelSlug,
      );
      if (!channel) {
        throw new ApiError(404, 'CHANNEL_NOT_FOUND', 'Channel not found.');
      }

      await context.pool.query(
        `insert into channel_follows (user_id, channel_id)
         values ($1, $2)
         on conflict (user_id, channel_id) do nothing`,
        [user.id, channel.id],
      );
      return { following: true };
    },
  );

  app.delete<{ Params: { organisationSlug: string; channelSlug: string } }>(
    '/api/v1/channels/:organisationSlug/:channelSlug/follow',
    async (request) => {
      const context = requireDatabase(database);
      const user = await requireUser(request, context);
      const channel = await findFollowableChannel(
        context,
        request.params.organisationSlug,
        request.params.channelSlug,
      );
      if (!channel) {
        throw new ApiError(404, 'CHANNEL_NOT_FOUND', 'Channel not found.');
      }

      await context.pool.query(
        'delete from channel_follows where user_id = $1 and channel_id = $2',
        [user.id, channel.id],
      );
      return { following: false };
    },
  );

  app.get('/api/v1/me/channel-follows', async (request) => {
    const context = requireDatabase(database);
    const user = await requireUser(request, context);
    const result = await context.pool.query(
      `select c.id, c.name, c.slug, c.description, c.category,
              o.id as organisation_id, o.name as organisation_name, o.slug as organisation_slug,
              f.followed_at
         from channel_follows f
         join channels c on c.id = f.channel_id
         join organisations o on o.id = c.organisation_id
        where f.user_id = $1
          and c.status = 'active'
          and c.visibility in ('public', 'unlisted')
        order by f.followed_at desc, c.id desc
        limit 100`,
      [user.id],
    );

    return {
      channels: result.rows.map((row) => ({
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
        followedAt: row.followed_at,
      })),
    };
  });
}
