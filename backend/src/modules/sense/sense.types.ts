/**
 * TatvaOps Vision - Sense Layer Types
 * 
 * Type definitions for the Intent Graph and Sense Layer infrastructure.
 * These types bridge user inputs to AI-inferred design intent.
 */

// ============================================
// INPUT TYPES
// ============================================

export interface IntentGraphInput {
  images?: string[];           // S3 URLs of reference images
  floorPlan?: string;          // S3 URL of floor plan
  moodboards?: string[];       // S3 URLs of moodboard images
  text?: string;               // Minimal user description (max 500 chars)
  hints?: {                    // Optional user hints
    spaceType?: string;
    budget?: 'budget' | 'moderate' | 'premium' | 'luxury';
    priority?: 'speed' | 'quality' | 'cost';
  };
}

// ============================================
// INFERRED INTENT TYPES
// ============================================

export interface StyleSignals {
  warmth: 'low' | 'medium' | 'high';
  colorPalette: string[];
  visualDensity: 'sparse' | 'medium' | 'dense';
  era?: string;
}

export interface ComponentPreferences {
  lighting: string;
  furniture: string[];
  materials: string[];
}

export interface ChangeBoundaries {
  canChange: string[];
  mustPreserve: string[];
}

export interface LifestyleSignals {
  hasKids?: boolean;
  hasPets?: boolean;
  entertainmentFocus?: 'low' | 'medium' | 'high';
  workFromHome?: boolean;
  hasElders?: boolean;
  [key: string]: any; // Allow additional signals
}

export interface InferredIntent {
  spaceType: string;
  styleSignals: StyleSignals;
  componentPreferences: ComponentPreferences;
  changeBoundaries: ChangeBoundaries;
  lifestyleSignals?: LifestyleSignals;
  confidence: number;
  inferredFrom: string[];
}

// ============================================
// INTENT GRAPH
// ============================================

export interface IntentGraph {
  id: string;
  projectId: string;
  userId: string;
  inputs: IntentGraphInput;
  inferred: InferredIntent;
  constraints: Record<string, any>;
  priorities: Record<string, number>;
  confidence: number;
  version: number;
  inputHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface ProcessIntentRequest {
  projectId: string;
  inputs: IntentGraphInput;
}

export interface ProcessIntentResponse {
  success: boolean;
  jobId?: string;
  intentGraphId?: string;
  error?: string;
}

export interface GetIntentGraphResponse {
  success: boolean;
  data?: IntentGraph;
  error?: string;
}

export interface RefineIntentRequest {
  projectId: string;
  refinements: Partial<InferredIntent>;
}

export interface RefineIntentResponse {
  success: boolean;
  data?: IntentGraph;
  error?: string;
}

// ============================================
// WORKER TYPES
// ============================================

export interface SenseInferenceJobPayload {
  jobId: string;
  userId: string;
  projectId: string;
  inputs: IntentGraphInput;
}

export interface SenseInferenceResult {
  inferred: InferredIntent;
  confidence: number;
  processingTimeMs: number;
}
