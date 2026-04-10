import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

/**
 * User API Routes
 * Handles user profile and onboarding
 */

// ============================================
// Validation Schemas
// ============================================

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  company: z.string().max(100).optional(),
  occupation: z.string().max(100).optional(),
});

const onboardingSchema = z.object({
  phone: z.string().min(10).max(20),
  name: z.string().min(1).max(100),
  location: z.string().max(200).optional(),
});

// ============================================
// User Routes
// ============================================

// GET /api/user/profile - Get current user profile
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    next(error);
  }
});

// GET /api/user/me - Get current user with internal status
router.get('/me', async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        isInternal: true,
        internalRole: true,
        onboarded: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    next(error);
  }
});

// PATCH /api/user/profile - Update current user profile
router.patch('/profile', async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validatedData = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error('Error updating profile:', error);
    next(error);
  }
});

// POST /api/user/onboarding - Complete onboarding and collect full profile
router.post('/onboarding', async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const validatedData = onboardingSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        phone: validatedData.phone,
        name: validatedData.name,
        location: validatedData.location,
        onboarded: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error('Error in onboarding:', error);
    next(error);
  }
});

export { router as userRouter };
