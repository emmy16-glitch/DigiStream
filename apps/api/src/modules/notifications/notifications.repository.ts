import type { DigiStreamDatabase } from '../../db/client.js';
import { userNotifications } from './notifications.schema.js';

export type PersistNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

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
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  };
}
