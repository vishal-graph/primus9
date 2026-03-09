/**
 * Seed sample coupons for testing. Run after db push:
 * npx tsx prisma/seed-coupons.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const validTo = new Date(now);
  validTo.setFullYear(validTo.getFullYear() + 1);

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    create: {
      code: 'WELCOME10',
      discountType: 'PERCENT',
      discountValue: 10,
      minAmountPaise: 100, // ₹1 min
      planCodes: null, // all plans
      validFrom: now,
      validTo,
      maxUses: 1000,
      usedCount: 0,
    },
    update: {},
  });

  await prisma.coupon.upsert({
    where: { code: 'STARTER99' },
    create: {
      code: 'STARTER99',
      discountType: 'PERCENT',
      discountValue: 50,
      minAmountPaise: 100,
      planCodes: ['STARTER'],
      validFrom: now,
      validTo,
      maxUses: null,
      usedCount: 0,
    },
    update: {},
  });

  console.log('Seed coupons: WELCOME10 (10% off), STARTER99 (50% off Starter) created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
