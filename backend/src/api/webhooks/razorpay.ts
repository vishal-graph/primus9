import { Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../../config';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';

/**
 * Razorpay Webhook Handler
 * 
 * Processes:
 * - payment.captured → Activate plan purchase
 * - payment.failed → Mark payment as failed
 * - subscription.activated → Mark subscription active
 * - subscription.cancelled → Handle cancellation
 */

interface RazorpayPaymentEntity {
  id: string;
  order_id?: string;
  amount: number; // Amount in paise
  currency: string;
  status: string;
  method?: string;
  notes?: {
    user_id?: string;
    plan?: string;
  };
}

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  status: string;
  customer_id: string;
  notes?: {
    user_id?: string;
  };
}

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: {
      entity: RazorpayPaymentEntity;
    };
    subscription?: {
      entity: RazorpaySubscriptionEntity;
    };
  };
}


export async function razorpayWebhook(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string;

  // Verify webhook signature
  if (!config.razorpayWebhookSecret) {
    logger.warn({ requestId }, 'Razorpay webhook secret not configured');
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    return res.status(400).json({ error: 'Missing signature header' });
  }

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpayWebhookSecret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    logger.error({ requestId }, 'Razorpay webhook signature mismatch');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    const event = req.body as RazorpayWebhookEvent;
    logger.info({ requestId, event: event.event }, 'Razorpay webhook received');

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment!.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment!.entity);
        break;
      case 'subscription.activated':
        await handleSubscriptionActivated(event.payload.subscription!.entity);
        break;
      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.subscription!.entity);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload.subscription!.entity);
        break;
      case 'subscription.paused':
        await handleSubscriptionPaused(event.payload.subscription!.entity);
        break;
      case 'subscription.resumed':
        await handleSubscriptionResumed(event.payload.subscription!.entity);
        break;
      default:
        logger.info({ requestId, event: event.event }, 'Unhandled Razorpay event');
    }

    return res.json({ received: true });
  } catch (error) {
    logger.error({ requestId, error }, 'Razorpay webhook processing failed');
    return res.status(500).json({ error: 'Processing failed' });
  }
}

/**
 * Handle successful payment capture
 * 
 * NEW: Detects plan purchases and activates subscriptions.
 * Legacy purchases are no longer supported.
 */
async function handlePaymentCaptured(payment: RazorpayPaymentEntity) {
  const userId = payment.notes?.user_id;
  
  if (!userId) {
    logger.error({ paymentId: payment.id }, 'Payment captured without user_id in notes');
    return;
  }

  // Check if payment already processed (idempotency)
  const existingPayment = await prisma.payment.findUnique({
    where: { razorpayPaymentId: payment.id },
  });

  if (existingPayment?.status === 'COMPLETED') {
    logger.info({ paymentId: payment.id }, 'Payment already processed, skipping');
    return;
  }

  // NEW: Check if this is a plan purchase (planCode in notes)
  const planCode = payment.notes?.plan || (payment.order_id?.includes('_STARTER') ? 'STARTER' :
                    payment.order_id?.includes('_STANDARD') ? 'STANDARD' :
                    payment.order_id?.includes('_PRO') ? 'PRO' :
                    payment.order_id?.includes('_PREMIUM') ? 'PREMIUM' : null);

  if (planCode && ['STARTER', 'STANDARD', 'PRO', 'PREMIUM'].includes(planCode)) {
    // NEW FLOW: Activate plan subscription
    try {
      await prisma.$transaction(async (tx) => {
        // Update payment record
        await tx.payment.upsert({
          where: { razorpayPaymentId: payment.id },
          create: {
            userId,
            razorpayPaymentId: payment.id,
            razorpayOrderId: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
            credits: 0,
            status: 'COMPLETED',
            completedAt: new Date(),
            metadata: {
              method: payment.method,
              planCode,
              type: 'PLAN_PURCHASE',
            },
          },
          update: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        // Create subscription (valid for 10 years)
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 10);

        await tx.subscription.create({
          data: {
            userId,
            planCode,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate,
            razorpayOrderId: payment.order_id,
            razorpayPaymentId: payment.id,
          },
        });

        // Update user.plan
        await tx.user.update({
          where: { id: userId },
          data: { plan: planCode as any },
        });

        // Reset regeneration logs (fresh start with new plan)
        await tx.regenerationLog.deleteMany({
          where: { userId },
        });
      });

      logger.info(
        { paymentId: payment.id, userId, planCode },
        'Plan activated via webhook'
      );
      return;
    } catch (error) {
      logger.error({ paymentId: payment.id, planCode, error }, 'Failed to activate plan');
      throw error;
    }
  }

  logger.warn({ paymentId: payment.id }, 'Payment without plan code, skipping');
  return;
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(payment: RazorpayPaymentEntity) {
  const userId = payment.notes?.user_id;

  if (!userId) {
    logger.warn({ paymentId: payment.id }, 'Payment failed without user_id');
    return;
  }

  await prisma.payment.upsert({
    where: { razorpayPaymentId: payment.id },
    create: {
      userId,
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      credits: 0,
      status: 'FAILED',
      failedAt: new Date(),
    },
    update: {
      status: 'FAILED',
      failedAt: new Date(),
    },
  });

  logger.info({ paymentId: payment.id, userId }, 'Payment failed recorded');

  // TODO: Send notification to user about failed payment
}

/**
 * Handle subscription activation
 */
async function handleSubscriptionActivated(subscription: RazorpaySubscriptionEntity) {
  const userId = subscription.notes?.user_id;

  if (!userId) {
    logger.error({ subscriptionId: subscription.id }, 'Subscription without user_id');
    return;
  }

  // Get plan from subscription plan_id
  const plan = getPlanFromId(subscription.plan_id);

  await prisma.$transaction(async (tx) => {
    // Find existing subscription by razorpaySubscriptionId
    const existing = await tx.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (existing) {
      // Update existing subscription
      await tx.subscription.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      // Create new subscription
      await tx.subscription.create({
        data: {
          userId,
          planCode: plan,
          plan: plan as any, // Will be cast to UserPlan enum
          status: 'ACTIVE',
          razorpaySubscriptionId: subscription.id,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Update user plan
    await tx.user.update({
      where: { id: userId },
      data: { plan: plan.toUpperCase() as any },
    });
  });

  logger.info(
    { subscriptionId: subscription.id, userId, plan },
    'Subscription activated'
  );
}

/**
 * Handle subscription renewal charge
 */
async function handleSubscriptionCharged(subscription: RazorpaySubscriptionEntity) {
  const userId = subscription.notes?.user_id;

  if (!userId) {
    logger.error({ subscriptionId: subscription.id }, 'Subscription charged without user_id');
    return;
  }

  const plan = getPlanFromId(subscription.plan_id);

  // Find and update subscription period
  const existing = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: subscription.id },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  logger.info(
    { subscriptionId: subscription.id, userId, plan },
    'Subscription charged'
  );
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(subscription: RazorpaySubscriptionEntity) {
  const userId = subscription.notes?.user_id;

  if (!userId) {
    logger.warn({ subscriptionId: subscription.id }, 'Subscription cancelled without user_id');
    return;
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription.id },
    });

    if (existing) {
      await tx.subscription.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED' },
      });
    }

    // Downgrade user to FREE plan
    await tx.user.update({
      where: { id: userId },
      data: { plan: 'FREE' },
    });
  });

  logger.info({ subscriptionId: subscription.id, userId }, 'Subscription cancelled');
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(subscription: RazorpaySubscriptionEntity) {
  const existing = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: subscription.id },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: 'PAUSED' },
    });
  }

  logger.info({ subscriptionId: subscription.id }, 'Subscription paused');
}

/**
 * Handle subscription resumed
 */
async function handleSubscriptionResumed(subscription: RazorpaySubscriptionEntity) {
  const existing = await prisma.subscription.findFirst({
    where: { razorpaySubscriptionId: subscription.id },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: 'ACTIVE' },
    });
  }

  logger.info({ subscriptionId: subscription.id }, 'Subscription resumed');
}

/**
 * Get plan name from Razorpay plan_id
 */
function getPlanFromId(planId: string): string {
  // Map Razorpay plan IDs to internal plan names
  // This should be configured based on your Razorpay setup
  if (planId.includes('starter')) return 'STARTER';
  if (planId.includes('professional')) return 'PROFESSIONAL';
  if (planId.includes('enterprise')) return 'ENTERPRISE';
  return 'FREE';
}
