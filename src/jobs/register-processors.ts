import type { QueueService } from '../queue/queue.service.js';
import type { EmailService } from '../common/services/email.service.js';
import { QUEUE_NAMES } from '../constants/index.js';
import type { EmailJobData, NotificationJobData, ImageProcessingJobData } from '../types/index.js';

export function registerJobProcessors(
  queueService: QueueService,
  emailService: EmailService,
  logger: {
    info: (data: object, msg: string) => void;
    error: (data: object, msg: string) => void;
  },
): void {
  queueService.registerWorker(QUEUE_NAMES.EMAIL, async (job: { data: Record<string, unknown> }) => {
    const data = job.data as unknown as EmailJobData;
    logger.info(
      {
        to: data.to,
        subject: data.subject,
        template: data.template,
      },
      'Processing email job',
    );

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
    logger.info({ to: data.to, subject }, 'Email sent successfully');
  });

  queueService.registerWorker(
    QUEUE_NAMES.NOTIFICATION,
    async (job: { data: Record<string, unknown> }) => {
      const data = job.data as unknown as NotificationJobData;
      logger.info(
        {
          userId: data.userId,
          channel: data.channel,
          title: data.title,
        },
        'Processing notification job',
      );

      switch (data.channel) {
        case 'push':
          logger.info({ userId: data.userId }, 'Push notification dispatched');
          break;
        case 'sms':
          logger.info({ userId: data.userId }, 'SMS notification dispatched');
          break;
        case 'in-app':
          logger.info({ userId: data.userId }, 'In-app notification stored');
          break;
      }
    },
  );

  queueService.registerWorker(
    QUEUE_NAMES.IMAGE_PROCESSING,
    async (job: { data: Record<string, unknown> }) => {
      const data = job.data as unknown as ImageProcessingJobData;
      logger.info(
        {
          filePath: data.filePath,
          operations: data.operations.length,
          outputPath: data.outputPath,
        },
        'Processing image job',
      );

      for (const operation of data.operations) {
        logger.info(
          {
            type: operation.type,
            options: operation.options,
          },
          'Applying image operation',
        );
      }

      logger.info({ outputPath: data.outputPath }, 'Image processing completed');
    },
    2,
  );
}
