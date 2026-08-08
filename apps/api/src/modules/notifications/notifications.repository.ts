import { and, count, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import {
  userNotificationPreferences,
  userNotifications,
  type UserNotificationRecord,
} from './notifications.schema.js';

export type PersistNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export type NotificationCursor = {
  createdAt: Date;
  id: string;
};

export type NotificationListOptions = {
  limit: number;
  before?: NotificationCursor;
  includeArchived?: boolean;
};

export type NotificationDeliveryPreferences = {
  realtimeDeliveryEnabled: boolean;
  updatedAt: string | null;
};

function projectNotification(row: UserNotificationRecord) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
  };
}

export async function persistNotificationBeforeDelivery(
  db: DigiStreamDatabase,
  input: PersistNotificationInput,
) {
  const [row] = await db
    .insert(userNotifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      metadata: input.metadata ?? {},
    })
    .returning();

  if (!row) {
    throw new Error('Notification persistence returned no row.');
  }

  return {
    userId: row.userId,
    ...projectNotification(row),
  };
}

export async function listUserNotifications(
  db: DigiStreamDatabase,
  userId: string,
  options: NotificationListOptions,
) {
  // JavaScript Date and the public cursor preserve milliseconds, while PostgreSQL
  // timestamptz can retain microseconds. Normalize the pagination sort/filter key
  // to milliseconds so a round-tripped cursor cannot skip rows created within the
  // same millisecond. UUID remains the deterministic tie-breaker.
  const cursorCreatedAt = sql<Date>`date_trunc('milliseconds', ${userNotifications.createdAt})`;
  const filters = [eq(userNotifications.userId, userId)];
  if (!options.includeArchived) filters.push(isNull(userNotifications.archivedAt));
  if (options.before) {
    filters.push(
      or(
        lt(cursorCreatedAt, options.before.createdAt),
        and(
          eq(cursorCreatedAt, options.before.createdAt),
          lt(userNotifications.id, options.before.id),
        ),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(userNotifications)
    .where(and(...filters))
    .orderBy(desc(cursorCreatedAt), desc(userNotifications.id))
    .limit(options.limit + 1);
  const hasMore = rows.length > options.limit;
  const page = hasMore ? rows.slice(0, options.limit) : rows;

  const [unread] = await db
    .select({ value: count() })
    .from(userNotifications)
    .where(
      and(
        eq(userNotifications.userId, userId),
        isNull(userNotifications.readAt),
        isNull(userNotifications.archivedAt),
      ),
    );

  return {
    notifications: page.map(projectNotification),
    unreadCount: Number(unread?.value ?? 0),
    nextCursor: hasMore && page.length > 0
      ? {
          createdAt: page[page.length - 1]!.createdAt,
          id: page[page.length - 1]!.id,
        }
      : null,
  };
}

export async function markNotificationRead(
  db: DigiStreamDatabase,
  userId: string,
  notificationId: string,
  now = new Date(),
) {
  const [updated] = await db
    .update(userNotifications)
    .set({ readAt: now })
    .where(
      and(
        eq(userNotifications.id, notificationId),
        eq(userNotifications.userId, userId),
        isNull(userNotifications.readAt),
      ),
    )
    .returning();
  if (updated) return projectNotification(updated);

  const [existing] = await db
    .select()
    .from(userNotifications)
    .where(
      and(
        eq(userNotifications.id, notificationId),
        eq(userNotifications.userId, userId),
      ),
    )
    .limit(1);
  return existing ? projectNotification(existing) : null;
}

export async function archiveNotification(
  db: DigiStreamDatabase,
  userId: string,
  notificationId: string,
  now = new Date(),
) {
  const [updated] = await db
    .update(userNotifications)
    .set({ archivedAt: now })
    .where(
      and(
        eq(userNotifications.id, notificationId),
        eq(userNotifications.userId, userId),
        isNull(userNotifications.archivedAt),
      ),
    )
    .returning();
  if (updated) return projectNotification(updated);

  const [existing] = await db
    .select()
    .from(userNotifications)
    .where(
      and(
        eq(userNotifications.id, notificationId),
        eq(userNotifications.userId, userId),
      ),
    )
    .limit(1);
  return existing ? projectNotification(existing) : null;
}

export async function getNotificationDeliveryPreferences(
  db: DigiStreamDatabase,
  userId: string,
): Promise<NotificationDeliveryPreferences> {
  const [row] = await db
    .select()
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId))
    .limit(1);
  return row
    ? {
        realtimeDeliveryEnabled: row.realtimeDeliveryEnabled,
        updatedAt: row.updatedAt.toISOString(),
      }
    : { realtimeDeliveryEnabled: true, updatedAt: null };
}

export async function updateNotificationDeliveryPreferences(
  db: DigiStreamDatabase,
  userId: string,
  realtimeDeliveryEnabled: boolean,
  now = new Date(),
): Promise<NotificationDeliveryPreferences> {
  const [row] = await db
    .insert(userNotificationPreferences)
    .values({ userId, realtimeDeliveryEnabled, updatedAt: now })
    .onConflictDoUpdate({
      target: userNotificationPreferences.userId,
      set: { realtimeDeliveryEnabled, updatedAt: now },
    })
    .returning();
  if (!row) throw new Error('Notification preference upsert returned no row.');
  return {
    realtimeDeliveryEnabled: row.realtimeDeliveryEnabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function shouldDeliverNotificationRealtime(
  db: DigiStreamDatabase,
  userId: string,
): Promise<boolean> {
  return (await getNotificationDeliveryPreferences(db, userId)).realtimeDeliveryEnabled;
}
