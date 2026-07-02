import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storageConfig } from '../config/index.js';
import { ValidationError } from '../exceptions/index.js';
import type { StorageProvider, UploadInput, StoredObject } from './storage.interface.js';
import { ALLOWED_UPLOAD_EXTENSIONS, ALLOWED_UPLOAD_MIME_TYPES } from './storage.interface.js';
import { Readable } from 'node:stream';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: storageConfig.s3.region,
      endpoint: storageConfig.s3.endpoint,
      forcePathStyle: storageConfig.s3.forcePathStyle,
      credentials: {
        accessKeyId: storageConfig.s3.accessKeyId,
        secretAccessKey: storageConfig.s3.secretAccessKey,
      },
    });
  }

  async upload(input: UploadInput): Promise<StoredObject> {
    const ext = extname(input.originalName).toLowerCase();
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number])) {
      throw new ValidationError(`File extension ${ext} is not allowed`);
    }

    if (
      !ALLOWED_UPLOAD_MIME_TYPES.includes(
        input.mimeType as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number],
      )
    ) {
      throw new ValidationError(`MIME type ${input.mimeType} is not allowed`);
    }

    const folder = input.folder ?? 'uploads';
    const key = `${folder}/${randomUUID()}${ext}`;
    const body = await streamToBuffer(input.stream);

    await this.client.send(
      new PutObjectCommand({
        Bucket: storageConfig.s3.bucket,
        Key: key,
        Body: body,
        ContentType: input.mimeType,
        ContentLength: body.length,
      }),
    );

    const url = storageConfig.s3.publicUrl
      ? `${storageConfig.s3.publicUrl.replace(/\/$/, '')}/${key}`
      : await this.getSignedUrl(key, 3600);

    return {
      key,
      url,
      size: body.length,
      mimeType: input.mimeType,
      originalName: input.originalName,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: storageConfig.s3.bucket,
        Key: key,
      }),
    );
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: storageConfig.s3.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: ttlSeconds });
  }
}
