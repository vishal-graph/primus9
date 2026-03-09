/**
 * Coupon validation and discount calculation for plan purchases.
 */

import { prisma } from './prisma';

export type PlanCode = 'STARTER' | 'STANDARD' | 'PRO' | 'PREMIUM';

export interface CouponResult {
  valid: boolean;
  message: string;
  couponId?: string;
  code?: string;
  discountPaise?: number;
  finalAmountPaise?: number;
  discountLabel?: string;
}

function hasCouponModel(): boolean {
  return typeof (prisma as any).coupon?.findUnique === 'function';
}

/**
 * Validate a coupon for a given plan and amount; returns discount and final amount.
 */
export async function validateCoupon(
  code: string,
  planCode: PlanCode,
  amountPaise: number
): Promise<CouponResult> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { valid: false, message: 'Please enter a coupon code.' };
  }

  if (!hasCouponModel()) {
    return { valid: false, message: 'Coupons are not available. Run: npx prisma generate && npx prisma db push' };
  }

  const coupon = await (prisma as any).coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon) {
    return { valid: false, message: 'Invalid or expired coupon code.' };
  }

  const now = new Date();
  if (now < coupon.validFrom) {
    return { valid: false, message: 'This coupon is not yet valid.' };
  }
  if (now > coupon.validTo) {
    return { valid: false, message: 'This coupon has expired.' };
  }

  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, message: 'This coupon has reached its usage limit.' };
  }

  const planCodes = coupon.planCodes as string[] | null;
  if (Array.isArray(planCodes) && planCodes.length > 0 && !planCodes.includes(planCode)) {
    return { valid: false, message: 'This coupon does not apply to the selected plan.' };
  }

  if (coupon.minAmountPaise != null && amountPaise < coupon.minAmountPaise) {
    const minRupees = (coupon.minAmountPaise / 100).toFixed(0);
    return {
      valid: false,
      message: `Minimum order amount for this coupon is ₹${minRupees}.`,
    };
  }

  let discountPaise = 0;
  if (coupon.discountType === 'PERCENT') {
    const pct = Math.min(100, Math.max(0, coupon.discountValue));
    discountPaise = Math.floor((amountPaise * pct) / 100);
  } else {
    discountPaise = Math.min(coupon.discountValue, amountPaise);
  }

  const finalAmountPaise = Math.max(0, amountPaise - discountPaise);

  // Razorpay minimum is 100 paise
  const effectiveFinal = finalAmountPaise < 100 ? 100 : finalAmountPaise;

  let discountLabel = '';
  if (coupon.discountType === 'PERCENT') {
    discountLabel = `${coupon.discountValue}% off`;
  } else {
    discountLabel = `₹${(coupon.discountValue / 100).toFixed(2)} off`;
  }

  return {
    valid: true,
    message: 'Coupon applied successfully.',
    couponId: coupon.id,
    code: coupon.code,
    discountPaise,
    finalAmountPaise: effectiveFinal,
    discountLabel,
  };
}

/**
 * Increment coupon usage after successful payment (call from verify).
 */
export async function recordCouponUse(couponCode: string): Promise<void> {
  if (!hasCouponModel()) return;
  const normalized = couponCode.trim().toUpperCase();
  await (prisma as any).coupon.updateMany({
    where: { code: normalized },
    data: { usedCount: { increment: 1 } },
  });
}
