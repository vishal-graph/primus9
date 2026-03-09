/**
 * Plan Guardrails Service
 * 
 * Enforces strict limits for all pricing plans:
 * - Max projects per user
 * - Max rooms per project
 * - Regeneration limits per stage
 * - Feature access gating
 * - Rate limiting
 * 
 * All enforcement is based on the Plan system.
 */

import { prisma } from '../lib/prisma';
import { AIJobType, ProjectStage } from '@prisma/client';
import { logger } from '../lib/logger';
import { errors } from '../lib/error-handler';
import { rateLimit } from '../lib/redis-client';
import { getPlanDefinition, PlanFeatureKey, PlanCode } from '../lib/plan-config';

// ============================================
// Plan Detection
// ============================================

/**
 * Get the user's active plan code from Subscription or User.plan
 */
export async function getActivePlanCode(userId: string): Promise<PlanCode | null> {
  // 1. Check for active subscription
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      endDate: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (subscription && subscription.planCode) {
    return subscription.planCode as PlanCode;
  }

  // 2. Fall back to User.plan (legacy)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (user?.plan === 'STARTER' || user?.plan === 'STANDARD' || user?.plan === 'PRO' || user?.plan === 'PREMIUM') {
    return user.plan as PlanCode;
  }

  return null;
}

/**
 * Get the effective plan code for a project
 * 
 * Priority:
 * 1. Project-level plan (for internal users)
 * 2. User-level subscription/plan
 */
export async function getProjectPlanCode(projectId: string, userId: string): Promise<PlanCode | null> {
  // 1. Check project-level plan (highest priority)
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { planCode: true, planSource: true, userId: true },
  });

  if (!project) {
    return null;
  }

  // Verify ownership
  if (project.userId !== userId) {
    throw errors.forbidden('You do not have access to this project');
  }

  // If project has a plan assigned (internal override), use that
  if (project.planCode && project.planSource === 'INTERNAL_OVERRIDE') {
    return project.planCode as PlanCode;
  }

  // 2. Fall back to user-level plan
  return getActivePlanCode(userId);
}

/**
 * Require that the user/project has an active plan (throws if not)
 */
export async function requireActivePlanForProject(projectId: string, userId: string): Promise<PlanCode> {
  const planCode = await getProjectPlanCode(projectId, userId);
  if (!planCode) {
    throw errors.forbidden(
      'You need an active plan to perform this action. Please purchase a plan to continue.'
    );
  }
  return planCode;
}

/**
 * Require that the user has an active plan (throws if not)
 */
export async function requireActivePlan(userId: string): Promise<PlanCode> {
  const planCode = await getActivePlanCode(userId);
  if (!planCode) {
    throw errors.forbidden(
      'You need an active plan to perform this action. Please purchase a plan to continue.'
    );
  }
  return planCode;
}

// ============================================
// Feature Access Control
// ============================================

/**
 * Check if user has access to a specific feature (for a project)
 */
export async function checkFeatureAccess(userId: string, feature: PlanFeatureKey, projectId?: string): Promise<void> {
  let planCode: PlanCode | null;

  // If projectId provided, check project-level plan first
  if (projectId) {
    planCode = await getProjectPlanCode(projectId, userId);
  } else {
    planCode = await getActivePlanCode(userId);
  }

  if (!planCode) {
    throw errors.forbidden(
      'You need an active plan to access this feature. Please purchase a plan to continue.'
    );
  }

  const plan = getPlanDefinition(planCode);

  if (!plan) {
    throw errors.forbidden('Your plan configuration is invalid. Please contact support.');
  }

  if (!plan.features[feature]) {
    throw errors.forbidden(
      `The "${feature}" feature is not available on your current plan (${plan.name}). Please upgrade to access this feature.`
    );
  }
}

// ============================================
// Project Limit Enforcement
// ============================================

/**
 * Check if user can create a new project (based on plan limits)
 */
export async function checkProjectLimit(userId: string): Promise<void> {
  const planCode = await requireActivePlan(userId);
  const plan = getPlanDefinition(planCode);

  if (!plan) {
    throw errors.forbidden('Your plan configuration is invalid. Please contact support.');
  }

  // Count active projects (not deleted)
  const projectCount = await prisma.project.count({
    where: {
      userId,
      deletedAt: null,
    },
  });

  if (projectCount >= plan.maxProjects) {
    throw errors.forbidden(
      `You have reached your project limit (${plan.maxProjects} projects on ${plan.name} plan). Please upgrade your plan or delete an existing project.`
    );
  }
}

// ============================================
// Room Limit Enforcement
// ============================================

/**
 * Check if a project can have the specified number of rooms (based on plan limits)
 */
export async function checkRoomLimit(userId: string, roomCount: number, projectId?: string): Promise<void> {
  let planCode: PlanCode | null;

  // If projectId provided, check project-level plan first
  if (projectId) {
    planCode = await getProjectPlanCode(projectId, userId);
  } else {
    planCode = await getActivePlanCode(userId);
  }

  if (!planCode) {
    throw errors.forbidden('You need an active plan to create projects with rooms.');
  }

  const plan = getPlanDefinition(planCode);

  if (!plan) {
    throw errors.forbidden('Your plan configuration is invalid. Please contact support.');
  }

  if (roomCount > plan.maxRoomsPerProject) {
    throw errors.forbidden(
      `Your floor plan contains ${roomCount} rooms, but your plan (${plan.name}) supports a maximum of ${plan.maxRoomsPerProject} rooms per project. Please upgrade your plan.`
    );
  }
}

// ============================================
// Regeneration Limit Enforcement
// ============================================

/**
 * Check if user can regenerate for a specific stage
 */
export async function checkRegenerationLimit(userId: string, projectId: string, stage: ProjectStage): Promise<void> {
  // Always check project-level plan for regeneration (since it's project-specific)
  const planCode = await getProjectPlanCode(projectId, userId);

  if (!planCode) {
    throw errors.forbidden('You need an active plan to regenerate.');
  }

  const plan = getPlanDefinition(planCode);

  if (!plan) {
    throw errors.forbidden('Your plan configuration is invalid. Please contact support.');
  }

  // Get regeneration count for this stage
  const regenLog = await prisma.regenerationLog.findUnique({
    where: {
      userId_projectId_stage: {
        userId,
        projectId,
        stage,
      },
    },
  });

  const currentCount = regenLog?.count || 0;

  if (currentCount >= plan.regenerationLimit) {
    throw errors.forbidden(
      `You have reached your regeneration limit for this stage (${plan.regenerationLimit} regenerations on ${plan.name} plan). Please upgrade your plan for more regenerations.`
    );
  }
}

/**
 * Increment regeneration count for a stage
 */
export async function incrementRegenerationCount(userId: string, projectId: string, stage: ProjectStage): Promise<void> {
  await prisma.regenerationLog.upsert({
    where: {
      userId_projectId_stage: {
        userId,
        projectId,
        stage,
      },
    },
    create: {
      userId,
      projectId,
      stage,
      count: 1,
    },
    update: {
      count: { increment: 1 },
    },
  });
}

// ============================================
// Rate Limiting
// ============================================

const RATE_LIMITS = {
  PROJECT_CREATE: { max: 10, windowSec: 3600 }, // 10 projects per hour
  REGENERATION: { max: 20, windowSec: 3600 },   // 20 regenerations per hour
  JOB_CREATE: { max: 50, windowSec: 3600 },     // 50 jobs per hour
};

/**
 * Check rate limit for a specific action
 */
export async function checkRateLimit(userId: string, action: keyof typeof RATE_LIMITS): Promise<void> {
  const limit = RATE_LIMITS[action];
  const key = `${action}:${userId}`;

  const { allowed } = await rateLimit.check(key, limit.max, limit.windowSec);
  if (!allowed) {
    throw errors.tooManyRequests(
      'You are performing this action too frequently. Please wait a moment and try again.'
    );
  }
}

// ============================================
// Job Validation (Complete Guardrails)
// ============================================

/**
 * Map AIJobType to PlanFeatureKey
 */
function getFeatureFromJobType(jobType: AIJobType): PlanFeatureKey | null {
  switch (jobType) {
    case 'FLOORPLAN_ANALYSIS':
      return null; // Floor plan analysis is allowed for all plans
    case 'MOODBOARD':
      return 'moodboard_generation';
    case 'ELEVATION':
      return 'floor_3d_elevation';
    case 'INTERIOR':
      return 'room_2d_views';
    case 'TWO_D_VIEWS':
      return 'room_2d_views';
    case 'COMPONENT_EXTRACTION':
      return 'component_extractor';
    case 'ROOM_WALKTHROUGH':
      return 'room_walkthroughs';
    case 'COMPONENT_UPDATE':
      return 'component_extractor';
    default:
      return null;
  }
}

/**
 * Map AIJobType to ProjectStage for regeneration tracking
 */
function getStageFromJobType(jobType: AIJobType): ProjectStage | null {
  switch (jobType) {
    case 'FLOORPLAN_ANALYSIS':
      return 'FLOOR_PLAN';
    case 'MOODBOARD':
      return 'MOODBOARD';
    case 'ELEVATION':
      return 'ELEVATION';
    case 'INTERIOR':
      return 'INTERIOR';
    case 'TWO_D_VIEWS':
      return 'TWO_D_VIEWS';
    case 'COMPONENT_EXTRACTION':
      return 'COMPONENT';
    case 'ROOM_WALKTHROUGH':
      return 'ROOM_WALKTHROUGH';
    default:
      return null;
  }
}

/**
 * Validate all guardrails for a job creation
 */
export async function validateJobGuardrails(
  userId: string,
  projectId: string,
  jobType: AIJobType,
  isRegeneration: boolean
): Promise<void> {
  // 1. Require active plan (project-level first, then user-level)
  await requireActivePlanForProject(projectId, userId);

  // 2. Check feature access (uses project-level plan)
  const feature = getFeatureFromJobType(jobType);
  if (feature) {
    await checkFeatureAccess(userId, feature, projectId);
  }

  // 3. Check regeneration limit (if applicable) - uses project-level plan
  if (isRegeneration) {
    const stage = getStageFromJobType(jobType);
    if (stage) {
      await checkRegenerationLimit(userId, projectId, stage);
    }
  }

  // 4. Check rate limit
  await checkRateLimit(userId, 'JOB_CREATE');

  logger.info('Job guardrails validated', { userId, projectId, jobType, isRegeneration });
}
