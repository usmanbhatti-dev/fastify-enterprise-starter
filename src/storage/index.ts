import { storageConfig } from '../config/index.js';
import type { StorageProvider } from './storage.interface.js';
import { LocalStorageProvider } from './local.storage.js';
import { S3StorageProvider } from './s3.storage.js';

export type { StorageProvider, UploadInput, StoredObject } from './storage.interface.js';
export { LocalStorageProvider } from './local.storage.js';
export { S3StorageProvider } from './s3.storage.js';

export function createStorageProvider(): StorageProvider {
  switch (storageConfig.driver) {
    case 's3':
      return new S3StorageProvider();
    case 'local':
    default:
      return new LocalStorageProvider();
  }
}
