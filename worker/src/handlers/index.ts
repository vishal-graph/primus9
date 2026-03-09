/**
 * TatvaOps Vision - Worker Handlers
 * 
 * Export all job handlers for the worker pool.
 * Each handler processes messages from a specific SQS queue.
 */

// ===========================================
// Moodboard Generation
// ===========================================
// Extracted from: moodboard-main
// Queue: moodboard-generation
export {
  handleMoodboardGeneration,
  cleanupMoodboardHandler,
} from './moodboard-generation';

// ===========================================
// Floor Plan Analysis
// ===========================================
// Queue: floorplan-analysis
// CRITICAL MODULE: Foundation for all subsequent design stages
export {
  handleFloorPlanAnalysis,
  cleanup as cleanupFloorPlanHandler,
} from './floorplan-analysis';

// ===========================================
// Elevation Generation (DEPRECATED)
// ===========================================
// @deprecated - Use Interior Isometric Generation instead
// Queue: interior-view-generation (shared queue)
// ============================================================
// ❗ DEPRECATED: Room-wise elevations replaced by isometric ❗
// ============================================================
export {
  handleElevationGeneration,
  cleanupElevationHandler,
} from './elevation-generation';

// ===========================================
// Interior Isometric Generation (NEW - SOURCE OF TRUTH)
// ===========================================
// Queue: interior-view-generation
// ============================================================
// ❗ THIS IS THE SINGLE SOURCE OF TRUTH FOR ELEVATIONS ❗
// ❗ ONE IMAGE = ENTIRE FLOOR ❗
// ❗ FLOOR PLAN GEOMETRY IS LAW ❗
// ============================================================
export {
  handleInteriorIsometricGeneration,
  cleanupIsometricHandler,
} from './interior-isometric-generation';

// ===========================================
// Component Update
// ===========================================
// TODO: Implement component injection/update
// Queue: component-update
// export { handleComponentUpdate } from './component-update';

// ===========================================
// Notification
// ===========================================
// Queue: notification
// Handles email (SES) and WhatsApp (MSG91) notifications
export { handleNotification } from './notification';

// ===========================================
// PDF Export
// ===========================================
// Queue: pdf-export
// Generates branded PDF documents from moodboards/elevations
export {
  handlePdfExport,
  cleanupPdfExportHandler,
} from './pdf-export';

// ===========================================
// Sense Inference (3D Walkthrough - Intent Graph)
// ===========================================
// Queue: sense-inference
// Analyzes user inputs and generates structured Intent Graph
export {
  handleSenseInference,
} from './sense-inference';
