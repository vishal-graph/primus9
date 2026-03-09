/**
 * TatvaOps Vision - Think Layer Controller
 * 
 * HTTP request handlers for Think Layer API endpoints
 */

import { Request, Response } from 'express';
import { logger } from '../../lib/logger';
import { errors } from '../../lib/error-handler';
import {
  createSpatialPlanSchema,
  getSpatialPlanSchema,
  deleteSpatialPlanSchema,
} from './think.validators';
import * as thinkService from './think.service';

/**
 * POST /api/think/plan
 * Create spatial plan from intent graph
 */
export async function createSpatialPlanHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Validate request body
    const validationResult = createSpatialPlanSchema.safeParse(req.body);
    if (!validationResult.success) {
      logger.warn({ errors: validationResult.error }, 'Validation failed for create spatial plan');
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validationResult.error.errors,
        },
      });
    }

    const { projectId, intentGraphId, options } = validationResult.data;

    logger.info('Creating spatial plan', {
      userId,
      projectId,
      intentGraphId,
    });

    // Create spatial plan
    const result = await thinkService.createSpatialPlan(userId, {
      projectId,
      intentGraphId,
      options,
    });

    logger.info('Spatial plan created successfully', {
      userId,
      projectId,
      spatialPlanId: result.spatialPlanId,
      jobId: result.jobId,
      fromCache: result.fromCache,
    });

    return res.status(result.fromCache ? 200 : 202).json({
      success: true,
      data: {
        spatialPlanId: result.spatialPlanId,
        jobId: result.jobId,
        readiness: result.readiness,
        fromCache: result.fromCache,
        message: result.fromCache
          ? 'Spatial plan retrieved from cache'
          : result.spatialPlanId
          ? 'Spatial plan created'
          : 'Spatial planning job queued',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create spatial plan');

    if (error === errors.notFound('Project')) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' },
      });
    }

    if (error === errors.badRequest('Intent Graph not found or does not belong to this project')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INTENT_GRAPH', message: 'Intent Graph not found or invalid' },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create spatial plan',
      },
    });
  }
}

/**
 * GET /api/think/:projectId
 * Get spatial plan by project ID
 */
export async function getSpatialPlanHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Validate params
    const validationResult = getSpatialPlanSchema.safeParse({
      projectId: req.params.projectId,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project ID',
        },
      });
    }

    const { projectId } = validationResult.data;

    logger.info('Fetching spatial plan', { userId, projectId });

    const spatialPlan = await thinkService.getSpatialPlan(userId, projectId);

    return res.status(200).json({
      success: true,
      data: {
        id: spatialPlan.id,
        projectId: spatialPlan.projectId,
        intentGraphId: spatialPlan.intentGraphId,
        roomPlans: spatialPlan.roomPlans,
        componentPlan: spatialPlan.componentPlan,
        lightingPlan: spatialPlan.lightingPlan,
        walkthrough: spatialPlan.walkthrough,
        constraints: spatialPlan.constraints,
        readiness: spatialPlan.readiness,
        version: spatialPlan.version,
        createdAt: spatialPlan.createdAt,
        updatedAt: spatialPlan.updatedAt,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get spatial plan');

    if (error === errors.notFound('Project')) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' },
      });
    }

    if (error === errors.notFound('SpatialPlan')) {
      return res.status(404).json({
        success: false,
        error: { code: 'SPATIAL_PLAN_NOT_FOUND', message: 'Spatial plan not found for this project' },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch spatial plan',
      },
    });
  }
}

/**
 * DELETE /api/think/:projectId
 * Delete spatial plan
 */
export async function deleteSpatialPlanHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    // Validate params
    const validationResult = deleteSpatialPlanSchema.safeParse({
      projectId: req.params.projectId,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project ID',
        },
      });
    }

    const { projectId } = validationResult.data;

    logger.info('Deleting spatial plan', { userId, projectId });

    await thinkService.deleteSpatialPlan(userId, projectId);

    return res.status(200).json({
      success: true,
      message: 'Spatial plan deleted successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to delete spatial plan');

    if (error === errors.notFound('Project')) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete spatial plan',
      },
    });
  }
}
