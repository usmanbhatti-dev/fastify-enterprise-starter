import { createWriteStream } from 'node:fs';
import { mkdir, unlink, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { uploadConfig } from '../config/index.js';
import { ValidationError } from '../exceptions/index.js';
import type { StorageProvider, UploadInput, StoredObject } from './storage.interface.js';
import { ALLOWED_UPLOAD_EXTENSIONS, ALLOWED_UPLOAD_MIME_TYPES } from './storage.interface.js';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly baseDir: string = uploadConfig.uploadDir) {}

  private async ensureDir(folder?: string): Promise<string> {
    const dir = folder ? join(this.baseDir, folder) : this.baseDir;
    await mkdir(dir, { recursive: true });
    return dir;
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

    if (input.size !== undefined && input.size > uploadConfig.maxFileSizeBytes) {
      throw new ValidationError(
        `File size exceeds maximum allowed size of ${uploadConfig.maxFileSizeMb}MB`,
      );
    }

    const folder = input.folder ?? 'uploads';
    const dir = await this.ensureDir(folder);
    const filename = `${randomUUID()}${ext}`;
    const filePath = join(dir, filename);
    const key = `${folder}/${filename}`;

    await pipeline(input.stream, createWriteStream(filePath));
    const fileStat = await stat(filePath);

    return {
      key,
      url: `/uploads/${key}`,
      size: input.size ?? fileStat.size,
      mimeType: input.mimeType,
      originalName: input.originalName,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.baseDir, key);
    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted
    }
  }
}
