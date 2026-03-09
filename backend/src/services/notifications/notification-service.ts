import { emailService, EMAIL_TEMPLATES } from './email';
import { whatsappService, WHATSAPP_TEMPLATES } from './whatsapp';
import { aiJobQueue } from '../../workers/queue';
import { rateLimit } from '../../lib/redis-client';
import { logger } from '../../lib/logger';
import { config } from '../../config';

/**
 * Centralized Notification Service
 * 
 * Architecture Decision:
 * - Single entry point for all notifications
 * - Async processing via BullMQ (Redis) queue
 * - Rate limiting per user per channel
 * - Supports email, WhatsApp, SMS (future)
 */

export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

export type NotificationType =
  | 'JOB_STARTED'
  | 'JOB_COMPLETED'
  | 'JOB_FAILED'
  | 'EXPORT_READY'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'WELCOME';

export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  recipient: {
    email?: string;
    phone?: string;
  };
  data: Record<string, unknown>;
}

interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}

class NotificationService {
  // Rate limits per channel (requests per hour)
  private rateLimits: Record<NotificationChannel, number> = {
    EMAIL: 20,
    WHATSAPP: 10,
    SMS: 5,
  };

  /**
   * Send notification (directly, bypasses queue)
   * Use this for synchronous notification needs
   */
  async sendDirect(request: NotificationRequest): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const channel of request.channels) {
      // Check rate limit
      const rateLimitKey = `notification:${request.userId}:${channel}`;
      const { allowed } = await rateLimit.check(
        rateLimitKey,
        this.rateLimits[channel],
        3600 // 1 hour window
      );

      if (!allowed) {
        logger.warn({
          userId: request.userId,
          channel,
          type: request.type,
        }, 'Notification rate limited');

        results.push({
          channel,
          success: false,
          error: 'Rate limit exceeded',
        });
        continue;
      }

      try {
        const result = await this.sendToChannel(channel, request);
        results.push(result);
      } catch (error) {
        logger.error({
          error,
          userId: request.userId,
          channel,
          type: request.type,
        }, 'Failed to send notification');

        results.push({
          channel,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Queue notification for async processing via BullMQ (Redis)
   * Recommended for non-critical notifications
   */
  async queue(request: NotificationRequest): Promise<string> {
    const payload = {
      userId: request.userId,
      type: request.type,
      channel: request.channels[0], // Primary channel
      recipient: request.recipient.email || request.recipient.phone || '',
      templateId: this.getTemplateId(request.type, request.channels[0]),
      variables: request.data as Record<string, unknown>,
    };

    const job = await aiJobQueue.add('NOTIFICATION', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    logger.info({
      userId: request.userId,
      type: request.type,
      channels: request.channels,
      bullmqJobId: job.id,
    }, 'Notification queued to BullMQ');

    return job.id as string;
  }

  /**
   * Send to specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    request: NotificationRequest
  ): Promise<NotificationResult> {
    switch (channel) {
      case 'EMAIL':
        return this.sendEmail(request);
      case 'WHATSAPP':
        return this.sendWhatsApp(request);
      case 'SMS':
        // TODO: Implement SMS
        return { channel, success: false, error: 'SMS not implemented' };
      default:
        return { channel, success: false, error: 'Unknown channel' };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(request: NotificationRequest): Promise<NotificationResult> {
    if (!request.recipient.email) {
      return { channel: 'EMAIL', success: false, error: 'No email address' };
    }

    const templateName = this.getTemplateId(request.type, 'EMAIL');
    const templateData = this.buildTemplateData(request.type, request.data);

    const result = await emailService.sendTemplated(
      request.recipient.email,
      { templateName, templateData }
    );

    return {
      channel: 'EMAIL',
      success: !!result,
      messageId: result?.messageId,
      error: result ? undefined : 'Failed to send email',
    };
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsApp(request: NotificationRequest): Promise<NotificationResult> {
    if (!request.recipient.phone) {
      return { channel: 'WHATSAPP', success: false, error: 'No phone number' };
    }

    if (!whatsappService.isAvailable()) {
      return { channel: 'WHATSAPP', success: false, error: 'WhatsApp service unavailable' };
    }

    const templateId = this.getTemplateId(request.type, 'WHATSAPP');
    const variables = this.buildTemplateData(request.type, request.data);

    const result = await whatsappService.send({
      to: request.recipient.phone,
      template: { templateId, variables },
    });

    return {
      channel: 'WHATSAPP',
      success: !!result,
      messageId: result?.messageId,
      error: result ? undefined : 'Failed to send WhatsApp',
    };
  }

  /**
   * Get template ID for notification type and channel
   */
  private getTemplateId(type: NotificationType, channel: NotificationChannel): string {
    if (channel === 'EMAIL') {
      const emailTemplates: Record<NotificationType, string> = {
        JOB_STARTED: EMAIL_TEMPLATES.JOB_COMPLETED, // Use same template
        JOB_COMPLETED: EMAIL_TEMPLATES.JOB_COMPLETED,
        JOB_FAILED: EMAIL_TEMPLATES.JOB_COMPLETED,
        EXPORT_READY: EMAIL_TEMPLATES.EXPORT_READY,
        PAYMENT_SUCCESS: EMAIL_TEMPLATES.PAYMENT_SUCCESS,
        PAYMENT_FAILED: EMAIL_TEMPLATES.PAYMENT_FAILED,
        WELCOME: EMAIL_TEMPLATES.WELCOME,
      };
      return emailTemplates[type];
    }

    if (channel === 'WHATSAPP') {
      const whatsappTemplates: Record<NotificationType, string> = {
        JOB_STARTED: WHATSAPP_TEMPLATES.JOB_STARTED,
        JOB_COMPLETED: WHATSAPP_TEMPLATES.JOB_COMPLETED,
        JOB_FAILED: WHATSAPP_TEMPLATES.JOB_COMPLETED,
        EXPORT_READY: WHATSAPP_TEMPLATES.EXPORT_READY,
        PAYMENT_SUCCESS: WHATSAPP_TEMPLATES.PAYMENT_SUCCESS,
        PAYMENT_FAILED: WHATSAPP_TEMPLATES.PAYMENT_SUCCESS,
        WELCOME: WHATSAPP_TEMPLATES.JOB_COMPLETED,
      };
      return whatsappTemplates[type];
    }

    return '';
  }

  /**
   * Build template data from notification data
   */
  private buildTemplateData(
    type: NotificationType,
    data: Record<string, unknown>
  ): Record<string, string> {
    // Convert all values to strings for template compatibility
    const stringData: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      stringData[key] = String(value);
    }

    // Add common fields
    stringData.notification_type = type;
    stringData.timestamp = new Date().toISOString();

    return stringData;
  }
}

export const notificationService = new NotificationService();

