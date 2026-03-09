/**
 * TatvaOps Vision - Sense Layer Controller
 * 
 * HTTP request handlers for Intent Graph API endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import {
  processIntentSchema,
  getIntentGraphSchema,
  refineIntentSchema,
  deleteIntentGraphSchema,
} from './sense.validators';
import {
  processInput,
  getIntentGraph,
  refineIntent,
  deleteIntentGraph,
} from './sense.service';
import { logger } from '../../lib/logger';
import { errors } from '../../lib/error-handler';

/**
 * POST /api/sense/intake
 * Process user inputs and create Intent Graph
 */
export async function processIntentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const input = processIntentSchema.parse(req.body);

    const result = await processInput(userId, input.projectId, input.inputs);

    res.status(result.fromCache ? 200 : 202).json({
      success: true,
      data: {
        ...result,
        message: result.fromCache
          ? 'Intent Graph created from cache'
          : 'Inference job queued',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/sense/:projectId
 * Retrieve Intent Graph for a project
 */
export async function getIntentGraphHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;

    getIntentGraphSchema.parse({ projectId });

    const intentGraph = await getIntentGraph(userId, projectId);

    if (!intentGraph) {
      throw errors.notFound('Intent Graph');
    }

    res.json({
      success: true,
      data: intentGraph,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/sense/:projectId/refine
 * Refine Intent Graph with user corrections
 */
export async function refineIntentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;

    const input = refineIntentSchema.parse({
      projectId,
      refinements: req.body.refinements,
    });

    const updated = await refineIntent(userId, projectId, input.refinements as any);

    logger.info({ projectId, userId }, 'Intent Graph refined');

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/sense/:projectId
 * Delete Intent Graph for a project
 */
export async function deleteIntentGraphHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;

    deleteIntentGraphSchema.parse({ projectId });

    await deleteIntentGraph(userId, projectId);

    logger.info({ projectId, userId }, 'Intent Graph deleted');

    res.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    next(error);
  }
}
