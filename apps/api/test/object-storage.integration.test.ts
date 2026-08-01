import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import {
  ObjectStorageError,
  createS3ObjectStorageFromEnv,
} from '../src/modules/storage/object-storage.js';

const configured = Boolean(process.env.OBJECT_STORAGE_ENDPOINT);

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  await once(stream, 'end');
  return Buffer.concat(chunks);
}

async function waitForStorage(
  check: () => Promise<void>,
  attempts = 30,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await check();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw lastError;
}

test(
  'S3-compatible adapter writes, verifies, ranges and deletes private objects',
  { skip: !configured, timeout: 60_000 },
  async () => {
    const storage = createS3ObjectStorageFromEnv();
    assert.ok(storage);
    await waitForStorage(() => storage.check());

    const key = `integration/${randomUUID()}/fixture.wav`;
    const body = Buffer.from('DigiStream verified object storage fixture');
    try {
      const stored = await storage.putObject({
        key,
        body,
        contentType: 'audio/wav',
      });
      assert.equal(stored.sizeBytes, body.byteLength);
      assert.match(stored.checksumSha256, /^[0-9a-f]{64}$/);

      const verified = await storage.verifyObject({
        key,
        expectedChecksumSha256: stored.checksumSha256,
        expectedSizeBytes: stored.sizeBytes,
      });
      assert.deepEqual(verified, stored);

      const full = await storage.getObject({
        key,
        contentType: 'audio/wav',
      });
      assert.equal(full.contentLength, body.byteLength);
      assert.deepEqual(await readAll(full.body), body);

      const ranged = await storage.getObject({
        key,
        contentType: 'audio/wav',
        range: { start: 4, end: 15 },
      });
      assert.equal(ranged.contentLength, 12);
      assert.deepEqual(await readAll(ranged.body), body.subarray(4, 16));

      await storage.deleteObject(key);
      await assert.rejects(
        storage.getObject({ key, contentType: 'audio/wav' }),
        (error: unknown) =>
          error instanceof ObjectStorageError && error.code === 'not_found',
      );
    } finally {
      try {
        await storage.deleteObject(key);
      } catch {
        // Best-effort cleanup for failed integration assertions.
      }
      await storage.close();
    }
  },
);
