/**
 * TatvaOps Vision - Design Engine
 * 
 * Public exports for the Design Engine module.
 * The Design Engine handles all AI-based design generation and analysis.
 * 
 * This module is the worker-friendly extraction of moodboard-main.
 * It preserves all generation logic and quality while removing UI dependencies.
 */

// ===========================================
// Types
// ===========================================

export * from './types';

// ===========================================
// Common Utilities
// ===========================================

export { GeminiClient, getGeminiClient, resetGeminiClient } from './common/gemini-client';

// ===========================================
// Moodboard Module
// ===========================================

export {
  // Core generation
  generateMoodboard,
  regenerateMoodboard,
  
  // Image analysis
  analyzeImage,
  analyzeImageWithHints,
  
  // Prompt building
  // ============================================================
  // ❗ DO NOT MODIFY buildMoodboardPrompt - SOURCE OF TRUTH ❗
  // ============================================================
  buildMoodboardPrompt,
  applyRegenerationOverrides,
  hashPrompt,
  buildImageAnalysisPrompt,
  buildSummaryAnalysisPrompt,
  
  // Response parsing
  stripMarkdownFences,
  parseDesignIntentResponse,
  parseSummaryAnalysisResponse,
  validateDesignIntent,
  
  // Intent mapping (NEW - for UI form integration)
  mapIntentToDesignIntent,
  mapIntentToMoodboardInput,
  validateMappedIntent,
  type IntentPayload,
  type RoomContext,
} from './moodboard';

// ===========================================
// Elevation Module
// @deprecated - Use Isometric module instead
// ===========================================

/**
 * @deprecated Room-wise wall elevations are deprecated.
 * Use generateIsometricElevation() from the isometric module instead.
 */
export {
  // Core generation
  generateRoomElevations,
  
  // Geometry utilities
  extractWallGeometry,
  validateGeometry,
  generateGeometryHash as generateWallGeometryHash,
  buildGeometryConstraintString,
  
  // Style utilities
  extractStyleFromMoodboard as extractWallStyleFromMoodboard,
  getDefaultStyle as getDefaultWallStyle,
  generateStyleHash as generateWallStyleHash,
  buildStyleInstructionString,
  
  // Prompt utilities
  buildElevationPrompt,
  validatePrompt as validateWallPrompt,
  generatePromptHash as generateWallPromptHash,
  
  // Types
  type WallDirection,
  type WallGeometry,
  type WallOpening,
  type RoomElevationGeometry,
  type ElevationStyle,
  type WallElevationInput,
  type WallElevationOutput,
  type ElevationJobInput,
  type ElevationJobResult,
  type GeometryValidationResult as WallGeometryValidationResult,
  
  // Constants
  ALL_DIRECTIONS,
  
  // Errors
  ElevationGenerationError,
  ElevationErrorCode,
} from './elevation';

// ===========================================
// Room 2D Views Module
// ===========================================

export {
  generateRoom2DViews,
  type Room2DViewType,
  type Room2DViewInput,
  type Room2DViewOutput,
  type Room2DViewsResult,
} from './room-2d-views';

// ===========================================
// Walkthrough Module (Runway Gen-4 Turbo)
// ===========================================

export {
  generateWalkthrough,
  RunwayClient,
  type WalkthroughJobInput,
  type WalkthroughResult,
  type GenerateWalkthroughInput,
} from './walkthrough';

// ===========================================
// Isometric Module (NEW - SOURCE OF TRUTH)
// ===========================================

/**
 * Full-floor isometric / bird's-eye interior elevation.
 * This is the single source of truth for elevations.
 * 
 * ============================================================
 * ❗ ONE IMAGE = ENTIRE FLOOR ❗
 * ❗ REPLACES ALL ROOM-WISE ELEVATION LOGIC ❗
 * ============================================================
 */
export {
  // Core generation
  generateIsometricElevation,
  extractFloorGeometry,
  
  // Geometry validation (Stage 1)
  validateFloorGeometry,
  generateGeometryHash,
  buildGeometryDescription,
  
  // Style mapping (Stage 2)
  mapFloorStyles,
  getDefaultStyle,
  buildStyleDescription,
  
  // Prompt building (Stage 3)
  buildIsometricPrompt,
  buildSimplifiedPrompt,
  validatePrompt,
  
  // Types
  type FloorGeometry,
  type RoomGeometry,
  type Opening,
  type RoomStyle,
  type FloorStyleMap,
  type IsometricJobInput,
  type IsometricJobOutput,
  type IsometricJobResult,
  type GeometryValidationResult,
  type StyleMappingResult,
  type IsometricPrompt,
  
  // Constants
  MAX_DEVIATION,
  DEFAULT_CEILING_HEIGHT,
  DEFAULT_WALL_THICKNESS,
  MIN_RESOLUTION,
  
  // Errors
  IsometricGenerationError,
  IsometricErrorCode,
} from './isometric';
