/**
 * TatvaOps Vision - Spatial Plan to Rendering Instructions Mapper
 * 
 * Maps SpatialPlan (from Think Layer) to rendering instructions
 * for interior view generation.
 * 
 * This bridges spatial planning → visual rendering
 */

import { logger } from '../../lib/logger';

export interface SpatialPlan {
  id: string;
  roomPlans: Record<string, any>;
  componentPlan: any[];
  lightingPlan: any;
  walkthrough: any;
  constraints: any;
  readiness: number;
}

export interface RenderingInstructions {
  roomId: string;
  roomName: string;
  style: string;
  components: {
    primary: string[];
    secondary: string[];
    ambient: string[];
  };
  lighting: {
    natural: string;
    artificial: string[];
    mood: string;
    intensity: string;
  };
  camera: {
    height: string;
    angle: number;
    focalLength: string;
  };
  density: string;
  constraints: string[];
}

/**
 * Map SpatialPlan to rendering instructions for a specific room
 * 
 * @param spatialPlan - Complete spatial plan from Think Layer
 * @param roomId - Target room for rendering
 * @param viewAngle - Camera angle (degrees)
 * @returns Rendering instructions for the room
 */
export function mapSpatialPlanToRenderingInstructions(
  spatialPlan: SpatialPlan,
  roomId: string,
  viewAngle: number
): RenderingInstructions {
  logger.debug('Mapping SpatialPlan to rendering instructions', {
    spatialPlanId: spatialPlan.id,
    roomId,
    viewAngle,
  });

  // Find room plan
  const roomPlans = spatialPlan.roomPlans;
  const roomPlan = Object.values(roomPlans).find((r: any) => r.roomId === roomId);

  if (!roomPlan) {
    throw new Error(`Room ${roomId} not found in spatial plan`);
  }

  // Map lighting plan
  const lightingPlan = spatialPlan.lightingPlan;
  const lighting = {
    natural: mapNaturalLighting(lightingPlan.naturalLightBias),
    artificial: lightingPlan.artificial,
    mood: lightingPlan.mood,
    intensity: mapLightingIntensity(lightingPlan.lightingSources),
  };

  // Map camera settings
  const walkthroughPlan = spatialPlan.walkthrough;
  const camera = {
    height: mapCameraHeight(walkthroughPlan.cameraHeight),
    angle: viewAngle,
    focalLength: mapFocalLength(walkthroughPlan.pathStyle),
  };

  // Extract constraints
  const constraints = extractRenderingConstraints(
    spatialPlan.constraints,
    roomPlan.layoutLocked
  );

  // Infer style from room components and density
  const style = inferStyleFromPlan(roomPlan);

  const instructions: RenderingInstructions = {
    roomId: roomPlan.roomId,
    roomName: roomPlan.roomName,
    style,
    components: roomPlan.components,
    lighting,
    camera,
    density: roomPlan.density,
    constraints,
  };

  logger.debug('Rendering instructions created', {
    roomName: roomPlan.roomName,
    style,
    componentCount: instructions.components.primary.length + 
                   instructions.components.secondary.length +
                   instructions.components.ambient.length,
  });

  return instructions;
}

// ============================================
// MAPPING HELPERS
// ============================================

/**
 * Map natural light bias to descriptive string
 */
function mapNaturalLighting(bias: number): string {
  if (bias > 0.7) {
    return 'Abundant natural light through large windows, bright and airy atmosphere';
  } else if (bias > 0.4) {
    return 'Balanced natural and artificial lighting, comfortable ambiance';
  } else {
    return 'Primarily artificial lighting, intimate and controlled atmosphere';
  }
}

/**
 * Map lighting sources to intensity description
 */
function mapLightingIntensity(sources: any[]): string {
  const intensityCounts = sources.reduce((acc, source) => {
    acc[source.intensity] = (acc[source.intensity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (intensityCounts.high > intensityCounts.low) {
    return 'high';
  } else if (intensityCounts.low > intensityCounts.high) {
    return 'low';
  }
  return 'medium';
}

/**
 * Map camera height to descriptive string
 */
function mapCameraHeight(height: 'human_eye' | 'elevated' | 'ground'): string {
  switch (height) {
    case 'human_eye':
      return 'Eye level (5.5 feet / 1.65m)';
    case 'elevated':
      return 'Elevated view (7 feet / 2.1m)';
    case 'ground':
      return 'Ground level (3 feet / 0.9m)';
    default:
      return 'Eye level (5.5 feet / 1.65m)';
  }
}

/**
 * Map path style to focal length
 */
function mapFocalLength(pathStyle: 'smooth' | 'cinematic' | 'first_person'): string {
  switch (pathStyle) {
    case 'cinematic':
      return '24mm'; // Wide angle for dramatic effect
    case 'first_person':
      return '50mm'; // Natural perspective
    case 'smooth':
    default:
      return '35mm'; // Standard architectural
  }
}

/**
 * Extract rendering constraints
 */
function extractRenderingConstraints(
  spatialConstraints: any,
  layoutLocked: boolean
): string[] {
  const constraints: string[] = [];

  if (layoutLocked) {
    constraints.push('maintain_layout');
  }

  if (spatialConstraints.preserveElements?.length > 0) {
    constraints.push(`preserve: ${spatialConstraints.preserveElements.join(', ')}`);
  }

  if (spatialConstraints.mustChangeElements?.length > 0) {
    constraints.push(`update: ${spatialConstraints.mustChangeElements.join(', ')}`);
  }

  return constraints;
}

/**
 * Infer overall style description from room plan
 */
function inferStyleFromPlan(roomPlan: any): string {
  const density = roomPlan.density;
  const primary = roomPlan.components.primary;
  
  // Simple style inference based on components and density
  if (density === 'sparse' && primary.includes('minimalist')) {
    return 'minimalist-contemporary';
  }

  if (density === 'dense') {
    return 'eclectic-layered';
  }

  // Default contemporary style
  return 'contemporary';
}
