/**
 * Floor Plan Vision Analysis Engine
 * 
 * Exports for the floor plan analysis module.
 * This is the foundational module for the entire design pipeline.
 * 
 * CORE PRINCIPLE: NEVER MISS A ROOM
 * 
 * Features:
 * - Multi-stage analysis pipeline
 * - Image preprocessing (non-AI)
 * - Gemini Vision integration
 * - Room graph construction
 * - Human-in-the-loop support
 * - Comprehensive error handling
 */

// Main analyzer
export { analyzeFloorPlan } from './analyzer';

// Types
export {
  // Input/Output
  FloorPlanAnalysisInput,
  FloorPlanAnalysisResult,
  
  // Room types
  DetectedRoom,
  RoomType,
  RoomStatus,
  
  // Geometry
  RoomGeometry,
  BoundingBox,
  Point2D,
  
  // Circulation
  CirculationPath,
  CirculationType,
  
  // Symbols
  FloorPlanSymbol,
  
  // Metadata
  ImageMetadata,
  AnalysisWarning,
  
  // Errors
  FloorPlanAnalysisError,
  FloorPlanErrorCode,
  
  // Preprocessing
  PreprocessingResult,
  
  // Gemini types
  GeminiSpatialResponse,
  GeminiTextSymbolResponse,
  GeminiReasoningResponse,
} from './types';

// Preprocessing utilities
export {
  preprocessFloorPlan,
  extractImageMetadata,
  fetchImage,
  validateFloorPlanImage,
} from './preprocessing';

// Room graph utilities
export {
  buildRoomGraph,
  validateRoomGraph,
} from './room-graph';

// Prompts (for customization/debugging)
export {
  SYSTEM_INSTRUCTION,
  PROMPT_COMPREHENSIVE_SINGLE_PASS,
  PROMPT_SPATIAL_SEGMENTATION,
  PROMPT_TEXT_SYMBOL_EXTRACTION,
  PROMPT_ROOM_CLASSIFICATION,
  parseGeminiResponse,
} from './prompts';

// PDF to Images conversion
export {
  convertPdfToImages,
  isPdfBuffer,
  getPdfPageCount,
  PdfPageImage,
  PdfConversionResult,
} from './pdfToImages';

// Spatial enrichment
export {
  enrichFloorPlan,
  type SpatialEnrichment,
  type EnrichedRoom,
} from './enrichment';