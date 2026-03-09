/**
 * TatvaOps Vision - Moodboard Module
 * 
 * Public exports for the moodboard generation module.
 * This module is the Design Engine for moodboard generation.
 * 
 * Source: Extracted and refactored from moodboard-main
 */

// Core generation
export { generateMoodboard, regenerateMoodboard } from './generateMoodboard';

// Image analysis
export { analyzeImage, analyzeImageWithHints } from './analyzeImage';

// Prompt building (exposed for testing and debugging)
// ============================================================
// ❗ DO NOT MODIFY buildMoodboardPrompt - SOURCE OF TRUTH ❗
// ============================================================
export {
  buildMoodboardPrompt,
  applyRegenerationOverrides,
  hashPrompt,
  buildImageAnalysisPrompt,
  buildSummaryAnalysisPrompt,
} from './buildPrompt';

// Response parsing
export {
  stripMarkdownFences,
  parseDesignIntentResponse,
  parseSummaryAnalysisResponse,
  validateDesignIntent,
} from './parseGeminiResponse';

// Intent mapping (NEW - for UI form integration)
// Maps IntentPayload from UI forms → DesignIntent for generation
export {
  mapIntentToDesignIntent,
  mapIntentToMoodboardInput,
  validateMappedIntent,
  type IntentPayload,
  type RoomContext,
} from './intentMapper';

