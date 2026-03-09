/**
 * Plans API
 * 
 * Handles pricing plan listing, user plan status, and plan purchases.
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { errors } from '../lib/error-handler';
import {
  listVisiblePlans,
  getPlanDefinition,
} from '../lib/plan-config';
import { getActivePlanCode } from '../services/plan-guardrails';
import { validateCoupon, recordCouponUse } from '../lib/coupon';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = Router();

// Razorpay keys trimmed to avoid BOM/whitespace causing 401
const razorpayKeyId = (process.env.RAZORPAY_KEY_ID ?? '').trim();
const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET ?? '').trim();

const razorpay =
  razorpayKeyId && razorpayKeySecret
    ? new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret })
    : null;

// ============================================
// Validation Schemas
// ============================================

const createOrderSchema = z.object({
  planCode: z.enum(['STARTER', 'STANDARD', 'PRO', 'PREMIUM']),
  couponCode: z.string().optional(),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

// ============================================
// Routes
// ============================================

/**
 * GET /api/plans - List all visible plans
 */
router.get('/', async (req, res, next) => {
  try {
    const plans = listVisiblePlans();
    
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/plans/me - Get current user's plan status
 */
router.get('/me', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.query;

    // Get active plan
    const planCode = await getActivePlanCode(userId);
    const plan = planCode ? getPlanDefinition(planCode) : null;

    if (!plan) {
      return res.json({
        success: true,
        data: {
          hasActivePlan: false,
          plan: null,
          projectsUsed: 0,
          projectsRemaining: 0,
          regenerationsLeft: {},
        },
      });
    }

    // Count projects
    const projectsUsed = await prisma.project.count({
      where: {
        userId,
        deletedAt: null,
      },
    });

    // Get regenerations left (if projectId provided)
    let regenerationsLeft: Record<string, number> = {};
    if (projectId) {
      const stages = ['MOODBOARD', 'ELEVATION', 'INTERIOR', 'SPATIAL_PLANNING'];
      
      for (const stage of stages) {
        const regenLog = await prisma.regenerationLog.findUnique({
          where: {
            userId_projectId_stage: {
              userId,
              projectId: projectId as string,
              stage: stage as any,
            },
          },
        });

        const used = regenLog?.count || 0;
        regenerationsLeft[stage] = Math.max(0, plan.regenerationLimit - used);
      }
    }

    res.json({
      success: true,
      data: {
        hasActivePlan: true,
        plan: {
          code: plan.code,
          name: plan.name,
          priceInr: plan.priceInr,
          features: plan.features,
          maxProjects: plan.maxProjects,
          maxRoomsPerProject: plan.maxRoomsPerProject,
          regenerationLimit: plan.regenerationLimit,
        },
        projectsUsed,
        projectsRemaining: Math.max(0, plan.maxProjects - projectsUsed),
        regenerationsLeft,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/plans/order - Create a Razorpay order for a plan
 */
router.post('/order', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const input = createOrderSchema.parse(req.body);

    const plan = getPlanDefinition(input.planCode);
    if (!plan) {
      throw errors.badRequest('Invalid plan code', { code: 'INVALID_PLAN' });
    }

    if (!plan.purchasable) {
      throw errors.badRequest('This plan is not available for purchase', {
        code: 'PLAN_NOT_PURCHASABLE',
      });
    }

    if (!razorpay) {
      throw errors.badRequest('Payments are not configured', {
        code: 'PAYMENT_NOT_CONFIGURED',
      });
    }

    let amountInr = plan.priceInr;
    let appliedCouponCode: string | undefined;

    if (input.couponCode && input.couponCode.trim()) {
      const couponResult = await validateCoupon(
        input.couponCode.trim(),
        input.planCode as 'STARTER' | 'STANDARD' | 'PRO' | 'PREMIUM',
        amountInr
      );
      if (couponResult.valid && couponResult.finalAmountPaise != null) {
        amountInr = couponResult.finalAmountPaise;
        appliedCouponCode = couponResult.code;
      }
    }

    // Razorpay minimum amount is 100 paise (₹1)
    const finalAmount = amountInr > 0 && amountInr < 100 ? 100 : amountInr;

    const orderNotes: Record<string, string> = {
      userId,
      planCode: input.planCode,
      type: 'PLAN_PURCHASE',
    };
    if (appliedCouponCode) orderNotes.couponCode = appliedCouponCode;

    let order: { id: string; amount: number; currency: string };
    try {
      const created = await razorpay.orders.create({
        amount: finalAmount,
        currency: 'INR',
        receipt: `plan_${input.planCode}_${userId.replace(/-/g, '').slice(0, 8)}_${Date.now().toString().slice(-8)}`,
        notes: orderNotes,
      });
      order = {
        id: created.id,
        amount: typeof created.amount === 'number' ? created.amount : Number(created.amount),
        currency: created.currency,
      };
    } catch (razorpayError: unknown) {
      const statusCode = (razorpayError as { statusCode?: number })?.statusCode;
      const errBody = (razorpayError as { error?: { description?: string; code?: string } })?.error;
      logger.warn(
        { userId, planCode: input.planCode, statusCode, razorpayError: errBody },
        'Razorpay order create failed'
      );
      if (statusCode === 401 || errBody?.code === 'BAD_REQUEST_ERROR') {
        throw errors.badRequest(
          'Payment provider authentication failed. Please check Razorpay live keys (key ID and secret) are correct and for the same account.',
          { code: 'RAZORPAY_AUTH_FAILED' }
        );
      }
      throw errors.badRequest(
        errBody?.description ?? 'Could not create payment order. Please try again.',
        { code: 'RAZORPAY_ERROR' }
      );
    }

    logger.info(
      {
        userId,
        planCode: input.planCode,
        orderId: order.id,
        amountInr: finalAmount,
      },
      'Plan order created'
    );

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/plans/verify - Verify payment and activate plan
 */
router.post('/verify', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const input = verifyPaymentSchema.parse(req.body);

    if (!razorpayKeySecret) {
      throw errors.badRequest('Payments are not configured', {
        code: 'PAYMENT_NOT_CONFIGURED',
      });
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== input.razorpay_signature) {
      throw errors.badRequest('Payment verification failed', {
        code: 'INVALID_SIGNATURE',
      });
    }

    // Fetch order details to get plan code
    if (!razorpay) {
      throw errors.badRequest('Payments are not configured', {
        code: 'PAYMENT_NOT_CONFIGURED',
      });
    }
    const order = await razorpay.orders.fetch(input.razorpay_order_id);
    const planCode = order.notes?.planCode as string;

    if (!planCode) {
      throw errors.badRequest('Plan code not found in order', {
        code: 'MISSING_PLAN_CODE',
      });
    }

    const plan = getPlanDefinition(planCode);
    if (!plan) {
      throw errors.badRequest('Invalid plan code', { code: 'INVALID_PLAN' });
    }

    // Create subscription (valid for 10 years)
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 10);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planCode,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate,
        razorpayOrderId: input.razorpay_order_id,
        razorpayPaymentId: input.razorpay_payment_id,
      },
    });

    const couponCode = order.notes?.couponCode as string | undefined;
    if (couponCode) {
      try {
        await recordCouponUse(couponCode);
      } catch (e) {
        logger.warn({ couponCode, err: e }, 'Failed to record coupon use');
      }
    }

    // Update user.plan
    await prisma.user.update({
      where: { id: userId },
      data: { plan: planCode as any },
    });

    // CRITICAL: Reset regeneration logs for this user (fresh start with new plan)
    await prisma.regenerationLog.deleteMany({
      where: { userId },
    });

    logger.info({
      userId,
      planCode,
      subscriptionId: subscription.id,
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
    }, 'Plan activated successfully');

    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          planCode: subscription.planCode,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        },
        plan: {
          name: plan.name,
          features: plan.features,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
