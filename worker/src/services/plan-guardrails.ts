/**
 * Plan Guardrails Service (Worker)
 * 
 * Worker-side plan validation and enforcement.
 * Validates job permissions before processing.
 */

import { PrismaClient, AIJobType, ProjectStage } from '@prisma/client';
import { logger } from '../lib/logger';
import { getPlanDefinition, PlanCode, PlanFeatureKey } from '../lib/plan-config';

// Prisma Client Instance
let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

// ============================================
// Plan Detection
// ============================================

/**
 * Get the user's active plan definition
 */
export async function getActivePlanDefinition(userId: string) {
  const prisma = getPrisma();
  
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
    return getPlanDefinition(subscription.planCode);
  }

  // 2. Fall back to User.plan (legacy)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (user?.plan === 'STARTER' || user?.plan === 'STANDARD' || user?.plan === 'PRO' || user?.plan === 'PREMIUM') {
    return getPlanDefinition(user.plan);
  }

  return null;
}

/**
 * Get the effective plan definition for a project
 * 
 * Priority:
 * 1. Project-level plan (for internal users)
 * 2. User-level subscription/plan
 */
export async function getProjectPlanDefinition(projectId: string, userId: string) {
  const prisma = getPrisma();
  
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
    logger.warn({ projectId, userId, ownerId: project.userId }, 'User does not own project');
    return null;
  }

  // If project has a plan assigned (internal override), use that
  if (project.planCode && project.planSource === 'INTERNAL_OVERRIDE') {
    return getPlanDefinition(project.planCode);
  }

  // 2. Fall back to user-level plan
  return getActivePlanDefinition(userId);
}

// ============================================
// Feature Enforcement
// ============================================

/**
 * Map AIJobType to ProjectStage for regeneration tracking
 */
export function getStageFromJobType(jobType: AIJobType): ProjectStage | null {
  switch (jobType) {
    case 'FLOORPLAN_ANALYSIS':
      return 'FLOOR_PLAN';
    case 'MOODBOARD':
      return 'MOODBOARD';
    case 'INTERIOR_ISOMETRIC':
    case 'ELEVATION':
      return 'ELEVATION';
    case 'TWO_D_VIEWS':
      return 'TWO_D_VIEWS';
    case 'COMPONENT_EXTRACTION':
      return 'COMPONENT';
    case 'ROOM_WALKTHROUGH':
      return 'ROOM_WALKTHROUGH';
    case 'INTERIOR':
      return 'INTERIOR';
    case 'SENSE_INFERENCE':
    case 'SPATIAL_PLANNING':
      return 'SPATIAL_PLANNING';
    default:
      return null;
  }
}

/**
 * Map AIJobType to PlanFeatureKey
 */
export function getFeatureFromJobType(jobType: AIJobType): PlanFeatureKey | null {
  switch (jobType) {
    case 'FLOORPLAN_ANALYSIS':
      return null; // Floor plan analysis is allowed for all plans
    case 'MOODBOARD':
      return 'moodboard_generation';
    case 'INTERIOR_ISOMETRIC':
    case 'ELEVATION':
      return 'floor_3d_elevation';
    case 'TWO_D_VIEWS':
      return 'room_2d_views';
    case 'COMPONENT_EXTRACTION':
      return 'component_extractor';
    case 'ROOM_WALKTHROUGH':
      return 'room_walkthroughs';
    case 'INTERIOR':
      return 'room_2d_views';
    case 'SENSE_INFERENCE':
    case 'SPATIAL_PLANNING':
      return 'room_walkthroughs';
    default:
      return null;
  }
}

// ============================================
// Project Limit Check
// ============================================

/**
 * Check if user has exceeded project limit
 */
export async function checkProjectLimit(userId: string, planCode: string): Promise<boolean> {
  const prisma = getPrisma();
  const plan = getPlanDefinition(planCode);
  if (!plan) return false;

  const projectCount = await prisma.project.count({
    where: {
      userId,
      deletedAt: null,
    },
  });

  return projectCount <= plan.maxProjects;
}

// ============================================
// Regeneration Limit Check
// ============================================

/**
 * Check if user has exceeded regeneration limit for a stage
 */
export async function checkRegenerationLimit(
  userId: string,
  projectId: string,
  stage: ProjectStage,
  planCode: string
): Promise<boolean> {
  const prisma = getPrisma();
  const plan = getPlanDefinition(planCode);
  if (!plan) return false;

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
  return currentCount < plan.regenerationLimit;
}

// ============================================
// Job Validation (Worker)
// ============================================

/**
 * Validate job guardrails before processing
 * 
 * Returns: { allowed: boolean, error?: string }
 */
export async function validateJobGuardrails(
  userId: string,
  projectId: string,
  jobType: AIJobType,
  isRegeneration: boolean
): Promise<{ allowed: boolean; error?: string }> {
  try {
    // 1. Get active plan (project-level first, then user-level)
    const plan = await getProjectPlanDefinition(projectId, userId);
    if (!plan) {
      return {
        allowed: false,
        error: 'NO_ACTIVE_PLAN: User/Project does not have an active plan',
      };
    }

    // 2. Check feature access
    const feature = getFeatureFromJobType(jobType);
    if (feature && !plan.features[feature]) {
      return {
        allowed: false,
        error: `FEATURE_NOT_AVAILABLE: Feature "${feature}" not available on plan ${plan.name}`,
      };
    }

    // 3. Check regeneration limit (if applicable)
    if (isRegeneration) {
      const stage = getStageFromJobType(jobType);
      if (stage) {
        const withinLimit = await checkRegenerationLimit(userId, projectId, stage, plan.code);
        if (!withinLimit) {
          return {
            allowed: false,
            error: `REGENERATION_LIMIT_EXCEEDED: Regeneration limit reached for stage ${stage} on plan ${plan.name}`,
          };
        }
      }
    }

    logger.info('[Worker] Job guardrails validated', {
      userId,
      projectId,
      jobType,
      isRegeneration,
      plan: plan.code,
    });

    return { allowed: true };
  } catch (error) {
    logger.error('[Worker] Error validating job guardrails:', error);
    return {
      allowed: false,
      error: `VALIDATION_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
