/**
 * TatvaOps Vision - Think Layer API Router
 * 
 * Routes for spatial planning (Think Layer - Part 2 of 3D Walkthrough)
 */

import { Router } from 'express';
import {
  createSpatialPlanHandler,
  getSpatialPlanHandler,
  deleteSpatialPlanHandler,
} from '../modules/think/think.controller';

const router = Router();

// POST /api/think/plan - Create spatial plan
router.post('/plan', createSpatialPlanHandler);

// GET /api/think/:projectId - Get spatial plan
router.get('/:projectId', getSpatialPlanHandler);

// DELETE /api/think/:projectId - Delete spatial plan
router.delete('/:projectId', deleteSpatialPlanHandler);

export { router as thinkRouter };
