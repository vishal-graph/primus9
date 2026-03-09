/**
 * Coupons API – validate coupon for checkout.
 */

import { Router } from 'express';
import { z } from 'zod';
import { validateCoupon, type PlanCode } from '../lib/coupon';
import { errors } from '../lib/error-handler';
import { getPlanDefinition } from '../lib/plan-config';

const router = Router();

const validateSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  planCode: z.enum(['STARTER', 'STANDARD', 'PRO', 'PREMIUM']),
});

/**
 * POST /api/coupons/validate
 * Body: { code, planCode }
 * Returns: { valid, message, discountPaise?, finalAmountPaise?, discountLabel? }
 */
router.post('/validate', async (req, res, next) => {
  try {
    const body = validateSchema.parse(req.body);
    const plan = getPlanDefinition(body.planCode);
    if (!plan) {
      throw errors.badRequest('Invalid plan code', { code: 'INVALID_PLAN' });
    }
    const amountPaise = plan.priceInr;
    const result = await validateCoupon(
      body.code,
      body.planCode as PlanCode,
      amountPaise
    );
    res.json({
      success: true,
      data: {
        valid: result.valid,
        message: result.message,
        discountPaise: result.discountPaise,
        finalAmountPaise: result.finalAmountPaise,
        discountLabel: result.discountLabel,
        couponCode: result.valid ? result.code : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
