/**
 * Plan Configuration - Single Source of Truth
 * 
 * Defines all pricing plans with their limits, features, and pricing.
 * This is the authoritative source for plan enforcement across the system.
 */

// Use string literals instead of Prisma enum to avoid runtime dependency issues
export type PlanStatus = 'ACTIVE' | 'DEPRECATED';
export type PlanCode = 'STARTER' | 'STANDARD' | 'PRO' | 'PREMIUM';
export type PlanFeatureKey =
  | 'moodboard_generation'
  | 'room_2d_views'
  | 'floor_3d_elevation'
  | 'per_room_3d_elevation'
  | 'room_walkthroughs'
  | 'component_extractor'
  | 'dpr'
  | 'guided_assistance';

export interface PlanFeatures {
  moodboard_generation: boolean;
  room_2d_views: boolean;
  floor_3d_elevation: boolean;
  per_room_3d_elevation: boolean;
  room_walkthroughs: boolean;
  component_extractor: boolean;
  dpr: boolean;
  guided_assistance: boolean;
}

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  priceInr: number; // in paise
  maxProjects: number;
  maxRoomsPerProject: number;
  regenerationLimit: number;
  features: PlanFeatures;
  walkthroughQuality?: string;
  componentExtractor?: string;
  dpr?: string;
  guidedAssistance: boolean;
  benefit?: Record<string, any>;
  status: PlanStatus;
  purchasable: boolean;
  visible: boolean;
  sortOrder: number;
}

/**
 * PLAN_CATALOG - Single Source of Truth for All Plans
 * 
 * All plan limits, features, and pricing are defined here.
 */
export const PLAN_CATALOG: Record<PlanCode, PlanDefinition> = {
  STARTER: {
    code: 'STARTER',
    name: 'Starter',
    priceInr: 900, // ₹9 (test price; restore to 349900 for production)
    maxProjects: 1,
    maxRoomsPerProject: 7,
    regenerationLimit: 1,
    features: {
      moodboard_generation: true,
      room_2d_views: true,
      floor_3d_elevation: true,
      per_room_3d_elevation: false,
      room_walkthroughs: false,
      component_extractor: false,
      dpr: false,
      guided_assistance: false,
    },
    walkthroughQuality: undefined,
    componentExtractor: undefined,
    dpr: undefined,
    guidedAssistance: false,
    benefit: undefined,
    status: 'ACTIVE',
    purchasable: true,
    visible: true,
    sortOrder: 1,
  },
  STANDARD: {
    code: 'STANDARD',
    name: 'Standard',
    priceInr: 799900, // ₹7,999
    maxProjects: 2,
    maxRoomsPerProject: 10,
    regenerationLimit: 2,
    features: {
      moodboard_generation: true,
      room_2d_views: true,
      floor_3d_elevation: true,
      per_room_3d_elevation: false,
      room_walkthroughs: true,
      component_extractor: true,
      dpr: false,
      guided_assistance: false,
    },
    walkthroughQuality: '720p/1080p',
    componentExtractor: 'basic',
    dpr: undefined,
    guidedAssistance: false,
    benefit: undefined,
    status: 'ACTIVE',
    purchasable: true,
    visible: true,
    sortOrder: 2,
  },
  PRO: {
    code: 'PRO',
    name: 'Pro',
    priceInr: 1499900, // ₹14,999
    maxProjects: 3,
    maxRoomsPerProject: 15,
    regenerationLimit: 3,
    features: {
      moodboard_generation: true,
      room_2d_views: true,
      floor_3d_elevation: true,
      per_room_3d_elevation: true,
      room_walkthroughs: true,
      component_extractor: true,
      dpr: true,
      guided_assistance: true,
    },
    walkthroughQuality: '1080p/2K',
    componentExtractor: 'standard',
    dpr: 'basic',
    guidedAssistance: true,
    benefit: undefined,
    status: 'ACTIVE',
    purchasable: true,
    visible: true,
    sortOrder: 3,
  },
  PREMIUM: {
    code: 'PREMIUM',
    name: 'Premium',
    priceInr: 2999900, // ₹29,999
    maxProjects: 5,
    maxRoomsPerProject: 20,
    regenerationLimit: 5,
    features: {
      moodboard_generation: true,
      room_2d_views: true,
      floor_3d_elevation: true,
      per_room_3d_elevation: true,
      room_walkthroughs: true,
      component_extractor: true,
      dpr: true,
      guided_assistance: true,
    },
    walkthroughQuality: '4K',
    componentExtractor: 'advanced',
    dpr: 'execution-grade',
    guidedAssistance: true,
    benefit: {
      fee_refunded_or_adjusted_if_execution_with_tatvaops: true,
    },
    status: 'ACTIVE',
    purchasable: true,
    visible: true,
    sortOrder: 4,
  },
};

/**
 * Get plan definition by code
 */
export function getPlanDefinition(code: string): PlanDefinition | undefined {
  return PLAN_CATALOG[code as PlanCode];
}

/**
 * List all visible plans (sorted by sortOrder).
 */
export function listVisiblePlans(): PlanDefinition[] {
  return Object.values(PLAN_CATALOG)
    .filter((plan) => plan.visible && plan.status === 'ACTIVE')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Check if a feature is available on a plan
 */
export function hasFeature(planCode: string, feature: PlanFeatureKey): boolean {
  const plan = getPlanDefinition(planCode);
  return plan?.features[feature] ?? false;
}
