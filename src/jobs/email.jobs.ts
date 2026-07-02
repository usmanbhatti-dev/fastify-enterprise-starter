import type { IQueueService } from '../interfaces/index.js';
import type { EmailJobData } from '../types/index.js';

export async function enqueueWelcomeEmail(
  queueService: IQueueService,
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
  queueService: IQueueService,
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
  queueService: IQueueService,
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
