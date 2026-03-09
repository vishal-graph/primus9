/**
 * TatvaOps Vision - Notification Handler
 * 
 * Processes notification queue messages and sends via appropriate channels.
 * Supports Email (AWS SES) and WhatsApp (MSG91).
 */

import { Message } from '@aws-sdk/client-sqs';
import { SESClient, SendEmailCommand, SendTemplatedEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../config';
import { logger } from '../lib/logger';

// ===========================================
// Types
// ===========================================

interface NotificationPayload {
  id: string;
  userId: string;
  type: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS';
  recipient: string;
  templateId: string;
  variables: Record<string, unknown>;
  metadata?: {
    correlationId?: string;
    timestamp?: string;
  };
}

// ===========================================
// Handler
// ===========================================

/**
 * Handle a notification job from SQS.
 * 
 * @param message - SQS message
 * @returns True if processed successfully, false if should retry
 */
export async function handleNotification(message: Message): Promise<boolean> {
  const messageId = message.MessageId || 'unknown';
  
  logger.info('Processing notification job', { messageId });

  let payload: NotificationPayload;
  try {
    payload = JSON.parse(message.Body || '{}');
  } catch (error) {
    logger.error('Failed to parse notification payload', {
      messageId,
      error: String(error),
    });
    return true; // Don't retry malformed messages
  }

  const { userId, type, channel, recipient, templateId, variables } = payload;

  if (!channel || !recipient || !templateId) {
    logger.error('Missing required notification fields', {
      messageId,
      channel,
      recipient,
      templateId,
    });
    return true;
  }

  try {
    switch (channel) {
      case 'EMAIL':
        await sendEmail(recipient, templateId, variables);
        break;
      case 'WHATSAPP':
        await sendWhatsApp(recipient, templateId, variables);
        break;
      case 'SMS':
        logger.warn('SMS channel not implemented', { messageId });
        break;
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }

    logger.info('Notification sent successfully', {
      messageId,
      userId,
      type,
      channel,
    });

    return true;

  } catch (error) {
    logger.error('Notification failed', {
      messageId,
      userId,
      type,
      channel,
      error: String(error),
    });

    // Allow retry for transient errors
    return false;
  }
}

// ===========================================
// Email (AWS SES)
// ===========================================

async function sendEmail(
  recipient: string,
  templateId: string,
  variables: Record<string, unknown>
): Promise<void> {
  const sesClient = new SESClient({
    region: config.awsRegion,
    credentials: config.awsAccessKeyId
      ? {
          accessKeyId: config.awsAccessKeyId,
          secretAccessKey: config.awsSecretAccessKey,
        }
      : undefined,
  });

  // Check if using template or direct email
  if (templateId.startsWith('direct:')) {
    // Direct email (subject and body in variables)
    const command = new SendEmailCommand({
      Source: 'noreply@tatvaops.com',
      Destination: {
        ToAddresses: [recipient],
      },
      Message: {
        Subject: {
          Data: String(variables.subject || 'TatvaOps Notification'),
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: String(variables.body || ''),
            Charset: 'UTF-8',
          },
        },
      },
    });

    const result = await sesClient.send(command);
    logger.debug('Direct email sent via SES', { messageId: result.MessageId });

  } else {
    // Template email
    const templateData: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      templateData[key] = String(value);
    }

    const command = new SendTemplatedEmailCommand({
      Source: 'noreply@tatvaops.com',
      Destination: {
        ToAddresses: [recipient],
      },
      Template: templateId,
      TemplateData: JSON.stringify(templateData),
    });

    const result = await sesClient.send(command);
    logger.debug('Template email sent via SES', { messageId: result.MessageId });
  }
}

// ===========================================
// WhatsApp (MSG91)
// ===========================================

async function sendWhatsApp(
  recipient: string,
  templateId: string,
  variables: Record<string, unknown>
): Promise<void> {
  // TODO: Implement MSG91 WhatsApp integration
  // This requires MSG91 API credentials to be configured
  
  logger.warn('WhatsApp sending not yet implemented', {
    recipient,
    templateId,
  });

  // Placeholder - throw to allow retry when implemented
  // throw new Error('WhatsApp channel not implemented');
}
