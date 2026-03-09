/**
 * TatvaOps Vision - Sense Layer Validators
 * 
 * Zod validation schemas for Sense Layer API requests.
 */

import { z } from 'zod';

// ============================================
// INPUT VALIDATION
// ============================================

export const intentGraphInputSchema = z.object({
  images: z.array(z.string().url()).max(10).optional(),
  floorPlan: z.string().url().optional(),
  moodboards: z.array(z.string().url()).max(5).optional(),
  text: z.string().max(500).optional(),
  hints: z.object({
    spaceType: z.string().optional(),
    budget: z.enum(['budget', 'moderate', 'premium', 'luxury']).optional(),
    priority: z.enum(['speed', 'quality', 'cost']).optional(),
  }).optional(),
}).refine(
  (data) => {
    // At least one input must be provided
    return (data.images && data.images.length > 0) ||
           data.floorPlan ||
           (data.moodboards && data.moodboards.length > 0) ||
           (data.text && data.text.trim().length > 0);
  },
  {
    message: 'At least one input (images, floorPlan, moodboards, or text) must be provided',
  }
);

// ============================================
// API REQUEST SCHEMAS
// ============================================

export const processIntentSchema = z.object({
  projectId: z.string().uuid(),
  inputs: intentGraphInputSchema,
});

export const getIntentGraphSchema = z.object({
  projectId: z.string().uuid(),
});

export const refineIntentSchema = z.object({
  projectId: z.string().uuid(),
  refinements: z.object({
    spaceType: z.string().optional(),
    styleSignals: z.object({
      warmth: z.enum(['low', 'medium', 'high']).optional(),
      colorPalette: z.array(z.string()).optional(),
      visualDensity: z.enum(['sparse', 'medium', 'dense']).optional(),
      era: z.string().optional(),
    }).optional(),
    componentPreferences: z.object({
      lighting: z.string().optional(),
      furniture: z.array(z.string()).optional(),
      materials: z.array(z.string()).optional(),
    }).optional(),
    changeBoundaries: z.object({
      canChange: z.array(z.string()).optional(),
      mustPreserve: z.array(z.string()).optional(),
    }).optional(),
    lifestyleSignals: z.record(z.unknown()).optional(),
    confidence: z.number().min(0).max(1).optional(),
    inferredFrom: z.array(z.string()).optional(),
  }),
});

export const deleteIntentGraphSchema = z.object({
  projectId: z.string().uuid(),
});

// ============================================
// UPLOAD VALIDATION
// ============================================

export const uploadSenseInputSchema = z.object({
  projectId: z.string().uuid(),
  fileType: z.enum(['image', 'floorplan', 'moodboard']),
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^(image\/(png|jpeg|jpg|gif|webp))|(application\/pdf)$/),
});
