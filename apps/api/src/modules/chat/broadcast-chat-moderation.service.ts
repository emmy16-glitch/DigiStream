import { and, eq } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import { organisationAuditEvents } from '../organisations/organisation-audit.schema.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import type { OrganisationRole } from '../organisations/organisations.types.js';
import {
  broadcastChatMessages,
  broadcastChatReports,
  broadcastChatSettings,
  broadcastChatUserRestrictions,
} from './broadcast-chat.schema.js';
import {
  resolveMemberBroadcastChat,
  type BroadcastChatContext,
} from './broadcast-chat.service.js';

const MODERATION_ROLES = new Set<OrganisationRole>(['owner', 'admin', 'moderator']);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UpdateChatSettingsBody = {
  chatDisabled?: unknown;
  slowModeSeconds?: unknown;
};

export type UpdateChatUserRestrictionBody = {
  action?: unknown;
  durationSeconds?: unknown;
  reason?: unknown;
};

export type ReportChatMessageBody = {
  reason?: unknown;
};

function normaliseReason(value: unknown, required: boolean): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ApiError(400, 'CHAT_REPORT_REASON_INVALID', 'Provide a report reason from 1 to 500 characters.');
    }
    return null;
  }
  if (typeof value !== 'string') {
    throw new ApiError(400, required ? 'CHAT_REPORT_REASON_INVALID' : 'CHAT_MODERATION_REASON_INVALID', 'Provide a reason from 1 to 500 characters.');
  }
  const reason = value.trim();
  if (reason.length < 1 || reason.length > 500) {
    throw new ApiError(400, required ? 'CHAT_REPORT_REASON_INVALID' : 'CHAT_MODERATION_REASON_INVALID', 'Provide a reason from 1 to 500 characters.');
  }
  return reason;
}

async function requireModeratorContext(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  actorUserId: string,
): Promise<BroadcastChatContext> {
  const role = await findOrganisationRole(db, organisationId, actorUserId);
  if (!role) {
    throw new ApiError(404, 'CHAT_NOT_AVAILABLE', 'The requested live chat is unavailable.');
  }
  const context = await resolveMemberBroadcastChat(db, organisationId, broadcastId, actorUserId);
  if (!MODERATION_ROLES.has(role)) {
    throw new ApiError(403, 'CHAT_MODERATION_FORBIDDEN', 'You do not have permission to moderate this broadcast chat.');
  }
  return context;
}

function parseSettings(input: UpdateChatSettingsBody): {
  chatDisabled?: boolean;
  slowModeSeconds?: number;
} {
  const result: { chatDisabled?: boolean; slowModeSeconds?: number } = {};
  if (input.chatDisabled !== undefined) {
    if (typeof input.chatDisabled !== 'boolean') {
      throw new ApiError(400, 'CHAT_SETTINGS_INVALID', 'chatDisabled must be true or false.');
    }
    result.chatDisabled = input.chatDisabled;
  }
  if (input.slowModeSeconds !== undefined) {
    if (!Number.isSafeInteger(input.slowModeSeconds) || (input.slowModeSeconds as number) < 0 || (input.slowModeSeconds as number) > 300) {
      throw new ApiError(400, 'CHAT_SETTINGS_INVALID', 'slowModeSeconds must be an integer from 0 to 300.');
    }
    result.slowModeSeconds = input.slowModeSeconds as number;
  }
  if (result.chatDisabled === undefined && result.slowModeSeconds === undefined) {
    throw new ApiError(400, 'CHAT_SETTINGS_INVALID', 'Provide chatDisabled or slowModeSeconds.');
  }
  return result;
}

export async function updateBroadcastChatSettings(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  actorUserId: string,
  input: UpdateChatSettingsBody,
) {
  await requireModeratorContext(db, organisationId, broadcastId, actorUserId);
  const parsed = parseSettings(input);

  return db.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(broadcastChatSettings)
      .where(and(eq(broadcastChatSettings.organisationId, organisationId), eq(broadcastChatSettings.broadcastId, broadcastId)))
      .limit(1);

    const next = {
      chatDisabled: parsed.chatDisabled ?? existing?.chatDisabled ?? false,
      slowModeSeconds: parsed.slowModeSeconds ?? existing?.slowModeSeconds ?? 0,
      updatedByUserId: actorUserId,
      updatedAt: new Date(),
    };

    const [row] = await transaction
      .insert(broadcastChatSettings)
      .values({ organisationId, broadcastId, ...next })
      .onConflictDoUpdate({
        target: broadcastChatSettings.broadcastId,
        set: next,
      })
      .returning();
    if (!row) throw new Error('Chat settings upsert returned no row.');

    await transaction.insert(organisationAuditEvents).values({
      organisationId,
      actorUserId,
      action: 'chat.settings.updated',
      details: {
        broadcastId,
        chatDisabled: row.chatDisabled,
        slowModeSeconds: row.slowModeSeconds,
      },
    });

    return {
      settings: {
        broadcastId,
        chatDisabled: row.chatDisabled,
        slowModeSeconds: row.slowModeSeconds,
        updatedAt: row.updatedAt.toISOString(),
      },
    };
  });
}

function parseRestriction(input: UpdateChatUserRestrictionBody): {
  action: 'mute' | 'unmute' | 'block' | 'unblock';
  durationSeconds: number | null;
  reason: string | null;
} {
  if (!['mute', 'unmute', 'block', 'unblock'].includes(String(input.action))) {
    throw new ApiError(400, 'CHAT_MODERATION_ACTION_INVALID', 'Choose mute, unmute, block or unblock.');
  }
  const action = input.action as 'mute' | 'unmute' | 'block' | 'unblock';
  let durationSeconds: number | null = null;
  if (action === 'mute') {
    const duration = input.durationSeconds ?? 300;
    if (!Number.isSafeInteger(duration) || (duration as number) < 30 || (duration as number) > 86_400) {
      throw new ApiError(400, 'CHAT_MUTE_DURATION_INVALID', 'Mute duration must be an integer from 30 to 86400 seconds.');
    }
    durationSeconds = duration as number;
  }
  return { action, durationSeconds, reason: normaliseReason(input.reason, false) };
}

export async function updateBroadcastChatUserRestriction(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  actorUserId: string,
  targetUserId: string,
  input: UpdateChatUserRestrictionBody,
) {
  await requireModeratorContext(db, organisationId, broadcastId, actorUserId);
  if (!UUID_PATTERN.test(targetUserId)) {
    throw new ApiError(404, 'CHAT_USER_NOT_FOUND', 'The requested chat participant was not found.');
  }
  const parsed = parseRestriction(input);
  const now = new Date();

  return db.transaction(async (transaction) => {
    const [target] = await transaction
      .select({ id: broadcastChatMessages.authorUserId })
      .from(broadcastChatMessages)
      .where(and(eq(broadcastChatMessages.organisationId, organisationId), eq(broadcastChatMessages.broadcastId, broadcastId), eq(broadcastChatMessages.authorUserId, targetUserId)))
      .limit(1);
    if (!target) {
      throw new ApiError(404, 'CHAT_USER_NOT_FOUND', 'The requested chat participant was not found.');
    }

    const [existing] = await transaction
      .select()
      .from(broadcastChatUserRestrictions)
      .where(and(eq(broadcastChatUserRestrictions.broadcastId, broadcastId), eq(broadcastChatUserRestrictions.userId, targetUserId)))
      .limit(1);

    const mutedUntil = parsed.action === 'mute'
      ? new Date(now.getTime() + parsed.durationSeconds! * 1000)
      : parsed.action === 'unmute'
        ? null
        : existing?.mutedUntil ?? null;
    const blockedAt = parsed.action === 'block'
      ? now
      : parsed.action === 'unblock'
        ? null
        : existing?.blockedAt ?? null;

    const [row] = await transaction
      .insert(broadcastChatUserRestrictions)
      .values({
        organisationId,
        broadcastId,
        userId: targetUserId,
        mutedUntil,
        blockedAt,
        reason: parsed.reason,
        updatedByUserId: actorUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [broadcastChatUserRestrictions.broadcastId, broadcastChatUserRestrictions.userId],
        set: { mutedUntil, blockedAt, reason: parsed.reason, updatedByUserId: actorUserId, updatedAt: now },
      })
      .returning();
    if (!row) throw new Error('Chat restriction upsert returned no row.');

    const actionMap = {
      mute: 'chat.user.muted',
      unmute: 'chat.user.unmuted',
      block: 'chat.user.blocked',
      unblock: 'chat.user.unblocked',
    } as const;
    await transaction.insert(organisationAuditEvents).values({
      organisationId,
      actorUserId,
      action: actionMap[parsed.action],
      details: {
        broadcastId,
        targetUserId,
        ...(parsed.durationSeconds ? { durationSeconds: parsed.durationSeconds } : {}),
      },
    });

    return {
      restriction: {
        broadcastId,
        userId: targetUserId,
        mutedUntil: row.mutedUntil?.toISOString() ?? null,
        blocked: Boolean(row.blockedAt),
        updatedAt: row.updatedAt.toISOString(),
      },
    };
  });
}

export async function reportBroadcastChatMessage(
  db: DigiStreamDatabase,
  context: BroadcastChatContext,
  reporterUserId: string,
  messageId: string,
  input: ReportChatMessageBody,
) {
  if (!UUID_PATTERN.test(messageId)) {
    throw new ApiError(404, 'CHAT_MESSAGE_NOT_FOUND', 'The requested chat message was not found.');
  }
  const reason = normaliseReason(input.reason, true)!;

  const [message] = await db
    .select({ id: broadcastChatMessages.id })
    .from(broadcastChatMessages)
    .where(and(
      eq(broadcastChatMessages.id, messageId),
      eq(broadcastChatMessages.organisationId, context.organisationId),
      eq(broadcastChatMessages.broadcastId, context.broadcastId),
    ))
    .limit(1);
  if (!message) {
    throw new ApiError(404, 'CHAT_MESSAGE_NOT_FOUND', 'The requested chat message was not found.');
  }

  const [inserted] = await db
    .insert(broadcastChatReports)
    .values({
      organisationId: context.organisationId,
      broadcastId: context.broadcastId,
      messageId,
      reporterUserId,
      reason,
    })
    .onConflictDoNothing({ target: [broadcastChatReports.messageId, broadcastChatReports.reporterUserId] })
    .returning();

  if (inserted) {
    return { report: { id: inserted.id, messageId, createdAt: inserted.createdAt.toISOString() }, replayed: false };
  }

  const [existing] = await db
    .select()
    .from(broadcastChatReports)
    .where(and(eq(broadcastChatReports.messageId, messageId), eq(broadcastChatReports.reporterUserId, reporterUserId)))
    .limit(1);
  if (!existing) throw new Error('Chat report idempotency conflict returned no row.');
  return { report: { id: existing.id, messageId, createdAt: existing.createdAt.toISOString() }, replayed: true };
}
