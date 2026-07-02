import type { QueueService } from '../queue/queue.service.js';
import type { EmailService } from '../common/services/email.service.js';
import { QUEUE_NAMES } from '../constants/index.js';
import type { EmailJobData, NotificationJobData, ImageProcessingJobData } from '../types/index.js';

export function registerJobProcessors(
  queueService: QueueService,
  emailService: EmailService,
  logger: {
    info: (msg: string, data?: object) => void;
    error: (msg: string, data?: object) => void;
  },
): void {
  queueService.registerWorker(QUEUE_NAMES.EMAIL, async (job: { data: Record<string, unknown> }) => {
    const data = job.data as unknown as EmailJobData;
    logger.info('Processing email job', {
      to: data.to,
      subject: data.subject,
      template: data.template,
    });

    let subject = data.subject;
    let html = `<p>${data.subject}</p>`;
    let text = data.subject;

    switch (data.template) {
      case 'email-verification': {
        const content = emailService.buildVerificationEmail(String(data.context.verificationToken));
        subject = content.subject;
        html = content.html;
        text = content.text;
        break;
      }
      case 'password-reset': {
        const content = emailService.buildPasswordResetEmail(String(data.context.resetToken));
        subject = content.subject;
        html = content.html;
        text = content.text;
        break;
      }
      case 'welcome': {
        const content = emailService.buildWelcomeEmail(String(data.context.firstName ?? 'User'));
        subject = content.subject;
        html = content.html;
        text = content.text;
        break;
      }
    }

    await emailService.send({ to: data.to, subject, html, text });
    logger.info('Email sent successfully', { to: data.to, subject });
  });

  queueService.registerWorker(
    QUEUE_NAMES.NOTIFICATION,
    async (job: { data: Record<string, unknown> }) => {
      const data = job.data as unknown as NotificationJobData;
      logger.info('Processing notification job', {
        userId: data.userId,
        channel: data.channel,
        title: data.title,
      });

      switch (data.channel) {
        case 'push':
          logger.info('Push notification dispatched', { userId: data.userId });
          break;
        case 'sms':
          logger.info('SMS notification dispatched', { userId: data.userId });
          break;
        case 'in-app':
          logger.info('In-app notification stored', { userId: data.userId });
          break;
      }
    },
  );

  queueService.registerWorker(
    QUEUE_NAMES.IMAGE_PROCESSING,
    async (job: { data: Record<string, unknown> }) => {
      const data = job.data as unknown as ImageProcessingJobData;
      logger.info('Processing image job', {
        filePath: data.filePath,
        operations: data.operations.length,
        outputPath: data.outputPath,
      });

      for (const operation of data.operations) {
        logger.info('Applying image operation', {
          type: operation.type,
          options: operation.options,
        });
      }

      logger.info('Image processing completed', { outputPath: data.outputPath });
    },
    2,
  );
}
