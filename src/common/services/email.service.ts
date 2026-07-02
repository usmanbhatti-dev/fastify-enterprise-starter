import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { smtpConfig } from '../../config/index.js';
import { isDevelopment } from '../../config/env.js';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (!smtpConfig.user || !smtpConfig.password) {
      return null;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.password,
        },
      });
    }

    return this.transporter;
  }

  async send(input: SendEmailInput): Promise<void> {
    const transporter = this.getTransporter();

    if (!transporter) {
      if (isDevelopment) {
        console.warn(
          `[EmailService] SMTP not configured. Would send to ${input.to}: ${input.subject}`,
        );
        return;
      }

      throw new Error(
        'SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD to send transactional email.',
      );
    }

    await transporter.sendMail({
      from: smtpConfig.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }

  buildVerificationEmail(token: string): { subject: string; html: string; text: string } {
    const subject = 'Verify your email address';
    const text = `Use this token to verify your email: ${token}`;
    const html = `<p>Please verify your email using this token:</p><p><strong>${token}</strong></p>`;
    return { subject, html, text };
  }

  buildPasswordResetEmail(token: string): { subject: string; html: string; text: string } {
    const subject = 'Password reset request';
    const text = `Use this token to reset your password: ${token}`;
    const html = `<p>Reset your password using this token:</p><p><strong>${token}</strong></p>`;
    return { subject, html, text };
  }

  buildWelcomeEmail(firstName: string): { subject: string; html: string; text: string } {
    const subject = 'Welcome to our platform';
    const text = `Welcome, ${firstName}!`;
    const html = `<p>Welcome, <strong>${firstName}</strong>! Your account is now active.</p>`;
    return { subject, html, text };
  }
}
