import { config } from '../../config';
import { logger } from '../../lib/logger';

/**
 * MSG91 WhatsApp Service
 * 
 * Architecture Decision:
 * - Uses MSG91 for WhatsApp Business API
 * - Template-based messages only (WhatsApp policy)
 * - Rate limited per user to prevent spam
 */

export interface WhatsAppTemplate {
  templateId: string;
  variables: Record<string, string>;
}

export interface SendWhatsAppOptions {
  to: string; // Phone number with country code
  template: WhatsAppTemplate;
}

class WhatsAppService {
  private authKey: string;
  private senderId: string;
  private baseUrl = 'https://api.msg91.com/api/v5';
  private enabled: boolean;

  constructor() {
    this.authKey = config.msg91AuthKey || '';
    this.senderId = config.msg91SenderId || '';
    this.enabled = config.msg91Enabled && !!this.authKey;
  }

  /**
   * Check if WhatsApp service is available
   */
  isAvailable(): boolean {
    return this.enabled;
  }

  /**
   * Send a WhatsApp template message
   */
  async send(options: SendWhatsAppOptions): Promise<{ messageId: string } | null> {
    if (!this.enabled) {
      logger.warn('WhatsApp service is disabled');
      return null;
    }

    // Normalize phone number (remove spaces, ensure country code)
    const phoneNumber = this.normalizePhoneNumber(options.to);

    try {
      const response = await fetch(`${this.baseUrl}/whatsapp/whatsapp-outbound-message/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': this.authKey,
        },
        body: JSON.stringify({
          integrated_number: this.senderId,
          content_type: 'template',
          payload: {
            to: phoneNumber,
            type: 'template',
            template: {
              name: options.template.templateId,
              language: {
                code: 'en',
                policy: 'deterministic',
              },
              components: this.buildTemplateComponents(options.template.variables),
            },
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`MSG91 API error: ${error}`);
      }

      const result = await response.json() as { request_id?: string };
      
      logger.info({
        messageId: result.request_id,
        to: phoneNumber,
        template: options.template.templateId,
      }, 'WhatsApp message sent via MSG91');

      return { messageId: result.request_id || 'unknown' };
    } catch (error) {
      logger.error({
        error,
        to: phoneNumber,
        template: options.template.templateId,
      }, 'Failed to send WhatsApp message via MSG91');
      return null;
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');
    
    // Add India country code if not present and number is 10 digits
    if (normalized.length === 10) {
      normalized = '91' + normalized;
    }
    
    return normalized;
  }

  /**
   * Build MSG91 template components from variables
   */
  private buildTemplateComponents(variables: Record<string, string>) {
    const parameters = Object.entries(variables).map(([, value]) => ({
      type: 'text',
      text: value,
    }));

    return [
      {
        type: 'body',
        parameters,
      },
    ];
  }
}

export const whatsappService = new WhatsAppService();

/**
 * WhatsApp template definitions
 * These must be pre-approved in MSG91/WhatsApp Business
 */
export const WHATSAPP_TEMPLATES = {
  JOB_STARTED: 'tatvaops_job_started',
  JOB_COMPLETED: 'tatvaops_job_completed',
  EXPORT_READY: 'tatvaops_export_ready',
  PAYMENT_SUCCESS: 'tatvaops_payment_success',
} as const;

