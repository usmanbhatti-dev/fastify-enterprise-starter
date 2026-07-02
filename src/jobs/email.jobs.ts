import type { QueueService } from '../queue/queue.service.js';
import type { EmailJobData } from '../types/index.js';

export async function enqueueWelcomeEmail(
  queueService: QueueService,
  email: string,
  firstName: string,
): Promise<string> {
  const data: EmailJobData = {
    to: email,
    subject: 'Welcome to our platform',
    template: 'welcome',
    context: { firstName },
    priority: 'high',
  };

  return queueService.addEmailJob(data);
}

export async function enqueuePasswordResetEmail(
  queueService: QueueService,
  email: string,
  resetToken: string,
): Promise<string> {
  const data: EmailJobData = {
    to: email,
    subject: 'Password Reset Request',
    template: 'password-reset',
    context: { resetToken },
    priority: 'high',
  };

  return queueService.addEmailJob(data);
}

export async function enqueueEmailVerification(
  queueService: QueueService,
  email: string,
  verificationToken: string,
): Promise<string> {
  const data: EmailJobData = {
    to: email,
    subject: 'Verify your email address',
    template: 'email-verification',
    context: { verificationToken },
    priority: 'high',
  };

  return queueService.addEmailJob(data);
}
