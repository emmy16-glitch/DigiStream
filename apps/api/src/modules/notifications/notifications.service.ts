import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  archiveNotification,
  getNotificationDeliveryPreferences,
  listUserNotifications,
  markNotificationRead,
  updateNotificationDeliveryPreferences,
  type NotificationCursor,
} from './notifications.repository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NotificationListQuery = {
  before?: string;
  limit?: string;
  includeArchived?: string;
};

export type NotificationPreferenceBody = {
  realtimeDeliveryEnabled?: unknown;
};

function encodeCursor(cursor: NotificationCursor): string {
  return Buffer.from(
    JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id }),
    'utf8',
  ).toString('base64url');
}

function decodeCursor(value: string | undefined): NotificationCursor | undefined {
  if (!value) return undefined;
  if (value.length > 500) {
    throw new ApiError(400, 'NOTIFICATION_CURSOR_INVALID', 'The notification cursor is invalid.');
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string' || !UUID_PATTERN.test(parsed.id)) {
      throw new Error('Invalid cursor fields.');
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) throw new Error('Invalid cursor timestamp.');
    return { createdAt, id: parsed.id };
  } catch {
    throw new ApiError(400, 'NOTIFICATION_CURSOR_INVALID', 'The notification cursor is invalid.');
  }
}

function parseLimit(value: string | undefined): number {
  if (value === undefined) return 25;
  if (!/^\d+$/.test(value)) {
    throw new ApiError(400, 'NOTIFICATION_LIMIT_INVALID', 'Notification limit must be an integer from 1 to 100.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ApiError(400, 'NOTIFICATION_LIMIT_INVALID', 'Notification limit must be an integer from 1 to 100.');
  }
  return parsed;
}

function parseIncludeArchived(value: string | undefined): boolean {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  throw new ApiError(400, 'NOTIFICATION_ARCHIVE_FILTER_INVALID', 'includeArchived must be true or false.');
}

function requireNotificationId(notificationId: string): void {
  if (!UUID_PATTERN.test(notificationId)) {
    throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'That notification is not available.');
  }
}

export async function listNotificationInbox(
  db: DigiStreamDatabase,
  userId: string,
  query: NotificationListQuery,
) {
  const result = await listUserNotifications(db, userId, {
    limit: parseLimit(query.limit),
    before: decodeCursor(query.before),
    includeArchived: parseIncludeArchived(query.includeArchived),
  });
  return {
    notifications: result.notifications,
    unreadCount: result.unreadCount,
    nextCursor: result.nextCursor ? encodeCursor(result.nextCursor) : null,
  };
}

export async function markInboxNotificationRead(
  db: DigiStreamDatabase,
  userId: string,
  notificationId: string,
) {
  requireNotificationId(notificationId);
  const notification = await markNotificationRead(db, userId, notificationId);
  if (!notification) {
    throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'That notification is not available.');
  }
  return { notification };
}

export async function archiveInboxNotification(
  db: DigiStreamDatabase,
  userId: string,
  notificationId: string,
) {
  requireNotificationId(notificationId);
  const notification = await archiveNotification(db, userId, notificationId);
  if (!notification) {
    throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'That notification is not available.');
  }
  return { notification };
}

export async function readNotificationPreferences(
  db: DigiStreamDatabase,
  userId: string,
) {
  return { preferences: await getNotificationDeliveryPreferences(db, userId) };
}

export async function changeNotificationPreferences(
  db: DigiStreamDatabase,
  userId: string,
  body: NotificationPreferenceBody,
) {
  if (typeof body.realtimeDeliveryEnabled !== 'boolean') {
    throw new ApiError(
      400,
      'NOTIFICATION_PREFERENCES_INVALID',
      'Choose whether new in-app notifications should appear immediately.',
    );
  }
  return {
    preferences: await updateNotificationDeliveryPreferences(
      db,
      userId,
      body.realtimeDeliveryEnabled,
    ),
  };
}
