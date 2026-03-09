import { Resend } from 'resend';
import { config } from '../../config';
import { logger } from '../../lib/logger';

/**
 * Resend Email Service
 * Clean, Apple-style transactional emails for Primus9
 */

export interface EmailTemplate {
  templateName: string;
  templateData: Record<string, string>;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  template?: EmailTemplate;
  replyTo?: string;
  tags?: Record<string, string>;
}

class EmailService {
  private client: Resend;
  private fromEmail: string;
  private replyToEmail: string;

  constructor() {
    this.client = new Resend(config.resendApiKey);
    this.fromEmail = config.emailFromAddress || 'Primus9 <noreply@primus9.ai>';
    this.replyToEmail = config.emailReplyTo || 'support@primus9.ai';
  }

  /**
   * Send a raw email
   */
  async send(options: SendEmailOptions): Promise<{ messageId: string } | null> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    try {
      // Resend requires at least one of html/text; use empty string fallback so we satisfy the union type
      const html = options.htmlBody ?? options.textBody ?? '';
      const text = options.textBody ?? options.htmlBody ?? '';
      const { data, error } = await this.client.emails.send({
        from: this.fromEmail,
        to: recipients,
        subject: options.subject,
        html,
        text,
        replyTo: options.replyTo || this.replyToEmail,
      });

      if (error) {
        logger.error({ error, recipients, subject: options.subject }, 'Resend email failed');
        return null;
      }

      logger.info({
        messageId: data!.id,
        recipients,
        subject: options.subject,
      }, 'Email sent via Resend');

      return { messageId: data!.id };
    } catch (error) {
      logger.error({ error, recipients, subject: options.subject }, 'Failed to send email');
      return null;
    }
  }

  /**
   * Send a templated email (builds HTML from template name + data)
   */
  async sendTemplated(
    to: string | string[],
    template: EmailTemplate,
    replyTo?: string
  ): Promise<{ messageId: string } | null> {
    const { subject, html } = buildTemplate(template.templateName, template.templateData);

    return this.send({
      to,
      subject,
      htmlBody: html,
      replyTo,
    });
  }
}

export const emailService = new EmailService();

// ============================================================
// Apple-Style Email Templates
// ============================================================

const BRAND = {
  name: 'Primus9',
  color: '#1a1a2e',
  accent: '#6366f1',
  font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
};

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:${BRAND.font};">
<div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
  <div style="padding:32px 40px 24px;text-align:center;background:${BRAND.color};">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;letter-spacing:-0.3px;">${BRAND.name}</h1>
  </div>
  <div style="padding:40px 40px 32px;">${body}</div>
  <div style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
    <p style="margin:0;color:#86868b;font-size:12px;">\u00A9 ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.</p>
  </div>
</div></body></html>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;color:${BRAND.color};font-size:20px;font-weight:600;letter-spacing:-0.3px;">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;color:#1d1d1f;font-size:15px;line-height:1.6;">${text}</p>`;
}

function button(text: string, url: string): string {
  return `<div style="text-align:center;margin:28px 0;">
<a href="${url}" style="display:inline-block;padding:14px 32px;background:${BRAND.accent};color:#fff;text-decoration:none;border-radius:12px;font-size:15px;font-weight:600;">${text}</a>
</div>`;
}

function buildTemplate(name: string, data: Record<string, string>): { subject: string; html: string } {
  switch (name) {
    case 'Welcome':
      return {
        subject: `Welcome to ${BRAND.name}`,
        html: layout('Welcome', [
          heading('Welcome aboard.'),
          paragraph(`Hi ${data.name || 'there'}, thanks for joining ${BRAND.name}. Your AI-powered interior design journey starts now.`),
          button('Go to Dashboard', 'https://primus9.ai/dashboard'),
          paragraph('If you have any questions, just reply to this email.'),
        ].join('')),
      };

    case 'JobCompleted':
      return {
        subject: 'Your design is ready',
        html: layout('Design Ready', [
          heading('Your design is ready.'),
          paragraph(`Your ${data.jobType || 'design'} for <strong>${data.projectName || 'your project'}</strong> has been completed.`),
          button('View Design', `https://primus9.ai/projects/${data.projectId || ''}`),
        ].join('')),
      };

    case 'ExportReady':
      return {
        subject: 'Your PDF export is ready',
        html: layout('Export Ready', [
          heading('Your export is ready.'),
          paragraph(`The PDF for <strong>${data.projectName || 'your project'}</strong> is ready to download.`),
          button('Download PDF', `https://primus9.ai/projects/${data.projectId || ''}`),
        ].join('')),
      };

    case 'PaymentSuccess':
      return {
        subject: 'Payment confirmed',
        html: layout('Payment Confirmed', [
          heading('Payment confirmed.'),
          paragraph(`We've received your payment of <strong>\u20B9${data.amount || '0'}</strong> for the <strong>${data.planName || ''}</strong> plan.`),
          paragraph('Your subscription is now active.'),
          button('Go to Dashboard', 'https://primus9.ai/dashboard'),
        ].join('')),
      };

    case 'PaymentFailed':
      return {
        subject: 'Payment failed',
        html: layout('Payment Failed', [
          heading('Payment could not be processed.'),
          paragraph(`We were unable to process your payment of <strong>\u20B9${data.amount || '0'}</strong>. Please try again or use a different payment method.`),
          button('Retry Payment', 'https://primus9.ai/pricing'),
        ].join('')),
      };

    default:
      return {
        subject: `Update from ${BRAND.name}`,
        html: layout('Notification', [
          heading('You have a new update.'),
          paragraph(data.message || 'Check your dashboard for details.'),
          button('Open Dashboard', 'https://primus9.ai/dashboard'),
        ].join('')),
      };
  }
}

/**
 * Template name constants
 */
export const EMAIL_TEMPLATES = {
  JOB_COMPLETED: 'JobCompleted',
  EXPORT_READY: 'ExportReady',
  PAYMENT_SUCCESS: 'PaymentSuccess',
  PAYMENT_FAILED: 'PaymentFailed',
  WELCOME: 'Welcome',
} as const;
