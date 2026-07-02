import { Queue, Worker, type ConnectionOptions, type JobsOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import { QUEUE_NAMES } from '../constants/index.js';
import type { IQueueService } from '../interfaces/index.js';
import type { EmailJobData, NotificationJobData, ImageProcessingJobData } from '../types/index.js';

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: {
    count: 1000,
    age: 86400,
  },
  removeOnFail: false,
};

export class QueueService implements IQueueService {
  private readonly connection: ConnectionOptions;
  private readonly emailQueue: Queue;
  private readonly notificationQueue: Queue;
  private readonly imageQueue: Queue;
  private readonly deadLetterQueue: Queue;
  private workers: Worker[] = [];

  constructor(redis: Redis) {
    this.connection = {
      host: redis.options.host ?? 'localhost',
      port: redis.options.port ?? 6379,
      password: redis.options.password,
      db: redis.options.db ?? 0,
    };

    this.emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
      connection: this.connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    this.notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
      connection: this.connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });

    this.imageQueue = new Queue(QUEUE_NAMES.IMAGE_PROCESSING, {
      connection: this.connection,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        attempts: 5,
      },
    });

    this.deadLetterQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, {
      connection: this.connection,
    });
  }

  async addEmailJob(data: EmailJobData): Promise<string> {
    const job = await this.emailQueue.add('send-email', data, {
      priority: data.priority === 'high' ? 1 : 10,
    });
    return job.id ?? '';
  }

  async addNotificationJob(data: NotificationJobData): Promise<string> {
    const job = await this.notificationQueue.add('send-notification', data);
    return job.id ?? '';
  }

  async addImageProcessingJob(data: ImageProcessingJobData): Promise<string> {
    const job = await this.imageQueue.add('process-image', data);
    return job.id ?? '';
  }

  async moveToDeadLetter(
    originalQueue: string,
    jobId: string,
    data: Record<string, unknown>,
    error: string,
  ): Promise<void> {
    await this.deadLetterQueue.add('dead-letter', {
      originalQueue,
      originalJobId: jobId,
      data,
      error,
      failedAt: new Date().toISOString(),
    });
  }

  registerWorker(
    queueName: string,
    processor: (job: { data: Record<string, unknown> }) => Promise<void>,
    concurrency = 5,
  ): Worker {
    const worker = new Worker(
      queueName,
      async (job) => {
        await processor(job);
      },
      {
        connection: this.connection,
        concurrency,
      },
    );

    worker.on('failed', async (job, err) => {
      if (job && job.attemptsMade >= (job.opts.attempts ?? 3)) {
        await this.moveToDeadLetter(
          queueName,
          job.id ?? '',
          job.data as Record<string, unknown>,
          err.message,
        );
      }
    });

    this.workers.push(worker);
    return worker;
  }

  getEmailQueue(): Queue {
    return this.emailQueue;
  }

  getNotificationQueue(): Queue {
    return this.notificationQueue;
  }

  getImageQueue(): Queue {
    return this.imageQueue;
  }

  getDeadLetterQueue(): Queue {
    return this.deadLetterQueue;
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([
      this.emailQueue.close(),
      this.notificationQueue.close(),
      this.imageQueue.close(),
      this.deadLetterQueue.close(),
    ]);
  }
}
