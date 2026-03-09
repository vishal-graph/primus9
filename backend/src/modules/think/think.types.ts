/**
 * TatvaOps Vision - Think Layer Types
 * 
 * Types for the Interpretation & Spatial Synthesis Layer (Think Layer)
 * Part 2 of 3D Walkthrough System
 * 
 * This layer converts IntentGraph into SpatialPlan - structured spatial reasoning
 * NO IMAGE GENERATION - only planning and reasoning
 */

// ============================================
// ROOM SPATIAL PLAN
// ============================================

export interface RoomSpatialPlan {
  roomId: string;
  roomName: string;
  roomType?: string;
  applyStyle: boolean;
  visualWeight: number;  // 0-1, priority for visual attention
  density: 'sparse' | 'medium' | 'dense';
  components: {
    primary: string[];     // Main focal points (e.g., "sofa", "bed")
    secondary: string[];   // Supporting elements (e.g., "side table", "lamp")
    ambient: string[];     // Background/atmospheric (e.g., "wall art", "plants")
  };
  layoutLocked: boolean;
  geometrySource: 'floor_plan' | 'inferred';
  geometry?: {
    area?: number;
    dimensions?: { width: number; height: number };
    adjacentRooms?: string[];
  };
}

// ============================================
// COMPONENT PLACEMENT PLAN
// ============================================

export interface ComponentPlacementPlan {
  componentType: string;  // e.g., "sofa", "dining_table", "bed"
  componentCategory: 'furniture' | 'lighting' | 'decor' | 'fixture';
  placementRule: 'anchor' | 'distributed' | 'focal' | 'perimeter';
  constraints: string[];  // e.g., ["against_wall", "near_window", "centered"]
  visualHierarchy: number;  // 1-10, importance in the space
  quantity?: number;  // How many of this component
}

// ============================================
// LIGHTING PLAN
// ============================================

export interface LightingPlan {
  naturalLightBias: number;  // 0-1, reliance on natural light
  artificial: string[];  // e.g., ["ambient", "task", "accent"]
  directionality: 'diffuse' | 'directional' | 'mixed';
  mood: string;  // e.g., "warm-cozy", "bright-energetic", "soft-relaxing"
  lightingSources: Array<{
    type: 'overhead' | 'wall' | 'floor' | 'table' | 'natural';
    intensity: 'low' | 'medium' | 'high';
    color: 'warm' | 'neutral' | 'cool';
  }>;
}

// ============================================
// WALKTHROUGH CAMERA PATH
// ============================================

export interface WalkthroughPlan {
  entryRoom: string;
  cameraHeight: 'human_eye' | 'elevated' | 'ground';
  pathStyle: 'smooth' | 'cinematic' | 'first_person';
  focusPoints: Array<{
    roomId: string;
    roomName: string;
    duration: number;  // seconds to spend in this view
    angle: number;     // degrees from entrance (0-360)
    highlight: string; // What to emphasize in this view
  }>;
  transitions: 'cut' | 'fade' | 'pan';
  totalDuration?: number;  // Total walkthrough time in seconds
}

// ============================================
// CONSTRAINTS
// ============================================

export interface SpatialConstraints {
  layoutLocked: boolean;  // If true, cannot change room layout
  preserveElements: string[];  // Elements that must not change
  mustChangeElements: string[];  // Elements that must be updated
  budgetCategory?: 'economy' | 'moderate' | 'premium';
  timelineConstraint?: 'urgent' | 'standard' | 'flexible';
}

// ============================================
// COMPLETE SPATIAL PLAN
// ============================================

export interface SpatialPlanData {
  rooms: Record<string, RoomSpatialPlan>;  // Keyed by roomId or roomName
  componentPlan: ComponentPlacementPlan[];
  lightingPlan: LightingPlan;
  walkthrough: WalkthroughPlan;
  constraints: SpatialConstraints;
  confidence: number;  // Overall readiness score (0-1)
  reasoning?: string;  // Optional: Why certain decisions were made
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateSpatialPlanRequest {
  projectId: string;
  intentGraphId: string;
  options?: {
    useFloorPlan?: boolean;      // Use existing floor plan if available
    forceRegenerate?: boolean;   // Ignore cache and regenerate
  };
}

export interface CreateSpatialPlanResponse {
  success: boolean;
  data?: {
    spatialPlanId: string;
    readiness: number;
    fromCache: boolean;
    message: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface GetSpatialPlanResponse {
  success: boolean;
  data?: {
    id: string;
    projectId: string;
    intentGraphId: string;
    roomPlans: Record<string, RoomSpatialPlan>;
    componentPlan: ComponentPlacementPlan[];
    lightingPlan: LightingPlan;
    walkthrough: WalkthroughPlan;
    constraints: SpatialConstraints;
    readiness: number;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================
// WORKER PAYLOAD TYPES
// ============================================

export interface SpatialPlanningJobPayload {
  jobId: string;
  userId: string;
  projectId: string;
  intentGraphId: string;
  options?: {
    useFloorPlan?: boolean;
  };
}

// ============================================
// GEMINI API TYPES
// ============================================

export interface GeminiSpatialReasoningInput {
  intentGraph: {
    spaceType: string;
    styleSignals: any;
    componentPreferences: any;
    changeBoundaries: any;
    lifestyleSignals?: any;
    confidence: number;
  };
  existingRooms?: Array<{
    id: string;
    name: string;
    type: string;
    geometry?: any;
  }>;
  constraints: {
    layoutLocked?: boolean;
    preserveElements?: string[];
  };
}

export interface GeminiSpatialReasoningOutput {
  rooms: Record<string, {
    applyStyle: boolean;
    visualWeight: number;
    density: 'sparse' | 'medium' | 'dense';
    components: {
      primary: string[];
      secondary: string[];
      ambient: string[];
    };
    layoutLocked: boolean;
    geometrySource: 'floor_plan' | 'inferred';
  }>;
  componentPlan: Array<{
    componentType: string;
    componentCategory: 'furniture' | 'lighting' | 'decor' | 'fixture';
    placementRule: 'anchor' | 'distributed' | 'focal' | 'perimeter';
    constraints: string[];
    visualHierarchy: number;
  }>;
  lightingPlan: {
    naturalLightBias: number;
    artificial: string[];
    directionality: 'diffuse' | 'directional' | 'mixed';
    mood: string;
    lightingSources: Array<{
      type: string;
      intensity: string;
      color: string;
    }>;
  };
  walkthrough: {
    entryRoom: string;
    cameraHeight: 'human_eye' | 'elevated' | 'ground';
    pathStyle: 'smooth' | 'cinematic' | 'first_person';
    focusPoints: Array<{
      roomId: string;
      duration: number;
      angle: number;
      highlight: string;
    }>;
    transitions: 'cut' | 'fade' | 'pan';
  };
  constraints: {
    layoutLocked: boolean;
    preserveElements: string[];
    mustChangeElements: string[];
  };
  confidence: number;
}
