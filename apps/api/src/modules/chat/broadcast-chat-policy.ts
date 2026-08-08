import { and, desc, eq } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  broadcastChatMessages,
  broadcastChatSettings,
  broadcastChatUserRestrictions,
} from './broadcast-chat.schema.js';
import type { BroadcastChatContext } from './broadcast-chat.service.js';

export type BroadcastChatModerationState = {
  chatDisabled: boolean;
  slowModeSeconds: number;
  mutedUntil: string | null;
  blocked: boolean;
};

export async function getBroadcastChatModerationState(
  db: DigiStreamDatabase,
  context: BroadcastChatContext,
  userId: string,
): Promise<BroadcastChatModerationState> {
  const [settings, restriction] = await Promise.all([
    db
      .select({
        chatDisabled: broadcastChatSettings.chatDisabled,
        slowModeSeconds: broadcastChatSettings.slowModeSeconds,
      })
      .from(broadcastChatSettings)
      .where(
        and(
          eq(broadcastChatSettings.broadcastId, context.broadcastId),
          eq(broadcastChatSettings.organisationId, context.organisationId),
        ),
      )
      .limit(1),
    db
      .select({
        mutedUntil: broadcastChatUserRestrictions.mutedUntil,
        blockedAt: broadcastChatUserRestrictions.blockedAt,
      })
      .from(broadcastChatUserRestrictions)
      .where(
        and(
          eq(broadcastChatUserRestrictions.broadcastId, context.broadcastId),
          eq(broadcastChatUserRestrictions.organisationId, context.organisationId),
          eq(broadcastChatUserRestrictions.userId, userId),
        ),
      )
      .limit(1),
  ]);

  const mutedUntil = restriction[0]?.mutedUntil ?? null;
  const activelyMuted = Boolean(mutedUntil && mutedUntil.getTime() > Date.now());

  return {
    chatDisabled: settings[0]?.chatDisabled ?? false,
    slowModeSeconds: settings[0]?.slowModeSeconds ?? 0,
    mutedUntil: activelyMuted && mutedUntil ? mutedUntil.toISOString() : null,
    blocked: Boolean(restriction[0]?.blockedAt),
  };
}

export async function enforceBroadcastChatSendPolicy(
  db: DigiStreamDatabase,
  context: BroadcastChatContext,
  userId: string,
): Promise<BroadcastChatModerationState> {
  const moderation = await getBroadcastChatModerationState(db, context, userId);

  if (moderation.chatDisabled) {
    throw new ApiError(
      409,
      'CHAT_DISABLED',
      'Chat has been disabled for this broadcast.',
    );
  }
  if (moderation.blocked) {
    throw new ApiError(
      403,
      'CHAT_BLOCKED',
      'You cannot send messages in this broadcast chat.',
    );
  }
  if (moderation.mutedUntil) {
    throw new ApiError(
      429,
      'CHAT_MUTED',
      'You are temporarily muted in this broadcast chat.',
      { mutedUntil: moderation.mutedUntil },
    );
  }

  if (moderation.slowModeSeconds > 0) {
    const [lastMessage] = await db
      .select({ createdAt: broadcastChatMessages.createdAt })
      .from(broadcastChatMessages)
      .where(
        and(
          eq(broadcastChatMessages.broadcastId, context.broadcastId),
          eq(broadcastChatMessages.authorUserId, userId),
        ),
      )
      .orderBy(desc(broadcastChatMessages.createdAt))
      .limit(1);

    if (lastMessage) {
      const availableAt =
        lastMessage.createdAt.getTime() + moderation.slowModeSeconds * 1000;
      const remainingMs = availableAt - Date.now();
      if (remainingMs > 0) {
        throw new ApiError(
          429,
          'CHAT_SLOW_MODE',
          'Wait before sending another chat message.',
          { retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) },
        );
      }
    }
  }

  return moderation;
}
