import type {
  BroadcastChatHistoryResponse,
  BroadcastChatMessage,
  BroadcastState,
} from '@digistream/contracts';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  findBroadcastDeliveryById,
  findBroadcastDeliveryBySlugs,
} from '../broadcasts/broadcast-delivery.repository.js';
import { findOrganisationRole } from '../organisations/organisation-memberships.repository.js';
import {
  enforceBroadcastChatSendPolicy,
  getBroadcastChatModerationState,
} from './broadcast-chat-policy.js';
import {
  broadcastChatMessages,
  type BroadcastChatMessageRecord,
} from './broadcast-chat.schema.js';

export type CreateBroadcastChatMessageBody = {
  clientMessageId?: unknown;
  body?: unknown;
};

export type BroadcastChatContext = {
  organisationId: string;
  broadcastId: string;
  status: BroadcastState;
  canSend: boolean;
};

export type CreatedBroadcastChatMessage = {
  message: BroadcastChatMessage;
  replayed: boolean;
};

const READABLE_CHAT_STATES = new Set<BroadcastState>([
  'scheduled',
  'starting',
  'live',
  'reconnecting',
  'ending',
  'completed',
]);

const WRITABLE_CHAT_STATES = new Set<BroadcastState>([
  'starting',
  'live',
  'reconnecting',
  'ending',
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ChatCursor = {
  createdAt: Date;
  id: string;
};

function chatUnavailable(): never {
  throw new ApiError(
    404,
    'CHAT_NOT_AVAILABLE',
    'The requested live chat is unavailable.',
  );
}

function ensureReadableStatus(status: BroadcastState): void {
  if (!READABLE_CHAT_STATES.has(status)) chatUnavailable();
}

function toContext(
  organisationId: string,
  broadcastId: string,
  status: BroadcastState,
): BroadcastChatContext {
  ensureReadableStatus(status);
  return {
    organisationId,
    broadcastId,
    status,
    canSend: WRITABLE_CHAT_STATES.has(status),
  };
}

export async function resolvePublicBroadcastChat(
  db: DigiStreamDatabase,
  organisationSlug: string,
  channelSlug: string,
  broadcastSlug: string,
): Promise<BroadcastChatContext> {
  const broadcast = await findBroadcastDeliveryBySlugs(
    db,
    organisationSlug,
    channelSlug,
    broadcastSlug,
  );

  if (
    !broadcast ||
    broadcast.channelStatus !== 'active' ||
    (broadcast.channelVisibility !== 'public' &&
      broadcast.channelVisibility !== 'unlisted')
  ) {
    chatUnavailable();
  }

  return toContext(
    broadcast.organisationId,
    broadcast.id,
    broadcast.status,
  );
}

export async function resolveMemberBroadcastChat(
  db: DigiStreamDatabase,
  organisationId: string,
  broadcastId: string,
  userId: string,
): Promise<BroadcastChatContext> {
  const role = await findOrganisationRole(db, organisationId, userId);
  if (!role) chatUnavailable();

  const broadcast = await findBroadcastDeliveryById(
    db,
    organisationId,
    broadcastId,
  );
  if (!broadcast || broadcast.channelStatus !== 'active') chatUnavailable();

  return toContext(
    broadcast.organisationId,
    broadcast.id,
    broadcast.status,
  );
}

function parseLimit(value: string | undefined): number {
  if (value === undefined || value === '') return 50;
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new ApiError(
      400,
      'CHAT_LIMIT_INVALID',
      'Chat history limit must be an integer from 1 to 100.',
    );
  }
  return limit;
}

function parseCursor(value: string | undefined): ChatCursor | null {
  if (!value) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as { createdAt?: unknown; id?: unknown };
    if (
      typeof decoded.createdAt !== 'string' ||
      typeof decoded.id !== 'string' ||
      !UUID_PATTERN.test(decoded.id)
    ) {
      throw new Error('invalid cursor fields');
    }
    const createdAt = new Date(decoded.createdAt);
    if (!Number.isFinite(createdAt.getTime())) {
      throw new Error('invalid cursor date');
    }
    return { createdAt, id: decoded.id };
  } catch {
    throw new ApiError(
      400,
      'CHAT_CURSOR_INVALID',
      'The chat history cursor is invalid.',
    );
  }
}

function encodeCursor(record: BroadcastChatMessageRecord): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: record.createdAt.toISOString(),
      id: record.id,
    }),
  ).toString('base64url');
}

function toMessage(record: BroadcastChatMessageRecord): BroadcastChatMessage {
  return {
    id: record.id,
    organisationId: record.organisationId,
    broadcastId: record.broadcastId,
    clientMessageId: record.clientMessageId,
    body: record.body,
    createdAt: record.createdAt.toISOString(),
    author: {
      id: record.authorUserId,
      displayName: record.authorDisplayName,
    },
  };
}

export async function listBroadcastChatMessages(
  db: DigiStreamDatabase,
  context: BroadcastChatContext,
  userId: string,
  before: string | undefined,
  rawLimit: string | undefined,
): Promise<BroadcastChatHistoryResponse> {
  const cursor = parseCursor(before);
  const limit = parseLimit(rawLimit);
  const moderation = await getBroadcastChatModerationState(db, context, userId);
  const conditions = [
    eq(broadcastChatMessages.broadcastId, context.broadcastId),
    eq(broadcastChatMessages.organisationId, context.organisationId),
  ];

  if (cursor) {
    const olderThanCursor = or(
      lt(broadcastChatMessages.createdAt, cursor.createdAt),
      and(
        eq(broadcastChatMessages.createdAt, cursor.createdAt),
        lt(broadcastChatMessages.id, cursor.id),
      ),
    );
    if (olderThanCursor) conditions.push(olderThanCursor);
  }

  const rows = await db
    .select()
    .from(broadcastChatMessages)
    .where(and(...conditions))
    .orderBy(
      desc(broadcastChatMessages.createdAt),
      desc(broadcastChatMessages.id),
    )
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const oldest = page.at(-1);
  const moderationAllowsSend =
    !moderation.chatDisabled && !moderation.blocked && !moderation.mutedUntil;

  return {
    messages: page.reverse().map(toMessage),
    chat: {
      broadcastId: context.broadcastId,
      status: context.status,
      canSend: context.canSend && moderationAllowsSend,
      moderation,
    },
    pageInfo: {
      hasMore,
      nextCursor: hasMore && oldest ? encodeCursor(oldest) : null,
    },
  };
}

function normaliseMessageBody(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ApiError(
      400,
      'CHAT_MESSAGE_INVALID',
      'Provide a chat message from 1 to 1000 characters.',
    );
  }
  const body = value.trim();
  if (body.length < 1 || body.length > 1000) {
    throw new ApiError(
      400,
      'CHAT_MESSAGE_INVALID',
      'Provide a chat message from 1 to 1000 characters.',
    );
  }
  return body;
}

function normaliseClientMessageId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ApiError(
      400,
      'CHAT_CLIENT_MESSAGE_ID_INVALID',
      'Provide a valid client-generated UUID for duplicate protection.',
    );
  }
  return value;
}

async function findExistingMessage(
  db: DigiStreamDatabase,
  broadcastId: string,
  authorUserId: string,
  clientMessageId: string,
): Promise<BroadcastChatMessageRecord | undefined> {
  const [existing] = await db
    .select()
    .from(broadcastChatMessages)
    .where(
      and(
        eq(broadcastChatMessages.broadcastId, broadcastId),
        eq(broadcastChatMessages.authorUserId, authorUserId),
        eq(broadcastChatMessages.clientMessageId, clientMessageId),
      ),
    )
    .limit(1);
  return existing;
}

export async function createBroadcastChatMessage(
  db: DigiStreamDatabase,
  context: BroadcastChatContext,
  author: { id: string; displayName: string },
  input: CreateBroadcastChatMessageBody,
): Promise<CreatedBroadcastChatMessage> {
  if (!context.canSend) {
    throw new ApiError(
      409,
      'CHAT_READ_ONLY',
      'This broadcast chat is read-only in its current state.',
      { status: context.status },
    );
  }

  const body = normaliseMessageBody(input.body);
  const clientMessageId = normaliseClientMessageId(input.clientMessageId);

  const existingBeforePolicy = await findExistingMessage(
    db,
    context.broadcastId,
    author.id,
    clientMessageId,
  );
  if (existingBeforePolicy) {
    if (existingBeforePolicy.body !== body) {
      throw new ApiError(
        409,
        'CHAT_IDEMPOTENCY_CONFLICT',
        'That client message ID was already used for different content.',
      );
    }
    return { message: toMessage(existingBeforePolicy), replayed: true };
  }

  await enforceBroadcastChatSendPolicy(db, context, author.id);

  const [inserted] = await db
    .insert(broadcastChatMessages)
    .values({
      organisationId: context.organisationId,
      broadcastId: context.broadcastId,
      authorUserId: author.id,
      authorDisplayName: author.displayName,
      clientMessageId,
      body,
    })
    .onConflictDoNothing({
      target: [
        broadcastChatMessages.broadcastId,
        broadcastChatMessages.authorUserId,
        broadcastChatMessages.clientMessageId,
      ],
    })
    .returning();

  if (inserted) {
    return { message: toMessage(inserted), replayed: false };
  }

  const existing = await findExistingMessage(
    db,
    context.broadcastId,
    author.id,
    clientMessageId,
  );
  if (!existing) {
    throw new Error('Chat idempotency conflict returned no existing message.');
  }
  if (existing.body !== body) {
    throw new ApiError(
      409,
      'CHAT_IDEMPOTENCY_CONFLICT',
      'That client message ID was already used for different content.',
    );
  }

  return { message: toMessage(existing), replayed: true };
}
