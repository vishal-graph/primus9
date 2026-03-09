/**
 * Plan Migration Script
 * 
 * This script:
 * 1. Deprecates any existing Plan records
 * 2. Creates new plans (STARTER, STANDARD, PRO, PREMIUM)
 * 3. Cancels all old active subscriptions
 * 4. Sets ALL existing users to STARTER plan
 * 5. Creates active STARTER subscriptions for all existing users
 * 6. Clears all usage data (regeneration logs)
 * 
 * IMPORTANT: This gives all existing users the STARTER plan as a thank you.
 */

import { PrismaClient } from '@prisma/client';
import { PLAN_CATALOG } from '../src/lib/plan-config';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting plan migration...\n');

  // ============================================
  // Step 1: Deprecate any existing Plans
  // ============================================
  console.log('📋 Deprecating any existing plans...');
  const existingPlansResult = await prisma.plan.updateMany({
    data: {
      status: 'DEPRECATED',
      purchasable: false,
      visible: false,
    },
  });
  console.log(`✅ Deprecated ${existingPlansResult.count} existing plans\n`);

  // ============================================
  // Step 2: Create new plans from PLAN_CATALOG
  // ============================================
  console.log('✨ Creating new plans...');
  for (const [code, planDef] of Object.entries(PLAN_CATALOG)) {
    const plan = await prisma.plan.upsert({
      where: { code },
      create: {
        code: planDef.code,
        name: planDef.name,
        priceInr: planDef.priceInr,
        maxProjects: planDef.maxProjects,
        maxRoomsPerProject: planDef.maxRoomsPerProject,
        regenerationLimit: planDef.regenerationLimit,
        features: planDef.features as any,
        walkthroughQuality: planDef.walkthroughQuality,
        componentExtractor: planDef.componentExtractor,
        dpr: planDef.dpr,
        guidedAssistance: planDef.guidedAssistance,
        benefit: planDef.benefit as any,
        status: planDef.status as any,
        purchasable: planDef.purchasable,
        visible: planDef.visible,
        sortOrder: planDef.sortOrder,
      },
      update: {
        name: planDef.name,
        priceInr: planDef.priceInr,
        maxProjects: planDef.maxProjects,
        maxRoomsPerProject: planDef.maxRoomsPerProject,
        regenerationLimit: planDef.regenerationLimit,
        features: planDef.features as any,
        walkthroughQuality: planDef.walkthroughQuality,
        componentExtractor: planDef.componentExtractor,
        dpr: planDef.dpr,
        guidedAssistance: planDef.guidedAssistance,
        benefit: planDef.benefit as any,
        status: planDef.status as any,
        purchasable: planDef.purchasable,
        visible: planDef.visible,
        sortOrder: planDef.sortOrder,
      },
    });
    console.log(`  ✓ ${plan.name} (${plan.code}) - ₹${plan.priceInr / 100}`);
  }
  console.log('✅ All plans created/updated\n');

  // ============================================
  // Step 3: Cancel all active subscriptions
  // ============================================
  console.log('🔒 Cancelling all active subscriptions...');
  const subscriptionResult = await prisma.subscription.updateMany({
    where: {
      status: 'ACTIVE',
    },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });
  console.log(`✅ Cancelled ${subscriptionResult.count} subscriptions\n`);

  // ============================================
  // Step 4: Set all existing users to STARTER plan
  // ============================================
  console.log('👥 Setting all existing users to STARTER plan...');
  
  // Get all users
  const allUsers = await prisma.user.findMany({
    select: { id: true },
  });
  
  if (allUsers.length > 0) {
    // Update all users to STARTER plan
    const userUpdateResult = await prisma.user.updateMany({
      data: {
        plan: 'STARTER',
      },
    });
    console.log(`✅ Set ${userUpdateResult.count} users to STARTER plan\n`);

    // Create active subscriptions for all existing users (10-year validity)
    console.log('📝 Creating STARTER subscriptions for existing users...');
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 10);

    let subscriptionsCreated = 0;
    for (const user of allUsers) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planCode: 'STARTER',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate,
        },
      });
      subscriptionsCreated++;
    }
    console.log(`✅ Created ${subscriptionsCreated} STARTER subscriptions\n`);
  } else {
    console.log('ℹ️  No existing users found\n');
  }

  // ============================================
  // Step 5: Clear all usage data (regeneration logs)
  // ============================================
  console.log('🧹 Clearing all usage data...');
  const regenLogResult = await prisma.regenerationLog.deleteMany({});
  console.log(`✅ Cleared ${regenLogResult.count} regeneration log entries\n`);

  // ============================================
  // Summary
  // ============================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Migration completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nSummary:');
  console.log(`  • Old plans deprecated: ${existingPlansResult.count}`);
  console.log(`  • New plans created: ${Object.keys(PLAN_CATALOG).length}`);
  console.log(`  • Old subscriptions cancelled: ${subscriptionResult.count}`);
  console.log(`  • Users set to STARTER: ${allUsers.length}`);
  console.log(`  • STARTER subscriptions created: ${allUsers.length}`);
  console.log(`  • Usage data cleared: ${regenLogResult.count} regeneration logs`);
  console.log('\n✨ All existing users now have STARTER plan with fresh usage limits.');
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
