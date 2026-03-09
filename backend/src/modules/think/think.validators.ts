/**
 * TatvaOps Vision - Think Layer Validators
 * 
 * Zod validation schemas for Think Layer API requests
 */

import { z } from 'zod';

// ============================================
// CREATE SPATIAL PLAN
// ============================================

export const createSpatialPlanSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  intentGraphId: z.string().uuid('Invalid intent graph ID format'),
  options: z.object({
    useFloorPlan: z.boolean().optional(),
    forceRegenerate: z.boolean().optional(),
  }).optional(),
});

export type CreateSpatialPlanInput = z.infer<typeof createSpatialPlanSchema>;

// ============================================
// GET SPATIAL PLAN
// ============================================

export const getSpatialPlanSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
});

export type GetSpatialPlanInput = z.infer<typeof getSpatialPlanSchema>;

// ============================================
// DELETE SPATIAL PLAN
// ============================================

export const deleteSpatialPlanSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
});

export type DeleteSpatialPlanInput = z.infer<typeof deleteSpatialPlanSchema>;

// ============================================
// REGENERATE SPATIAL PLAN
// ============================================

export const regenerateSpatialPlanSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  intentGraphId: z.string().uuid('Invalid intent graph ID format'),
});

export type RegenerateSpatialPlanInput = z.infer<typeof regenerateSpatialPlanSchema>;
