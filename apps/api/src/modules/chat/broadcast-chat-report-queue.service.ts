import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';

const MODERATION_ROLES = new Set<OrganisationRole>(['owner', 'admin', 'moderator']);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type QueueRow = {
  id: string;
  organisation_id: string;
  broadcast_id: string;
  message_id: string;
  reporter_user_id: string;
  reporter_display_name: string;
  author_user_id: string;
  author_display_name: string;
  message_body: string;
  reason: string;
  created_at: Date;
};

type CursorPayload = { createdAt: string; id: string };

export type BroadcastChatReportQueueItem = {
  id: string;
  organisationId: string;
  broadcastId: string;
  messageId: string;
  reporter: {
    userId: string;
    displayName: string;
  };
  message: {
    authorUserId: string;
    authorDisplayName: string;
    body: string;
  };
  reason: string;
  createdAt: string;
};

export type BroadcastChatReportQueuePage = {
  reports: BroadcastChatReportQueueItem[];
  pageInfo: {
    hasMore: boolean;
    nextCursor: string | null;
  };
};

function parseLimit(value: unknown): number {
  if (value === undefined) return 25;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(parsed) || Number(parsed) < 1 || Number(parsed) > 100) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Moderation queue limit must be between 1 and 100.');
  }
  return Number(parsed);
}

function encodeCursor(row: QueueRow): string {
  return Buffer.from(
    JSON.stringify({ createdAt: row.created_at.toISOString(), id: row.id }),
  ).toString('base64url');
}

function parseCursor(value: unknown): CursorPayload | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'The moderation queue cursor is invalid.');
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<CursorPayload>;
    if (
      typeof decoded.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(decoded.createdAt)) ||
      typeof decoded.id !== 'string' ||
      !UUID_PATTERN.test(decoded.id)
    ) {
      throw new Error('invalid cursor');
    }
    return {
      createdAt: new Date(decoded.createdAt).toISOString(),
      id: decoded.id,
    };
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'The moderation queue cursor is invalid.');
  }
}

async function requireModerationReader(
  database: DatabaseContext,
  organisationId: string,
  userId: string,
): Promise<void> {
  if (!UUID_PATTERN.test(organisationId)) {
    throw new ApiError(404, 'ORGANISATION_NOT_FOUND', 'The requested organisation was not found.');
  }

  const role = await findOrganisationRole(database.db, organisationId, userId);
  if (!role) {
    throw new ApiError(404, 'ORGANISATION_NOT_FOUND', 'The requested organisation was not found.');
  }
  if (!MODERATION_ROLES.has(role)) {
    throw new ApiError(
      403,
      'CHAT_MODERATION_FORBIDDEN',
      'You do not have permission to review this moderation queue.',
    );
  }
}

export async function listBroadcastChatReportQueue(
  database: DatabaseContext,
  organisationId: string,
  userId: string,
  query: { cursor?: unknown; limit?: unknown },
): Promise<BroadcastChatReportQueuePage> {
  await requireModerationReader(database, organisationId, userId);
  const limit = parseLimit(query.limit);
  const cursor = parseCursor(query.cursor);
  const values: unknown[] = [organisationId, limit + 1];
  let cursorClause = '';

  if (cursor) {
    values.push(cursor.createdAt, cursor.id);
    cursorClause = 'and (report.created_at, report.id) < ($3::timestamptz, $4::uuid)';
  }

  const result = await database.pool.query<QueueRow>(
    `select report.id,
            report.organisation_id,
            report.broadcast_id,
            report.message_id,
            report.reporter_user_id,
            reporter.display_name as reporter_display_name,
            message.author_user_id,
            message.author_display_name,
            message.body as message_body,
            report.reason,
            report.created_at
       from broadcast_chat_reports report
       join broadcast_chat_messages message
         on message.id = report.message_id
        and message.organisation_id = report.organisation_id
        and message.broadcast_id = report.broadcast_id
       join users reporter on reporter.id = report.reporter_user_id
      where report.organisation_id = $1
        ${cursorClause}
      order by report.created_at desc, report.id desc
      limit $2`,
    values,
  );

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
  const last = rows.at(-1);

  return {
    reports: rows.map((row) => ({
      id: row.id,
      organisationId: row.organisation_id,
      broadcastId: row.broadcast_id,
      messageId: row.message_id,
      reporter: {
        userId: row.reporter_user_id,
        displayName: row.reporter_display_name,
      },
      message: {
        authorUserId: row.author_user_id,
        authorDisplayName: row.author_display_name,
        body: row.message_body,
      },
      reason: row.reason,
      createdAt: row.created_at.toISOString(),
    })),
    pageInfo: {
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last) : null,
    },
  };
}
