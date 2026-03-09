/**
 * Plan Configuration - Worker Copy
 * 
 * Simplified plan definitions for worker-side validation.
 * This is a copy of the backend plan config, minus pricing details.
 */

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
  maxProjects: number;
  maxRoomsPerProject: number;
  regenerationLimit: number;
  features: PlanFeatures;
}

/**
 * PLAN_CATALOG - Worker Copy
 */
export const PLAN_CATALOG: Record<PlanCode, PlanDefinition> = {
  STARTER: {
    code: 'STARTER',
    name: 'Starter',
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
  },
  STANDARD: {
    code: 'STANDARD',
    name: 'Standard',
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
  },
  PRO: {
    code: 'PRO',
    name: 'Pro',
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
  },
  PREMIUM: {
    code: 'PREMIUM',
    name: 'Premium',
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
  },
};

/**
 * Get plan definition by code
 */
export function getPlanDefinition(code: string): PlanDefinition | undefined {
  return PLAN_CATALOG[code as PlanCode];
}

/**
 * Check if a feature is available on a plan
 */
export function hasFeature(planCode: string, feature: PlanFeatureKey): boolean {
  const plan = getPlanDefinition(planCode);
  return plan?.features[feature] ?? false;
}
