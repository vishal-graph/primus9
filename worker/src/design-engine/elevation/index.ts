/**
 * TatvaOps Vision - Elevation Generation Module
 * 
 * 2D Wall Elevation Generation Engine (Floorplan-Strict, Moodboard-Styled)
 * 
 * ============================================================
 * ❗ CORE PRINCIPLES ❗
 * 
 * 1. Floor plan is LAW
 *    - ≤ 5% geometric deviation only
 *    - No hallucinated walls, windows, or doors
 *    - Every elevation corresponds to a real wall
 * 
 * 2. Moodboard informs finishes, NOT structure
 *    - Style affects colors, materials, textures
 *    - Style NEVER changes geometry
 * 
 * 3. 2D elevation ≠ perspective render
 *    - Pure orthographic projection
 *    - Technical architectural output
 *    - Sharp, measurable, professional
 * ============================================================
 * 
 * MULTI-PASS GENERATION:
 * - PASS 1: Geometry validation (text-only reasoning)
 * - PASS 2: Style extraction from moodboard
 * - PASS 3: Wall-specific prompt composition
 * - PASS 4: Image generation
 * 
 * OUTPUT:
 * - 4 elevation images per room (N/E/S/W)
 * - Metadata including geometry hash, style hash
 * - Deviation estimates for quality tracking
 */

// Types
export * from './types';

// Core functions
export {
  generateRoomElevations,
  extractWallGeometry,
  validateGeometry,
  extractStyleFromMoodboard,
  getDefaultStyle,
  buildElevationPrompt,
} from './generateElevation';

// Validators
export {
  generateGeometryHash,
  buildGeometryConstraintString,
} from './geometryValidator';

// Style utilities
export {
  generateStyleHash,
  buildStyleInstructionString,
} from './styleExtractor';

// Prompt utilities
export {
  validatePrompt,
  generatePromptHash,
} from './promptBuilder';


