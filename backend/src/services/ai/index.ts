/**
 * AI Services Index
 * Central export for all AI service modules
 */

export { BaseAIService, type AIServiceConfig, type GenerationResult } from './base';

export {
  FloorPlanAnalysisService,
  floorPlanAnalysisService,
  type FloorPlanInput,
  type FloorPlanOutput,
  type DetectedRoom,
} from './floor-plan-analysis';

export {
  MoodboardGenerationService,
  moodboardGenerationService,
  type MoodboardInput,
  type MoodboardOutput,
} from './moodboard-generation';

export {
  ElevationGenerationService,
  elevationGenerationService,
  type ElevationInput,
  type ElevationOutput,
} from './elevation-generation';

export {
  InteriorViewGenerationService,
  interiorViewGenerationService,
  type InteriorViewInput,
  type InteriorViewOutput,
} from './interior-view-generation';

export {
  ComponentInjectionService,
  componentInjectionService,
  type ComponentInput,
  type ComponentOutput,
} from './component-injection';

/**
 * AI Provider abstraction
 * Allows switching between AI providers (Gemini, OpenAI, etc.)
 */
export interface AIProvider {
  name: string;
  generateText: (prompt: string) => Promise<string>;
  generateImage: (prompt: string) => Promise<string>;
  analyzeImage: (imageData: string, prompt: string) => Promise<string>;
}

// TODO: Implement provider factory for easy switching
// export function createAIProvider(type: 'gemini' | 'openai'): AIProvider { ... }

