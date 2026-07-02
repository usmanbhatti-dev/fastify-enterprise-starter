import type { Readable } from 'node:stream';

export interface UploadInput {
  stream: Readable;
  originalName: string;
  mimeType: string;
  size?: number;
  folder?: string;
}

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  originalName: string;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  getSignedUrl?(key: string, ttlSeconds: number): Promise<string>;
}

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
] as const;
