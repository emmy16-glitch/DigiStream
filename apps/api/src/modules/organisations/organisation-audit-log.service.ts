import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findOrganisationRole } from './organisation-memberships.repository.js';

export type OrganisationAuditLogEntry = {
  id: string;
  organisationId: string;
  actorUserId: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type OrganisationAuditLogPage = {
  events: OrganisationAuditLogEntry[];
  nextCursor: string | null;
};

type AuditRow = {
  id: string;
  organisation_id: string;
  actor_user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: Date;
};

type CursorPayload = { createdAt: string; id: string };

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseLimit(value: unknown): number {
  if (value === undefined) return 25;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(parsed) || Number(parsed) < 1 || Number(parsed) > 100) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Audit log limit must be between 1 and 100.');
  }
  return Number(parsed);
}

function encodeCursor(row: AuditRow): string {
  return Buffer.from(JSON.stringify({ createdAt: row.created_at.toISOString(), id: row.id })).toString('base64url');
}

function parseCursor(value: unknown): CursorPayload | null {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'The audit log cursor is invalid.');
  }

  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<CursorPayload>;
    if (
      typeof decoded.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(decoded.createdAt)) ||
      typeof decoded.id !== 'string' ||
      !validUuid(decoded.id)
    ) {
      throw new Error('invalid cursor');
    }
    return { createdAt: new Date(decoded.createdAt).toISOString(), id: decoded.id };
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'The audit log cursor is invalid.');
  }
}

async function requireAuditReader(
  database: DatabaseContext,
  organisationId: string,
  userId: string,
): Promise<void> {
  if (!validUuid(organisationId)) {
    throw new ApiError(404, 'ORGANISATION_NOT_FOUND', 'The requested organisation was not found.');
  }

  const role = await findOrganisationRole(database.db, organisationId, userId);
  if (!role) {
    throw new ApiError(404, 'ORGANISATION_NOT_FOUND', 'The requested organisation was not found.');
  }

  if (role !== 'owner' && role !== 'admin') {
    throw new ApiError(403, 'AUDIT_LOG_ACCESS_REQUIRED', 'Owner or administrator permission is required to view the audit log.');
  }
}

export async function listOrganisationAuditLog(
  database: DatabaseContext,
  organisationId: string,
  userId: string,
  query: { cursor?: unknown; limit?: unknown },
): Promise<OrganisationAuditLogPage> {
  await requireAuditReader(database, organisationId, userId);
  const limit = parseLimit(query.limit);
  const cursor = parseCursor(query.cursor);
  const values: unknown[] = [organisationId, limit + 1];
  let cursorClause = '';

  if (cursor) {
    values.push(cursor.createdAt, cursor.id);
    cursorClause = 'and (created_at, id) < ($3::timestamptz, $4::uuid)';
  }

  const result = await database.pool.query<AuditRow>(
    `select id, organisation_id, actor_user_id, action, details, created_at
       from organisation_audit_events
      where organisation_id = $1
        ${cursorClause}
      order by created_at desc, id desc
      limit $2`,
    values,
  );

  const hasMore = result.rows.length > limit;
  const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
  const last = rows.at(-1);

  return {
    events: rows.map((row) => ({
      id: row.id,
      organisationId: row.organisation_id,
      actorUserId: row.actor_user_id,
      action: row.action,
      details: row.details,
      createdAt: row.created_at.toISOString(),
    })),
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  };
}
