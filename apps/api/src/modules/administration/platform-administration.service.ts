import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export type AdministrativeUserStatus = 'active' | 'suspended' | 'deleted';
export type MutableAdministrativeUserStatus = 'active' | 'suspended';

export type AdministrativeUser = {
  id: string;
  email: string;
  displayName: string;
  status: AdministrativeUserStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  capabilities: string[];
};

export type AdministrativeUserPage = {
  users: AdministrativeUser[];
  nextCursor: string | null;
};

type AdministrativeUserRow = {
  id: string;
  email: string;
  display_name: string;
  status: AdministrativeUserStatus;
  email_verified_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  capabilities: string[] | null;
};

type ExistsRow = { allowed: boolean };
type CountRow = { count: string | number };

type UserCursor = {
  createdAt: string;
  id: string;
};

function iso(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  return parsed.toISOString();
}

function publicUser(row: AdministrativeUserRow): AdministrativeUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    emailVerifiedAt: row.email_verified_at ? iso(row.email_verified_at) : null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    capabilities: Array.isArray(row.capabilities) ? row.capabilities : [],
  };
}

function parseLimit(value: unknown): number {
  if (value === undefined) return DEFAULT_LIMIT;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new ApiError(400, 'INVALID_LIMIT', 'Limit must be a whole number between 1 and 100.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    throw new ApiError(400, 'INVALID_LIMIT', 'Limit must be a whole number between 1 and 100.');
  }
  return parsed;
}

function parseStatusFilter(value: unknown): AdministrativeUserStatus | null {
  if (value === undefined) return null;
  if (value === 'active' || value === 'suspended' || value === 'deleted') return value;
  throw new ApiError(
    400,
    'INVALID_USER_STATUS',
    'Status must be active, suspended, or deleted.',
  );
}

function encodeCursor(row: AdministrativeUserRow): string {
  return Buffer.from(
    JSON.stringify({ createdAt: iso(row.created_at), id: row.id } satisfies UserCursor),
    'utf8',
  ).toString('base64url');
}

function parseCursor(value: unknown): UserCursor | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length < 8 || value.length > 512) {
    throw new ApiError(400, 'INVALID_CURSOR', 'The user-list cursor is invalid.');
  }
  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<UserCursor>;
    if (
      typeof decoded.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(decoded.createdAt)) ||
      typeof decoded.id !== 'string' ||
      !UUID_PATTERN.test(decoded.id)
    ) {
      throw new Error('invalid cursor payload');
    }
    return { createdAt: new Date(decoded.createdAt).toISOString(), id: decoded.id };
  } catch {
    throw new ApiError(400, 'INVALID_CURSOR', 'The user-list cursor is invalid.');
  }
}

export async function requirePlatformAdministrator(
  database: DatabaseContext,
  userId: string,
): Promise<void> {
  const result = await database.pool.query<ExistsRow>(
    `select exists(
       select 1
         from user_platform_capabilities
        where user_id = $1
          and capability = 'platform_admin'
          and revoked_at is null
     ) as allowed`,
    [userId],
  );
  if (!result.rows[0]?.allowed) {
    throw new ApiError(
      403,
      'PLATFORM_ADMIN_REQUIRED',
      'Platform administrator permission is required.',
    );
  }
}

export async function listAdministrativeUsers(
  database: DatabaseContext,
  actorUserId: string,
  query: { cursor?: unknown; limit?: unknown; status?: unknown },
): Promise<AdministrativeUserPage> {
  await requirePlatformAdministrator(database, actorUserId);
  const limit = parseLimit(query.limit);
  const cursor = parseCursor(query.cursor);
  const status = parseStatusFilter(query.status);

  const parameters: unknown[] = [];
  const predicates: string[] = [];

  if (status) {
    parameters.push(status);
    predicates.push(`u.status = $${parameters.length}::user_status`);
  }
  if (cursor) {
    parameters.push(cursor.createdAt, cursor.id);
    const dateIndex = parameters.length - 1;
    const idIndex = parameters.length;
    predicates.push(`(u.created_at, u.id) < ($${dateIndex}::timestamptz, $${idIndex}::uuid)`);
  }

  parameters.push(limit + 1);
  const limitIndex = parameters.length;
  const where = predicates.length ? `where ${predicates.join(' and ')}` : '';
  const result = await database.pool.query<AdministrativeUserRow>(
    `select u.id,
            u.email,
            u.display_name,
            u.status::text as status,
            u.email_verified_at,
            u.created_at,
            u.updated_at,
            coalesce(
              array_agg(c.capability::text order by c.capability)
                filter (where c.capability is not null),
              array[]::text[]
            ) as capabilities
       from users u
       left join user_platform_capabilities c
         on c.user_id = u.id
        and c.revoked_at is null
       ${where}
      group by u.id
      order by u.created_at desc, u.id desc
      limit $${limitIndex}`,
    parameters,
  );

  const hasMore = result.rows.length > limit;
  const pageRows = hasMore ? result.rows.slice(0, limit) : result.rows;
  return {
    users: pageRows.map(publicUser),
    nextCursor: hasMore && pageRows.length > 0 ? encodeCursor(pageRows[pageRows.length - 1]!) : null,
  };
}

export async function updateAdministrativeUserStatus(
  database: DatabaseContext,
  actorUserId: string,
  targetUserId: string,
  body: { status?: unknown },
): Promise<AdministrativeUser> {
  await requirePlatformAdministrator(database, actorUserId);
  if (!UUID_PATTERN.test(targetUserId)) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'The requested user was not found.');
  }
  if (body.status !== 'active' && body.status !== 'suspended') {
    throw new ApiError(
      400,
      'INVALID_USER_STATUS',
      'Administrative status changes support active or suspended.',
    );
  }
  const requestedStatus: MutableAdministrativeUserStatus = body.status;
  if (targetUserId === actorUserId && requestedStatus === 'suspended') {
    throw new ApiError(
      409,
      'SELF_SUSPENSION_NOT_ALLOWED',
      'Use another platform administrator to suspend this account.',
    );
  }

  const client = await database.pool.connect();
  try {
    await client.query('begin');
    const targetResult = await client.query<AdministrativeUserRow & { is_platform_admin: boolean }>(
      `select u.id,
              u.email,
              u.display_name,
              u.status::text as status,
              u.email_verified_at,
              u.created_at,
              u.updated_at,
              exists(
                select 1
                  from user_platform_capabilities c
                 where c.user_id = u.id
                   and c.capability = 'platform_admin'
                   and c.revoked_at is null
              ) as is_platform_admin,
              array[]::text[] as capabilities
         from users u
        where u.id = $1
        for update`,
      [targetUserId],
    );
    const target = targetResult.rows[0];
    if (!target) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'The requested user was not found.');
    }
    if (target.status === 'deleted') {
      throw new ApiError(
        409,
        'DELETED_USER_STATUS_IMMUTABLE',
        'Deleted accounts cannot be reactivated through user administration.',
      );
    }

    if (requestedStatus === 'suspended' && target.is_platform_admin && target.status === 'active') {
      const activeAdmins = await client.query<CountRow>(
        `select count(*)::int as count
           from users u
           join user_platform_capabilities c on c.user_id = u.id
          where u.status = 'active'
            and c.capability = 'platform_admin'
            and c.revoked_at is null`,
      );
      if (Number(activeAdmins.rows[0]?.count ?? 0) <= 1) {
        throw new ApiError(
          409,
          'LAST_PLATFORM_ADMIN_REQUIRED',
          'At least one active platform administrator must remain.',
        );
      }
    }

    const updated = await client.query<AdministrativeUserRow>(
      `update users
          set status = $2::user_status,
              updated_at = now()
        where id = $1
      returning id,
                email,
                display_name,
                status::text as status,
                email_verified_at,
                created_at,
                updated_at,
                array[]::text[] as capabilities`,
      [targetUserId, requestedStatus],
    );

    if (requestedStatus === 'suspended') {
      await client.query(
        `update auth_sessions
            set revoked_at = coalesce(revoked_at, now())
          where user_id = $1
            and revoked_at is null`,
        [targetUserId],
      );
    }

    const capabilities = await client.query<{ capability: string }>(
      `select capability::text as capability
         from user_platform_capabilities
        where user_id = $1
          and revoked_at is null
        order by capability`,
      [targetUserId],
    );
    await client.query('commit');

    const row = updated.rows[0]!;
    row.capabilities = capabilities.rows.map((entry) => entry.capability);
    return publicUser(row);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
