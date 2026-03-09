/**
 * Notification Services
 * 
 * Architecture:
 * - Centralized notification management
 * - Supports multiple channels: Email (Resend), WhatsApp (MSG91), SMS
 * - All notifications go through BullMQ (Redis) for async processing
 * - Rate limiting per user per channel
 */

export { emailService, type EmailTemplate, type SendEmailOptions } from './email';
export { whatsappService, type WhatsAppTemplate, type SendWhatsAppOptions } from './whatsapp';
export { notificationService, type NotificationRequest } from './notification-service';

