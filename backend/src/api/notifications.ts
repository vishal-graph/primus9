import { Router } from 'express';
import { z } from 'zod';
import { errors } from '../lib/error-handler';
import { notificationService } from '../services/notifications';
import { logger } from '../lib/logger';

const router = Router();

/**
 * Notification API Routes
 * 
 * Architecture Decision:
 * - Notifications are primarily triggered via internal services
 * - These endpoints are for admin/debugging purposes
 * - All notifications go through SQS queue for async processing
 */

// Validation schemas
const sendNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum([
    'JOB_STARTED',
    'JOB_COMPLETED',
    'JOB_FAILED',
    'EXPORT_READY',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'WELCOME',
  ]),
  channels: z.array(z.enum(['EMAIL', 'WHATSAPP', 'SMS'])).min(1),
  recipient: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  data: z.record(z.unknown()),
});

// POST /api/notifications/send - Send notification (admin)
router.post('/send', async (req, res, next) => {
  try {
    // TODO: Add admin auth check
    const input = sendNotificationSchema.parse(req.body);

    const messageId = await notificationService.queue({
      userId: input.userId,
      type: input.type,
      channels: input.channels,
      recipient: input.recipient,
      data: input.data,
    });

    logger.info({
      userId: input.userId,
      type: input.type,
      channels: input.channels,
      messageId,
    }, 'Notification queued via API');

    res.status(202).json({
      success: true,
      data: { messageId },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/logs/:userId - Get notification logs for user
router.get('/logs/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.headers['x-user-id'] as string;

    // Users can only see their own logs, admins can see all
    // TODO: Add proper admin check
    if (userId !== requestingUserId) {
      throw errors.forbidden();
    }

    // TODO: Implement with Prisma
    // const logs = await prisma.notificationLog.findMany({
    //   where: { userId },
    //   orderBy: { createdAt: 'desc' },
    //   take: 50,
    // });

    res.json({
      success: true,
      data: [],
    });
  } catch (error) {
    next(error);
  }
});

export { router as notificationsRouter };

