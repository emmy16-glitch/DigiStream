import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  ObjectStorageError,
  createS3ObjectStorageFromEnv,
} from '../src/modules/storage/object-storage.js';

async function readBody(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

test(
  'S3-compatible storage lists objects and performs verified idempotent moves',
  { skip: !process.env.OBJECT_STORAGE_ENDPOINT, timeout: 60_000 },
  async () => {
    const storage = createS3ObjectStorageFromEnv();
    assert.ok(storage);
    assert.ok(storage.listObjects);
    assert.ok(storage.moveObject);

    const suffix = randomUUID();
    const prefix = `recordings/storage-inventory-test-${suffix}/`;
    const sourceKey = `${prefix}source.wav`;
    const destinationKey = `recording-orphan-quarantine/storage-inventory-test-${suffix}.wav`;
    const body = Buffer.from(`storage-inventory-${suffix}`);

    try {
      await storage.putObject({
        key: sourceKey,
        body,
        contentType: 'audio/wav',
      });

      const page = await storage.listObjects({ prefix, limit: 10 });
      assert.equal(page.items.length, 1);
      assert.equal(page.items[0]?.key, sourceKey);
      assert.equal(page.items[0]?.sizeBytes, body.byteLength);
      assert.ok(page.items[0]?.lastModified instanceof Date);
      assert.equal(page.nextCursor, null);

      const moved = await storage.moveObject({
        sourceKey,
        destinationKey,
        expectedSizeBytes: body.byteLength,
      });
      assert.equal(moved.status, 'moved');
      assert.equal(moved.sizeBytes, body.byteLength);

      await assert.rejects(
        storage.getObject({ key: sourceKey, contentType: 'audio/wav' }),
        (error: unknown) =>
          error instanceof ObjectStorageError && error.code === 'not_found',
      );
      const destination = await storage.getObject({
        key: destinationKey,
        contentType: 'audio/wav',
      });
      assert.deepEqual(await readBody(destination.body), body);

      const replayed = await storage.moveObject({
        sourceKey,
        destinationKey,
        expectedSizeBytes: body.byteLength,
      });
      assert.equal(replayed.status, 'already_moved');
    } finally {
      try {
        await storage.deleteObject(sourceKey);
        await storage.deleteObject(destinationKey);
      } finally {
        await storage.close();
      }
    }
  },
);
