import { eq } from 'drizzle-orm';
import type { DigiStreamDatabase } from '../../db/client.js';
import type {
  MediaRelayJob,
  MediaRelayProtocol,
} from '../media/media-relay-provider.js';
import {
  broadcastMediaRelays,
  type BroadcastMediaRelay,
} from './broadcast-media-relays.schema.js';

export async function findBroadcastMediaRelay(
  db: DigiStreamDatabase,
  broadcastId: string,
): Promise<BroadcastMediaRelay | null> {
  const [relay] = await db
    .select()
    .from(broadcastMediaRelays)
    .where(eq(broadcastMediaRelays.broadcastId, broadcastId))
    .limit(1);
  return relay ?? null;
}

export async function saveBroadcastMediaRelay(
  db: DigiStreamDatabase,
  input: {
    broadcastId: string;
    protocol: MediaRelayProtocol;
    targetHost: string;
    job: MediaRelayJob;
  },
): Promise<BroadcastMediaRelay> {
  const now = new Date();
  const [relay] = await db
    .insert(broadcastMediaRelays)
    .values({
      broadcastId: input.broadcastId,
      externalId: input.job.externalId,
      protocol: input.protocol,
      status: input.job.status,
      targetHost: input.targetHost,
      startedAt:
        input.job.status === 'active' || input.job.status === 'starting'
          ? now
          : null,
      stoppedAt: input.job.status === 'stopped' ? now : null,
      lastCheckedAt: now,
      failureReason: input.job.failureReason,
    })
    .onConflictDoUpdate({
      target: broadcastMediaRelays.broadcastId,
      set: {
        externalId: input.job.externalId,
        protocol: input.protocol,
        status: input.job.status,
        targetHost: input.targetHost,
        startedAt:
          input.job.status === 'active' || input.job.status === 'starting'
            ? now
            : null,
        stoppedAt: input.job.status === 'stopped' ? now : null,
        lastCheckedAt: now,
        failureReason: input.job.failureReason,
        updatedAt: now,
      },
    })
    .returning();

  if (!relay) throw new Error('Media relay persistence returned no row.');
  return relay;
}

export async function updateBroadcastMediaRelayJob(
  db: DigiStreamDatabase,
  relay: BroadcastMediaRelay,
  job: MediaRelayJob,
): Promise<BroadcastMediaRelay> {
  const now = new Date();
  const [updated] = await db
    .update(broadcastMediaRelays)
    .set({
      externalId: job.externalId,
      status: job.status,
      startedAt:
        relay.startedAt ??
        (job.status === 'starting' || job.status === 'active' ? now : null),
      stoppedAt:
        job.status === 'stopped' || job.status === 'failed'
          ? relay.stoppedAt ?? now
          : null,
      lastCheckedAt: now,
      failureReason: job.failureReason,
      updatedAt: now,
    })
    .where(eq(broadcastMediaRelays.id, relay.id))
    .returning();

  if (!updated) throw new Error('Media relay update returned no row.');
  return updated;
}
