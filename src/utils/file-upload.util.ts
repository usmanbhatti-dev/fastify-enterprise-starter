import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import type { MultipartFile } from '@fastify/multipart';
import { uploadConfig } from '../config/index.js';
import { ValidationError } from '../exceptions/index.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/json',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.csv', '.json'];

export interface UploadedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export class FileUploadService {
  constructor(private readonly uploadDir: string = uploadConfig.uploadDir) {}

  async ensureUploadDir(): Promise<void> {
    await mkdir(this.uploadDir, { recursive: true });
  }

  async upload(file: MultipartFile): Promise<UploadedFile> {
    await this.ensureUploadDir();

    if (!file.file) {
      throw new ValidationError('No file provided');
    }

    const ext = extname(file.filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new ValidationError(`File extension ${ext} is not allowed`);
    }

    if (file.mimetype && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError(`MIME type ${file.mimetype} is not allowed`);
    }

    const uniqueFilename = `${randomUUID()}${ext}`;
    const filePath = join(this.uploadDir, uniqueFilename);

    let size = 0;
    const writeStream = createWriteStream(filePath);

    file.file.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > uploadConfig.maxFileSizeBytes) {
        file.file.destroy();
        writeStream.destroy();
        throw new ValidationError(
          `File size exceeds maximum allowed size of ${uploadConfig.maxFileSizeMb}MB`,
        );
      }
    });

    await pipeline(file.file, writeStream);

    return {
      filename: uniqueFilename,
      originalName: file.filename,
      mimeType: file.mimetype,
      size,
      path: filePath,
    };
  }

  async delete(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted
    }
  }
}

export const fileUploadService = new FileUploadService();
