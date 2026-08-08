import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { findOrganisationRole } from './organisation-memberships.repository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type GroupedCountRow = { key: string; count: string | number };
type CountRow = { count: string | number };

export type OrganisationGovernanceReport = {
  organisationId: string;
  generatedAt: string;
  memberships: {
    total: number;
    byRole: Record<string, number>;
  };
  channels: {
    total: number;
    byStatus: Record<string, number>;
    byVisibility: Record<string, number>;
    byCategory: Record<string, number>;
  };
  broadcasts: {
    total: number;
    byStatus: Record<string, number>;
  };
  governance: {
    auditEvents: number;
    chatReports: number;
  };
  definitions: {
    chatReports: string;
    generatedAt: string;
  };
};

function count(value: string | number | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function grouped(rows: GroupedCountRow[]): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.key, count(row.count)]));
}

function total(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

async function requireGovernanceReader(
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
  if (role !== 'owner' && role !== 'admin') {
    throw new ApiError(
      403,
      'GOVERNANCE_REPORT_ACCESS_REQUIRED',
      'Owner or administrator permission is required to view this report.',
    );
  }
}

export async function getOrganisationGovernanceReport(
  database: DatabaseContext,
  organisationId: string,
  userId: string,
): Promise<OrganisationGovernanceReport> {
  await requireGovernanceReader(database, organisationId, userId);

  const [
    memberships,
    channelStatuses,
    channelVisibilities,
    channelCategories,
    broadcastStatuses,
    auditEvents,
    chatReports,
  ] = await Promise.all([
    database.pool.query<GroupedCountRow>(
      `select role::text as key, count(*)::int as count
         from organisation_memberships
        where organisation_id = $1
        group by role
        order by role`,
      [organisationId],
    ),
    database.pool.query<GroupedCountRow>(
      `select status::text as key, count(*)::int as count
         from channels
        where organisation_id = $1
          and deleted_at is null
        group by status
        order by status`,
      [organisationId],
    ),
    database.pool.query<GroupedCountRow>(
      `select visibility::text as key, count(*)::int as count
         from channels
        where organisation_id = $1
          and deleted_at is null
        group by visibility
        order by visibility`,
      [organisationId],
    ),
    database.pool.query<GroupedCountRow>(
      `select category as key, count(*)::int as count
         from channels
        where organisation_id = $1
          and deleted_at is null
          and category is not null
        group by category
        order by category`,
      [organisationId],
    ),
    database.pool.query<GroupedCountRow>(
      `select status::text as key, count(*)::int as count
         from broadcasts
        where organisation_id = $1
        group by status
        order by status`,
      [organisationId],
    ),
    database.pool.query<CountRow>(
      `select count(*)::int as count
         from organisation_audit_events
        where organisation_id = $1`,
      [organisationId],
    ),
    database.pool.query<CountRow>(
      `select count(*)::int as count
         from broadcast_chat_reports
        where organisation_id = $1`,
      [organisationId],
    ),
  ]);

  const membershipCounts = grouped(memberships.rows);
  const channelStatusCounts = grouped(channelStatuses.rows);
  const channelVisibilityCounts = grouped(channelVisibilities.rows);
  const broadcastStatusCounts = grouped(broadcastStatuses.rows);

  return {
    organisationId,
    generatedAt: new Date().toISOString(),
    memberships: {
      total: total(membershipCounts),
      byRole: membershipCounts,
    },
    channels: {
      total: total(channelStatusCounts),
      byStatus: channelStatusCounts,
      byVisibility: channelVisibilityCounts,
      byCategory: grouped(channelCategories.rows),
    },
    broadcasts: {
      total: total(broadcastStatusCounts),
      byStatus: broadcastStatusCounts,
    },
    governance: {
      auditEvents: count(auditEvents.rows[0]?.count),
      chatReports: count(chatReports.rows[0]?.count),
    },
    definitions: {
      chatReports:
        'Durable chat-report records submitted for this organisation. This count does not imply that a report was upheld or resolved.',
      generatedAt:
        'Server time when this read-only report snapshot was assembled from persisted database state.',
    },
  };
}
