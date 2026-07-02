import type { IQueueService } from '../interfaces/index.js';
import type { EmailJobData, ImageProcessingJobData, NotificationJobData } from '../types/index.js';

export class NoOpQueueService implements IQueueService {
  async addEmailJob(_data: EmailJobData): Promise<string> {
    return 'test-job-id';
  }

  async addNotificationJob(_data: NotificationJobData): Promise<string> {
    return 'test-job-id';
  }

  async addImageProcessingJob(_data: ImageProcessingJobData): Promise<string> {
    return 'test-job-id';
  }

  async close(): Promise<void> {
    // No BullMQ connections to tear down in tests
  }
}
