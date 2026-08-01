import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export type ObjectStorageRange = {
  start: number;
  end: number;
};

export type ObjectStoragePutResult = {
  sizeBytes: number;
  checksumSha256: string;
  contentType: string;
};

export type ObjectStorageReadResult = {
  body: Readable;
  contentLength: number;
  contentType: string;
  contentRange: string | null;
  etag: string | null;
};

export type ObjectStorageInventoryItem = {
  key: string;
  sizeBytes: number;
  lastModified: Date | null;
  etag: string | null;
};

export type ObjectStorageInventoryPage = {
  items: ObjectStorageInventoryItem[];
  nextCursor: string | null;
};

export type ObjectStorageMoveResult = {
  status: 'moved' | 'already_moved';
  sizeBytes: number;
  contentType: string;
  etag: string | null;
};

export type ObjectStorageFailureCode =
  | 'not_found'
  | 'checksum_mismatch'
  | 'invalid_response'
  | 'unavailable';

export class ObjectStorageError extends Error {
  readonly code: ObjectStorageFailureCode;

  constructor(code: ObjectStorageFailureCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ObjectStorageError';
    this.code = code;
  }
}

export interface ObjectStorage {
  readonly provider: string;
  check(): Promise<void>;
  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<ObjectStoragePutResult>;
  verifyObject(input: {
    key: string;
    expectedChecksumSha256: string;
    expectedSizeBytes: number;
  }): Promise<ObjectStoragePutResult>;
  getObject(input: {
    key: string;
    contentType: string;
    range?: ObjectStorageRange;
  }): Promise<ObjectStorageReadResult>;
  deleteObject(key: string): Promise<void>;
  listObjects?(input: {
    prefix: string;
    cursor?: string;
    limit: number;
  }): Promise<ObjectStorageInventoryPage>;
  moveObject?(input: {
    sourceKey: string;
    destinationKey: string;
    expectedSizeBytes?: number;
  }): Promise<ObjectStorageMoveResult>;
  close(): void | Promise<void>;
}

function sha256Hex(body: Buffer): string {
  return createHash('sha256').update(body).digest('hex');
}

function toReadable(body: unknown): Readable {
  if (body instanceof Readable) return body;
  if (
    body &&
    typeof (body as { transformToWebStream?: unknown }).transformToWebStream ===
      'function'
  ) {
    const stream = (body as { transformToWebStream: () => unknown })
      .transformToWebStream();
    return Readable.fromWeb(stream as never);
  }
  throw new ObjectStorageError(
    'invalid_response',
    'Object storage returned an unreadable response body.',
  );
}

function asObjectStorageError(error: unknown): ObjectStorageError {
  if (error instanceof ObjectStorageError) return error;
  const candidate = error as {
    name?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  const status = candidate?.$metadata?.httpStatusCode;
  if (
    status === 404 ||
    candidate?.name === 'NoSuchKey' ||
    candidate?.name === 'NotFound'
  ) {
    return new ObjectStorageError(
      'not_found',
      'The requested object was not found.',
      error,
    );
  }
  return new ObjectStorageError(
    'unavailable',
    'Object storage is unavailable.',
    error,
  );
}

function safeContentLength(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new ObjectStorageError(
      'invalid_response',
      'Object storage omitted a valid object size.',
    );
  }
  return value;
}

async function checksumStream(stream: Readable): Promise<{
  checksumSha256: string;
  sizeBytes: number;
}> {
  const hash = createHash('sha256');
  let sizeBytes = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    sizeBytes += buffer.byteLength;
    hash.update(buffer);
  }
  return { checksumSha256: hash.digest('hex'), sizeBytes };
}

export class S3ObjectStorage implements ObjectStorage {
  readonly provider: string;
  private readonly client: S3Client;

  constructor(
    private readonly config: {
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    },
  ) {
    this.provider = 's3-compatible';
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async check(): Promise<void> {
    try {
      await this.client.send(
        new HeadBucketCommand({ Bucket: this.config.bucket }),
      );
    } catch (error) {
      throw asObjectStorageError(error);
    }
  }

  async putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<ObjectStoragePutResult> {
    const checksumSha256 = sha256Hex(input.body);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: input.key,
          Body: input.body,
          ContentLength: input.body.byteLength,
          ContentType: input.contentType,
          Metadata: {
            'digistream-sha256': checksumSha256,
          },
        }),
      );
      return {
        sizeBytes: input.body.byteLength,
        checksumSha256,
        contentType: input.contentType,
      };
    } catch (error) {
      throw asObjectStorageError(error);
    }
  }

  async verifyObject(input: {
    key: string;
    expectedChecksumSha256: string;
    expectedSizeBytes: number;
  }): Promise<ObjectStoragePutResult> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: input.key,
        }),
      );
      const verified = await checksumStream(toReadable(response.Body));
      if (
        verified.sizeBytes !== input.expectedSizeBytes ||
        verified.checksumSha256 !== input.expectedChecksumSha256
      ) {
        throw new ObjectStorageError(
          'checksum_mismatch',
          'The uploaded object failed checksum verification.',
        );
      }
      return {
        ...verified,
        contentType: response.ContentType ?? 'application/octet-stream',
      };
    } catch (error) {
      throw asObjectStorageError(error);
    }
  }

  async getObject(input: {
    key: string;
    contentType: string;
    range?: ObjectStorageRange;
  }): Promise<ObjectStorageReadResult> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: input.key,
          ...(input.range
            ? { Range: `bytes=${input.range.start}-${input.range.end}` }
            : {}),
        }),
      );
      const contentLength = safeContentLength(response.ContentLength);
      return {
        body: toReadable(response.Body),
        contentLength,
        contentType: response.ContentType ?? input.contentType,
        contentRange: response.ContentRange ?? null,
        etag: response.ETag ?? null,
      };
    } catch (error) {
      throw asObjectStorageError(error);
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      throw asObjectStorageError(error);
    }
  }

  async listObjects(input: {
    prefix: string;
    cursor?: string;
    limit: number;
  }): Promise<ObjectStorageInventoryPage> {
    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: input.prefix,
          ContinuationToken: input.cursor,
          MaxKeys: input.limit,
        }),
      );
      const items = (response.Contents ?? []).flatMap((object) => {
        if (typeof object.Key !== 'string') return [];
        return [{
          key: object.Key,
          sizeBytes: safeContentLength(object.Size),
          lastModified: object.LastModified ?? null,
          etag: object.ETag ?? null,
        }];
      });
      return {
        items,
        nextCursor: response.IsTruncated
          ? response.NextContinuationToken ?? null
          : null,
      };
    } catch (error) {
      throw asObjectStorageError(error);
    }
  }

  private async headObject(key: string): Promise<{
    sizeBytes: number;
    contentType: string;
    etag: string | null;
  }> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
      return {
        sizeBytes: safeContentLength(response.ContentLength),
        contentType: response.ContentType ?? 'application/octet-stream',
        etag: response.ETag ?? null,
      };
    } catch (error) {
      throw asObjectStorageError(error);
    }
  }

  async moveObject(input: {
    sourceKey: string;
    destinationKey: string;
    expectedSizeBytes?: number;
  }): Promise<ObjectStorageMoveResult> {
    let source: {
      sizeBytes: number;
      contentType: string;
      etag: string | null;
    };
    try {
      source = await this.headObject(input.sourceKey);
    } catch (error) {
      if (!(error instanceof ObjectStorageError) || error.code !== 'not_found') {
        throw error;
      }
      const destination = await this.headObject(input.destinationKey);
      if (
        input.expectedSizeBytes !== undefined &&
        destination.sizeBytes !== input.expectedSizeBytes
      ) {
        throw new ObjectStorageError(
          'invalid_response',
          'The previously moved object has an unexpected size.',
        );
      }
      return { status: 'already_moved', ...destination };
    }

    if (
      input.expectedSizeBytes !== undefined &&
      source.sizeBytes !== input.expectedSizeBytes
    ) {
      throw new ObjectStorageError(
        'invalid_response',
        'The source object size changed before quarantine.',
      );
    }

    try {
      const encodedSource = `/${encodeURIComponent(this.config.bucket)}/${input.sourceKey
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')}`;
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.config.bucket,
          Key: input.destinationKey,
          CopySource: encodedSource,
          MetadataDirective: 'COPY',
        }),
      );
      const destination = await this.headObject(input.destinationKey);
      if (destination.sizeBytes !== source.sizeBytes) {
        throw new ObjectStorageError(
          'invalid_response',
          'The quarantined object size did not match the source object.',
        );
      }
      await this.deleteObject(input.sourceKey);
      return { status: 'moved', ...destination };
    } catch (error) {
      throw asObjectStorageError(error);
    }
  }

  close(): void {
    this.client.destroy();
  }
}

type InMemoryObject = {
  body: Buffer;
  contentType: string;
  checksumSha256: string;
  lastModified: Date;
};

export class InMemoryObjectStorage implements ObjectStorage {
  readonly provider = 'memory';
  private readonly objects = new Map<string, InMemoryObject>();

  async check(): Promise<void> {}

  async putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<ObjectStoragePutResult> {
    const body = Buffer.from(input.body);
    const checksumSha256 = sha256Hex(body);
    this.objects.set(input.key, {
      body,
      contentType: input.contentType,
      checksumSha256,
      lastModified: new Date(),
    });
    return {
      sizeBytes: body.byteLength,
      checksumSha256,
      contentType: input.contentType,
    };
  }

  async verifyObject(input: {
    key: string;
    expectedChecksumSha256: string;
    expectedSizeBytes: number;
  }): Promise<ObjectStoragePutResult> {
    const object = this.objects.get(input.key);
    if (!object) {
      throw new ObjectStorageError('not_found', 'The requested object was not found.');
    }
    if (
      object.body.byteLength !== input.expectedSizeBytes ||
      object.checksumSha256 !== input.expectedChecksumSha256
    ) {
      throw new ObjectStorageError(
        'checksum_mismatch',
        'The uploaded object failed checksum verification.',
      );
    }
    return {
      sizeBytes: object.body.byteLength,
      checksumSha256: object.checksumSha256,
      contentType: object.contentType,
    };
  }

  async getObject(input: {
    key: string;
    contentType: string;
    range?: ObjectStorageRange;
  }): Promise<ObjectStorageReadResult> {
    const object = this.objects.get(input.key);
    if (!object) {
      throw new ObjectStorageError('not_found', 'The requested object was not found.');
    }
    const body = input.range
      ? object.body.subarray(input.range.start, input.range.end + 1)
      : object.body;
    return {
      body: Readable.from([body]),
      contentLength: body.byteLength,
      contentType: object.contentType || input.contentType,
      contentRange: input.range
        ? `bytes ${input.range.start}-${input.range.end}/${object.body.byteLength}`
        : null,
      etag: object.checksumSha256,
    };
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async listObjects(input: {
    prefix: string;
    cursor?: string;
    limit: number;
  }): Promise<ObjectStorageInventoryPage> {
    const keys = [...this.objects.keys()]
      .filter((key) => key.startsWith(input.prefix))
      .sort((left, right) => left.localeCompare(right));
    const start = input.cursor
      ? Math.max(0, keys.findIndex((key) => key > input.cursor))
      : 0;
    const selected = keys.slice(start, start + input.limit);
    return {
      items: selected.map((key) => {
        const object = this.objects.get(key) as InMemoryObject;
        return {
          key,
          sizeBytes: object.body.byteLength,
          lastModified: object.lastModified,
          etag: object.checksumSha256,
        };
      }),
      nextCursor:
        start + selected.length < keys.length
          ? selected.at(-1) ?? null
          : null,
    };
  }

  async moveObject(input: {
    sourceKey: string;
    destinationKey: string;
    expectedSizeBytes?: number;
  }): Promise<ObjectStorageMoveResult> {
    const source = this.objects.get(input.sourceKey);
    if (!source) {
      const destination = this.objects.get(input.destinationKey);
      if (!destination) {
        throw new ObjectStorageError('not_found', 'The requested object was not found.');
      }
      if (
        input.expectedSizeBytes !== undefined &&
        destination.body.byteLength !== input.expectedSizeBytes
      ) {
        throw new ObjectStorageError(
          'invalid_response',
          'The previously moved object has an unexpected size.',
        );
      }
      return {
        status: 'already_moved',
        sizeBytes: destination.body.byteLength,
        contentType: destination.contentType,
        etag: destination.checksumSha256,
      };
    }
    if (
      input.expectedSizeBytes !== undefined &&
      source.body.byteLength !== input.expectedSizeBytes
    ) {
      throw new ObjectStorageError(
        'invalid_response',
        'The source object size changed before quarantine.',
      );
    }
    this.objects.set(input.destinationKey, {
      body: Buffer.from(source.body),
      contentType: source.contentType,
      checksumSha256: source.checksumSha256,
      lastModified: new Date(),
    });
    this.objects.delete(input.sourceKey);
    return {
      status: 'moved',
      sizeBytes: source.body.byteLength,
      contentType: source.contentType,
      etag: source.checksumSha256,
    };
  }

  close(): void {
    this.objects.clear();
  }
}

function configuredValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function createS3ObjectStorageFromEnv(): ObjectStorage | null {
  const endpoint = configuredValue('OBJECT_STORAGE_ENDPOINT');
  const bucket = configuredValue('OBJECT_STORAGE_BUCKET');
  const accessKeyId = configuredValue('OBJECT_STORAGE_ACCESS_KEY_ID');
  const secretAccessKey = configuredValue('OBJECT_STORAGE_SECRET_ACCESS_KEY');
  const configured = Boolean(endpoint || bucket || accessKeyId || secretAccessKey);
  if (!configured) return null;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Object storage configuration is incomplete.');
  }

  return new S3ObjectStorage({
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region: configuredValue('OBJECT_STORAGE_REGION') ?? 'us-east-1',
    forcePathStyle:
      configuredValue('OBJECT_STORAGE_FORCE_PATH_STYLE')?.toLowerCase() !== 'false',
  });
}
