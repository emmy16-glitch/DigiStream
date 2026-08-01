import { createHash } from 'node:crypto';
import type { DatabaseContext } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  ObjectStorageError,
  type ObjectStorage,
} from '../storage/object-storage.js';
import {
  claimDueRecordingOrphanCleanup,
  claimRecordingOrphanQuarantine,
  completeRecordingOrphanQuarantine,
  detectRecordingOrphan,
  failRecordingOrphanAttempt,
  findKnownRecordingStorageKeys,
  listRecordingOrphanRecords,
  resolveRecordingOrphan,
  type RecordingOrphanRecord,
} from './recording-orphans.repository.js';

export type RecordingOrphanReconcileBody = {
  action?: unknown;
  limit?: unknown;
  cursor?: unknown;
  minimumAgeSeconds?: unknown;
  quarantineSeconds?: unknown;
};

export type RecordingOrphanDto = {
  originalKey: string;
  quarantineKey: string;
  status: RecordingOrphanRecord['status'];
  sizeBytes: number;
  sourceEtag: string | null;
  sourceLastModified: Date | null;
  detectedAt: Date;
  quarantinedAt: Date | null;
  cleanupAfter: Date;
  resolvedAt: Date | null;
  resolution: RecordingOrphanRecord['resolution'];
  attemptCount: number;
  lastError: string | null;
  updatedAt: Date;
};

type InventoryStorage = ObjectStorage & {
  listObjects: NonNullable<ObjectStorage['listObjects']>;
  moveObject: NonNullable<ObjectStorage['moveObject']>;
};

const RECORDING_PREFIX = 'recordings/';
const QUARANTINE_PREFIX = 'recording-orphan-quarantine/';

function parseAction(value: unknown): 'quarantine' | 'cleanup' {
  if (value === undefined || value === 'quarantine') return 'quarantine';
  if (value === 'cleanup') return 'cleanup';
  throw new ApiError(
    400,
    'VALIDATION_ERROR',
    'Action must be quarantine or cleanup.',
  );
}

function parseInteger(
  value: unknown,
  options: {
    name: string;
    fallback: number;
    minimum: number;
    maximum: number;
    allowZeroInTest?: boolean;
  },
): number {
  const parsed = value === undefined
    ? options.fallback
    : Number.parseInt(String(value), 10);
  const minimum =
    options.allowZeroInTest && process.env.NODE_ENV === 'test'
      ? 0
      : options.minimum;
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > options.maximum
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `${options.name} must be between ${minimum} and ${options.maximum}.`,
    );
  }
  return parsed;
}

function parseLimit(value: unknown): number {
  return parseInteger(value, {
    name: 'limit',
    fallback: 50,
    minimum: 1,
    maximum: 100,
  });
}

function parseCursor(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 2048) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Cursor is invalid.');
  }
  return value;
}

function requireInventoryStorage(storage: ObjectStorage): InventoryStorage {
  if (!storage.listObjects || !storage.moveObject) {
    throw new ApiError(
      503,
      'OBJECT_STORAGE_INVENTORY_UNAVAILABLE',
      'Object storage inventory and quarantine moves are not supported.',
    );
  }
  return storage as InventoryStorage;
}

function quarantineKey(originalKey: string): string {
  const digest = createHash('sha256').update(originalKey).digest('hex');
  const filename = originalKey
    .split('/')
    .at(-1)
    ?.replace(/[^a-zA-Z0-9._-]+/g, '-') || 'object';
  return `${QUARANTINE_PREFIX}${digest.slice(0, 24)}-${filename}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Recording orphan reconciliation failed.';
}

function toDto(record: RecordingOrphanRecord): RecordingOrphanDto {
  return { ...record };
}

async function quarantineInventoryPage(
  context: DatabaseContext,
  storage: InventoryStorage,
  body: RecordingOrphanReconcileBody,
) {
  const limit = parseLimit(body.limit);
  const minimumAgeSeconds = parseInteger(body.minimumAgeSeconds, {
    name: 'minimumAgeSeconds',
    fallback: 86_400,
    minimum: 300,
    maximum: 2_592_000,
    allowZeroInTest: true,
  });
  const quarantineSeconds = parseInteger(body.quarantineSeconds, {
    name: 'quarantineSeconds',
    fallback: 604_800,
    minimum: 86_400,
    maximum: 7_776_000,
    allowZeroInTest: true,
  });
  const page = await storage.listObjects({
    prefix: RECORDING_PREFIX,
    cursor: parseCursor(body.cursor),
    limit,
  });
  const known = await findKnownRecordingStorageKeys(
    context.pool,
    page.items.map((item) => item.key),
  );
  const cutoff = Date.now() - minimumAgeSeconds * 1000;
  const cleanupAfter = new Date(Date.now() + quarantineSeconds * 1000);
  const result = {
    action: 'quarantine' as const,
    scanned: page.items.length,
    known: 0,
    tooRecent: 0,
    unverifiableAge: 0,
    alreadyTracked: 0,
    quarantined: 0,
    recordedDuringScan: 0,
    failed: 0,
    nextCursor: page.nextCursor,
  };

  for (const item of page.items) {
    if (known.has(item.key)) {
      result.known += 1;
      continue;
    }
    if (!item.lastModified) {
      result.unverifiableAge += 1;
      continue;
    }
    if (item.lastModified.getTime() > cutoff) {
      result.tooRecent += 1;
      continue;
    }

    const detected = await detectRecordingOrphan(
      context.pool,
      item,
      quarantineKey(item.key),
      cleanupAfter,
    );
    if (detected.status === 'resolved' || detected.quarantinedAt !== null) {
      result.alreadyTracked += 1;
      continue;
    }

    const becameKnown = await findKnownRecordingStorageKeys(context.pool, [item.key]);
    if (becameKnown.has(item.key)) {
      await resolveRecordingOrphan(context.pool, item.key, 'recorded');
      result.recordedDuringScan += 1;
      continue;
    }

    const claimed = await claimRecordingOrphanQuarantine(context.pool, item.key);
    if (!claimed) {
      result.alreadyTracked += 1;
      continue;
    }
    try {
      await storage.moveObject({
        sourceKey: claimed.originalKey,
        destinationKey: claimed.quarantineKey,
        expectedSizeBytes: claimed.sizeBytes,
      });

      const knownAfterMove = await findKnownRecordingStorageKeys(
        context.pool,
        [claimed.originalKey],
      );
      if (knownAfterMove.has(claimed.originalKey)) {
        await storage.moveObject({
          sourceKey: claimed.quarantineKey,
          destinationKey: claimed.originalKey,
          expectedSizeBytes: claimed.sizeBytes,
        });
        await resolveRecordingOrphan(
          context.pool,
          claimed.originalKey,
          'restored',
        );
        result.recordedDuringScan += 1;
        continue;
      }

      await completeRecordingOrphanQuarantine(context.pool, claimed.originalKey);
      result.quarantined += 1;
    } catch (error) {
      await failRecordingOrphanAttempt(
        context.pool,
        claimed.originalKey,
        errorMessage(error),
      );
      result.failed += 1;
    }
  }

  return result;
}

async function quarantineObjectExists(
  storage: ObjectStorage,
  item: RecordingOrphanRecord,
): Promise<boolean> {
  try {
    const stored = await storage.getObject({
      key: item.quarantineKey,
      contentType: 'application/octet-stream',
    });
    stored.body.destroy();
    if (stored.contentLength !== item.sizeBytes) {
      throw new ObjectStorageError(
        'invalid_response',
        'The quarantined object size no longer matches the ledger.',
      );
    }
    return true;
  } catch (error) {
    if (error instanceof ObjectStorageError && error.code === 'not_found') {
      return false;
    }
    throw error;
  }
}

async function cleanupQuarantinedObjects(
  context: DatabaseContext,
  storage: InventoryStorage,
  body: RecordingOrphanReconcileBody,
) {
  const candidates = await claimDueRecordingOrphanCleanup(
    context.pool,
    parseLimit(body.limit),
  );
  const result = {
    action: 'cleanup' as const,
    claimed: candidates.length,
    deleted: 0,
    restored: 0,
    missing: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    try {
      const known = await findKnownRecordingStorageKeys(
        context.pool,
        [candidate.originalKey],
      );
      if (known.has(candidate.originalKey)) {
        await storage.moveObject({
          sourceKey: candidate.quarantineKey,
          destinationKey: candidate.originalKey,
          expectedSizeBytes: candidate.sizeBytes,
        });
        await resolveRecordingOrphan(
          context.pool,
          candidate.originalKey,
          'restored',
        );
        result.restored += 1;
        continue;
      }

      if (!(await quarantineObjectExists(storage, candidate))) {
        await resolveRecordingOrphan(
          context.pool,
          candidate.originalKey,
          'missing',
        );
        result.missing += 1;
        continue;
      }
      await storage.deleteObject(candidate.quarantineKey);
      await resolveRecordingOrphan(
        context.pool,
        candidate.originalKey,
        'deleted',
      );
      result.deleted += 1;
    } catch (error) {
      await failRecordingOrphanAttempt(
        context.pool,
        candidate.originalKey,
        errorMessage(error),
      );
      result.failed += 1;
    }
  }

  return result;
}

export async function reconcileRecordingOrphans(
  context: DatabaseContext,
  objectStorage: ObjectStorage,
  body: RecordingOrphanReconcileBody,
) {
  const storage = requireInventoryStorage(objectStorage);
  return parseAction(body.action) === 'cleanup'
    ? cleanupQuarantinedObjects(context, storage, body)
    : quarantineInventoryPage(context, storage, body);
}

export async function listRecordingOrphans(
  context: DatabaseContext,
  rawLimit: unknown,
): Promise<RecordingOrphanDto[]> {
  return (
    await listRecordingOrphanRecords(context.pool, parseLimit(rawLimit))
  ).map(toDto);
}
