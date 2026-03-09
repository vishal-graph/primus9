/**
 * TatvaOps Vision - Sense Layer Routes
 * 
 * API routes for Intent Graph and 3D Walkthrough Sense Layer.
 */

import { Router } from 'express';
import {
  processIntentHandler,
  getIntentGraphHandler,
  refineIntentHandler,
  deleteIntentGraphHandler,
} from '../modules/sense/sense.controller';

const router = Router();

/**
 * POST /api/sense/intake
 * Process user inputs and create Intent Graph
 * 
 * Request body:
 * {
 *   projectId: string,
 *   inputs: {
 *     images?: string[],
 *     floorPlan?: string,
 *     moodboards?: string[],
 *     text?: string,
 *     hints?: { spaceType?, budget?, priority? }
 *   }
 * }
 * 
 * Response:
 * - 200: Intent Graph created from cache (intentGraphId)
 * - 202: Inference job queued (jobId)
 */
router.post('/intake', processIntentHandler);

/**
 * GET /api/sense/:projectId
 * Retrieve Intent Graph for a project
 * 
 * Response:
 * - 200: Intent Graph found
 * - 404: Not found
 */
router.get('/:projectId', getIntentGraphHandler);

/**
 * POST /api/sense/:projectId/refine
 * Refine Intent Graph with user corrections
 * 
 * Request body:
 * {
 *   refinements: Partial<InferredIntent>
 * }
 * 
 * Response:
 * - 200: Intent Graph updated
 */
router.post('/:projectId/refine', refineIntentHandler);

/**
 * DELETE /api/sense/:projectId
 * Delete Intent Graph for a project
 * 
 * Response:
 * - 200: Intent Graph deleted
 * - 404: Not found
 */
router.delete('/:projectId', deleteIntentGraphHandler);

export { router as senseRouter };
