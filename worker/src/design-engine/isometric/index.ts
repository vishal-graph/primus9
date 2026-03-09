/**
 * TatvaOps Vision - Isometric Floor Elevation Design Engine
 * 
 * Full-floor isometric / bird's-eye interior elevation generator.
 * 
 * ============================================================
 * ❗ THIS IS THE SINGLE SOURCE OF TRUTH FOR ELEVATIONS ❗
 * ❗ REPLACES ALL ROOM-WISE ELEVATION LOGIC ❗
 * ============================================================
 * 
 * Pipeline:
 * 1. validateFloorGeometry() - Ensure geometry integrity
 * 2. mapFloorStyles() - Extract styles from moodboards
 * 3. buildIsometricPrompt() - Compose AI prompt
 * 4. generateIsometricElevation() - Generate final image
 */

// Types
export * from './types';

// Geometry Validation (Stage 1)
export {
  validateFloorGeometry,
  generateGeometryHash,
  buildGeometryDescription,
} from './geometryValidator';

// Style Mapping (Stage 2)
export {
  mapFloorStyles,
  getDefaultStyle,
  buildStyleDescription,
} from './styleMapper';

// Prompt Building (Stage 3)
export {
  buildIsometricPrompt,
  buildSimplifiedPrompt,
  buildLayoutConstrainedPrompt,
  validatePrompt,
} from './promptBuilder';

// Layout Renderer (Programmatic Layout Generation)
export {
  renderFloorLayout,
  renderIsometricLayout,
} from './layoutRenderer';

// Main Generator (Stage 4)
export {
  generateIsometricElevation,
  extractFloorGeometry,
} from './generateIsometric';

// Architectural Accuracy (Post-Generation Analysis)
export {
  calculateArchitecturalAccuracy,
} from './architecturalAccuracy';


