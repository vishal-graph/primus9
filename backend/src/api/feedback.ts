/**
 * Feedback API Routes
 * 
 * Endpoints for collecting user feedback:
 * - Submit feedback (structured JSON)
 * - Fire feedback.submitted event
 * - Link to user, project, plan type, feature usage
 */

import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { errors } from '../lib/error-handler';

const router = Router();

// ============================================
// Validation Schemas
// ============================================

const submitFeedbackSchema = z.object({
  projectId: z.string().uuid(),
  rooms: z.array(z.string().uuid()),
  ratings: z.record(z.union([z.number(), z.string()])),
  aiEvaluation: z.record(z.unknown()),
  improvementSignals: z.array(
    z.object({
      id: z.string(),
      priority: z.number().int().min(1),
      explanation: z.string().optional(),
    })
  ),
  businessIntent: z.record(z.unknown()),
  openSignal: z.string().optional(),
  metadata: z.object({
    stagesUsed: z.array(z.string()),
    regenerationCount: z.number().int().min(0),
    timeSpent: z.number().int().min(0).optional(),
    errorsOrRetries: z.number().int().min(0),
    selectedStyles: z.array(z.string()).optional(),
    planType: z.string().optional(),
  }),
});

// ============================================
// API Routes
// ============================================

/**
 * POST /api/feedback
 * Submit user feedback
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const input = submitFeedbackSchema.parse(req.body);

    // Verify project belongs to user
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { userId: true, currentStage: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    if (project.userId !== userId) {
      throw errors.forbidden('Project does not belong to user');
    }

    // Get user's plan type
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      select: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    // Store feedback as structured JSON
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        projectId: input.projectId,
        data: {
          rooms: input.rooms,
          ratings: input.ratings,
          aiEvaluation: input.aiEvaluation,
          improvementSignals: input.improvementSignals,
          businessIntent: input.businessIntent,
          openSignal: input.openSignal,
          metadata: {
            ...input.metadata,
            planType: subscription?.plan || input.metadata.planType,
          },
        } as Prisma.InputJsonValue,
      },
    });

    logger.info(
      {
        feedbackId: feedback.id,
        userId,
        projectId: input.projectId,
        planType: subscription?.plan,
        stagesUsed: input.metadata.stagesUsed,
        regenerationCount: input.metadata.regenerationCount,
      },
      'Feedback submitted'
    );

    // TODO: Fire feedback.submitted event for analytics
    // This can be used for:
    // - Admin dashboards
    // - Product insights
    // - User segmentation
    // - Churn prediction

    res.status(201).json({
      success: true,
      data: {
        id: feedback.id,
        submittedAt: feedback.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/feedback/:projectId
 * Check if feedback exists for a project
 */
router.get('/:projectId', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;

    // Verify project belongs to user
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    if (project.userId !== userId) {
      throw errors.forbidden('Project does not belong to user');
    }

    // Check if feedback exists
    const feedback = await prisma.feedback.findFirst({
      where: {
        userId,
        projectId,
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        exists: !!feedback,
        submittedAt: feedback?.createdAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as feedbackRouter };

