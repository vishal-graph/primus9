/**
 * TatvaOps Vision - Sense Layer Response Parser
 * 
 * Parses Gemini responses for Intent Graph inference.
 * Handles various response formats (JSON, markdown-wrapped JSON, etc.)
 */

import { logger } from '../../lib/logger';
import { DesignEngineError, DesignEngineErrorCode } from '../types';

// ============================================
// TYPES
// ============================================

export interface InferredIntent {
  spaceType: string;
  styleSignals: {
    warmth: 'low' | 'medium' | 'high';
    colorPalette: string[];
    visualDensity: 'sparse' | 'medium' | 'dense';
    era?: string;
  };
  componentPreferences: {
    lighting: string;
    furniture: string[];
    materials: string[];
  };
  changeBoundaries: {
    canChange: string[];
    mustPreserve: string[];
  };
  lifestyleSignals?: {
    hasKids?: boolean;
    hasPets?: boolean;
    entertainmentFocus?: 'low' | 'medium' | 'high';
    workFromHome?: boolean;
    hasElders?: boolean;
    [key: string]: any;
  };
  confidence: number;
  inferredFrom: string[];
}

// ============================================
// PARSER
// ============================================

/**
 * Parse Gemini response and extract Intent Graph JSON
 * 
 * Handles multiple formats:
 * 1. Pure JSON
 * 2. Markdown-wrapped JSON (```json ... ```)
 * 3. JSON with surrounding text
 */
export function parseGeminiResponse(response: string): InferredIntent {
  if (!response || response.trim() === '') {
    throw new DesignEngineError(
      DesignEngineErrorCode.INVALID_RESPONSE_FORMAT,
      'Empty response from Gemini',
      true,
      500
    );
  }

  // Try extracting JSON from markdown code blocks
  const markdownMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch) {
    const jsonStr = markdownMatch[1];
    try {
      const parsed = JSON.parse(jsonStr);
      return validateInferredIntent(parsed);
    } catch (error) {
      logger.error({ error, jsonStr }, 'Failed to parse markdown-wrapped JSON');
    }
  }

  // Try extracting JSON object (look for { ... })
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateInferredIntent(parsed);
    } catch (error) {
      logger.error({ error, jsonMatch: jsonMatch[0] }, 'Failed to parse extracted JSON');
    }
  }

  // Try parsing the entire response as JSON
  try {
    const parsed = JSON.parse(response);
    return validateInferredIntent(parsed);
  } catch (error) {
    logger.error({ error, response }, 'Failed to parse response as JSON');
    throw new DesignEngineError(
      DesignEngineErrorCode.INVALID_RESPONSE_FORMAT,
      'Could not extract valid JSON from Gemini response',
      true,
      500
    );
  }
}

/**
 * Validate and normalize InferredIntent structure
 */
function validateInferredIntent(data: any): InferredIntent {
  // Required fields
  if (!data.spaceType || typeof data.spaceType !== 'string') {
    throw new DesignEngineError(
      DesignEngineErrorCode.INVALID_RESPONSE_FORMAT,
      'Missing or invalid spaceType',
      true,
      500
    );
  }

  if (!data.styleSignals || typeof data.styleSignals !== 'object') {
    throw new DesignEngineError(
      DesignEngineErrorCode.INVALID_RESPONSE_FORMAT,
      'Missing or invalid styleSignals',
      true,
      500
    );
  }

  if (!data.componentPreferences || typeof data.componentPreferences !== 'object') {
    throw new DesignEngineError(
      DesignEngineErrorCode.INVALID_RESPONSE_FORMAT,
      'Missing or invalid componentPreferences',
      true,
      500
    );
  }

  if (!data.changeBoundaries || typeof data.changeBoundaries !== 'object') {
    throw new DesignEngineError(
      DesignEngineErrorCode.INVALID_RESPONSE_FORMAT,
      'Missing or invalid changeBoundaries',
      true,
      500
    );
  }

  // Validate styleSignals structure
  const styleSignals = {
    warmth: validateWarmth(data.styleSignals.warmth),
    colorPalette: validateArray(data.styleSignals.colorPalette, 'colorPalette'),
    visualDensity: validateVisualDensity(data.styleSignals.visualDensity),
    era: data.styleSignals.era || 'contemporary',
  };

  // Validate componentPreferences structure
  const componentPreferences = {
    lighting: data.componentPreferences.lighting || 'balanced',
    furniture: validateArray(data.componentPreferences.furniture, 'furniture'),
    materials: validateArray(data.componentPreferences.materials, 'materials'),
  };

  // Validate changeBoundaries structure
  const changeBoundaries = {
    canChange: validateArray(data.changeBoundaries.canChange, 'canChange'),
    mustPreserve: validateArray(data.changeBoundaries.mustPreserve, 'mustPreserve'),
  };

  // Validate confidence
  let confidence = parseFloat(data.confidence);
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    logger.warn({ confidence: data.confidence }, 'Invalid confidence, defaulting to 0.5');
    confidence = 0.5;
  }

  // Validate inferredFrom
  const inferredFrom = validateArray(data.inferredFrom || [], 'inferredFrom');

  // Lifestyle signals (optional)
  const lifestyleSignals = data.lifestyleSignals || {};

  return {
    spaceType: data.spaceType,
    styleSignals,
    componentPreferences,
    changeBoundaries,
    lifestyleSignals,
    confidence,
    inferredFrom,
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================

function validateWarmth(value: any): 'low' | 'medium' | 'high' {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  logger.warn({ value }, 'Invalid warmth value, defaulting to medium');
  return 'medium';
}

function validateVisualDensity(value: any): 'sparse' | 'medium' | 'dense' {
  if (value === 'sparse' || value === 'medium' || value === 'dense') {
    return value;
  }
  logger.warn({ value }, 'Invalid visualDensity value, defaulting to medium');
  return 'medium';
}

function validateArray(value: any, fieldName: string): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string');
  }
  logger.warn({ value, fieldName }, `Invalid array field, defaulting to empty array`);
  return [];
}
