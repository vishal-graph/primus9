/**
 * Admin API Routes
 * 
 * Internal observability endpoints for @tatvaops.com admins
 * All endpoints are READ-ONLY
 * 
 * Routes:
 * - GET /api/admin/stats - Dashboard overview metrics
 * - GET /api/admin/users - Users list with anomaly detection
 * - GET /api/admin/users/:userId - User 360° profile
 * - GET /api/admin/feedback - Feedback submissions list
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { errors } from '../lib/error-handler';
import { detectUserAnomalies, AnomalyFlag } from '../services/anomaly-detection';
import { redisClient } from '../lib/redis-client';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const getUsersQuerySchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('50').transform(Number),
  search: z.string().optional(),
  filter: z.enum(['all', 'anomaly', 'high_regen', 'feedback_submitted']).optional(),
  plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'NEW_YEAR_UNLIMITED_2025']).optional(),
});

const getFeedbackQuerySchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('50').transform(Number),
  sort: z.enum(['createdAt', 'overallScore']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get cached stats with 5-minute TTL
 */
async function getCachedStats() {
  const CACHE_KEY = 'admin:stats';
  const CACHE_TTL = 300; // 5 minutes

  try {
    // Try to get from cache
    const cached = await redisClient.get<any>(CACHE_KEY);
    if (cached) {
      return cached;
    }
  } catch (error) {
    logger.warn({ error }, 'Redis cache read failed, computing stats');
  }

  // Compute fresh stats
  const stats = await computeDashboardStats();

  // Cache for next time
  try {
    await redisClient.set(CACHE_KEY, stats, CACHE_TTL);
  } catch (error) {
    logger.warn({ error }, 'Redis cache write failed');
  }

  return stats;
}

/**
 * Compute dashboard overview statistics
 */
async function computeDashboardStats() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [
    totalUsers,
    users24h,
    activeUsers7d,
    totalProjects,
    projects7d,
    totalGenerations,
    totalRegenerations,
  ] = await Promise.all([
    // Total users
    prisma.user.count(),

    // Users created in last 24h
    prisma.user.count({
      where: { createdAt: { gte: last24h } },
    }),

    // Active users in last 7 days (users with AI jobs)
    prisma.aIJob.findMany({
      where: { createdAt: { gte: last7d } },
      select: { userId: true },
      distinct: ['userId'],
    }).then((jobs) => jobs.length),

    // Total projects
    prisma.project.count({
      where: { deletedAt: null },
    }),

    // Projects created in last 7 days
    prisma.project.count({
      where: {
        createdAt: { gte: last7d },
        deletedAt: null,
      },
    }),

    // Total AI generations
    prisma.aIJob.count({
      where: {
        type: {
          in: ['MOODBOARD', 'ELEVATION', 'INTERIOR', 'INTERIOR_ISOMETRIC'],
        },
        status: 'COMPLETED',
      },
    }),

    // Total regenerations
    prisma.regenerationLog.aggregate({
      _sum: { count: true },
    }).then((result) => result._sum.count || 0),

  ]);

  // Calculate averages
  const avgProjectsPerUser = totalUsers > 0 ? (totalProjects / totalUsers).toFixed(1) : '0.0';

  return {
    totalUsers,
    activeUsers7d,
    totalProjects,
    totalGenerations,
    totalRegenerations,
    avgProjectsPerUser: parseFloat(avgProjectsPerUser),
    trends: {
      users24h,
      projects7d,
    },
  };
}

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * GET /api/admin/stats
 * Dashboard overview metrics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getCachedStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching admin stats');
    next(error);
  }
});

/**
 * GET /api/admin/users
 * List all users with pagination, filtering, and anomaly detection
 */
router.get('/users', async (req, res, next) => {
  try {
    const query = getUsersQuerySchema.parse(req.query);
    
    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search by email or name
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { id: { contains: query.search } },
      ];
    }

    // Filter by plan
    if (query.plan) {
      where.plan = query.plan;
    }

    // Fetch users with related data
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              projects: {
                where: { deletedAt: null },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Enrich with additional stats and anomaly detection
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        // Get AI job counts
        const [totalGenerations, totalRegenerations] = await Promise.all([
          prisma.aIJob.count({
            where: {
              userId: user.id,
              type: {
                in: ['MOODBOARD', 'ELEVATION', 'INTERIOR', 'INTERIOR_ISOMETRIC'],
              },
              status: 'COMPLETED',
            },
          }),
          prisma.regenerationLog.aggregate({
            where: { userId: user.id },
            _sum: { count: true },
          }).then((result) => result._sum.count || 0),
        ]);

        // Detect anomalies
        let anomalyFlags: AnomalyFlag[] = [];
        if (query.filter === 'anomaly' || query.filter === 'all' || !query.filter) {
          anomalyFlags = await detectUserAnomalies(user.id);
        }

        // Filter out users without anomalies if anomaly filter is active
        if (query.filter === 'anomaly' && anomalyFlags.length === 0) {
          return null;
        }

        // Filter high regen users
        if (query.filter === 'high_regen' && totalRegenerations < 10) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          plan: user.plan,
          totalProjects: user._count.projects,
          totalGenerations,
          totalRegenerations,
          accountCreatedAt: user.createdAt,
          lastActiveAt: user.updatedAt,
          anomalyFlags,
        };
      })
    );

    // Filter out nulls (users that didn't match filters)
    const filteredUsers = enrichedUsers.filter((u) => u !== null);

    res.json({
      success: true,
      data: filteredUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error({ error }, 'Error fetching admin users');
    next(error);
  }
});

/**
 * GET /api/admin/users/:userId
 * Get 360° user profile with comprehensive data
 */
router.get('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Fetch user with all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          where: { deletedAt: null },
          include: {
            rooms: true,
            _count: {
              select: {
                aiJobs: {
                  where: {
                    status: 'COMPLETED',
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        feedback: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw errors.notFound('User');
    }

    // Get regeneration statistics
    const regenLogs = await prisma.regenerationLog.findMany({
      where: { userId },
    });
    const totalRegens = regenLogs.reduce((sum, log) => sum + log.count, 0);
    const regenRatio = user.projects.length > 0 ? totalRegens / user.projects.length : 0;

    // Get AI usage breakdown
    const aiJobs = await prisma.aIJob.groupBy({
      by: ['type'],
      where: {
        userId,
        status: 'COMPLETED',
      },
      _count: true,
    });

    const aiUsage = {
      moodboardGens: aiJobs.find((j) => j.type === 'MOODBOARD')?._count || 0,
      elevationGens: (aiJobs.find((j) => j.type === 'ELEVATION')?._count || 0) + 
                      (aiJobs.find((j) => j.type === 'INTERIOR_ISOMETRIC')?._count || 0),
      interiorGens: aiJobs.find((j) => j.type === 'INTERIOR')?._count || 0,
      floorplanAnalysis: aiJobs.find((j) => j.type === 'FLOORPLAN_ANALYSIS')?._count || 0,
    };

    // Process feedback summary
    const feedbackData = user.feedback.map((f: any) => f.data);
    const avgSatisfaction = feedbackData.length > 0
      ? feedbackData.reduce((sum: number, f: any) => {
          const overallScore = f?.ratings?.overallExperience || 0;
          return sum + overallScore;
        }, 0) / feedbackData.length
      : 0;

    // Extract common improvement signals
    const allSignals: string[] = [];
    feedbackData.forEach((f: any) => {
      if (f?.improvementSignals) {
        f.improvementSignals.forEach((signal: any) => {
          if (signal.id) allSignals.push(signal.id);
        });
      }
    });
    const signalCounts: Record<string, number> = {};
    allSignals.forEach((signal) => {
      signalCounts[signal] = (signalCounts[signal] || 0) + 1;
    });
    const commonSignals = Object.entries(signalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([signal]) => signal);

    // Build projects summary
    const projects = user.projects.map((project) => {
      const metadata = project.metadata as any;
      return {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        roomCount: project.rooms.length,
        theme: metadata?.designIntent?.theme || 'N/A',
        totalGenerations: project._count.aiJobs,
        totalRegenerations: regenLogs.find((l) => l.projectId === project.id)?.count || 0,
        exportCount: project.currentStage === 'EXPORT' ? 1 : 0,
      };
    });

    // Response
    res.json({
      success: true,
      data: {
        basicInfo: {
          id: user.id,
          email: user.email,
          name: user.name,
          signupDate: user.createdAt,
          plan: user.plan,
          status: user.deletedAt ? 'inactive' : 'active',
        },
        projects,
        feedbackSummary: {
          count: user.feedback.length,
          avgSatisfaction: parseFloat(avgSatisfaction.toFixed(2)),
          commonSignals,
          lastFeedbackAt: user.feedback[0]?.createdAt || null,
        },
        aiUsage,
      },
    });
  } catch (error) {
    logger.error({ error, userId: req.params.userId }, 'Error fetching user profile');
    next(error);
  }
});

/**
 * GET /api/admin/feedback
 * List all feedback submissions with pagination and filtering
 */
router.get('/feedback', async (req, res, next) => {
  try {
    const query = getFeedbackQuerySchema.parse(req.query);
    
    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (query.search) {
      where.OR = [
        { user: { email: { contains: query.search, mode: 'insensitive' as const } } },
        { project: { name: { contains: query.search, mode: 'insensitive' as const } } },
      ];
    }

    // Fetch feedback with user and project data
    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
          project: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: query.order,
        },
        skip,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    // Transform feedback data
    const transformedFeedback = feedbacks.map((feedback) => {
      const data = feedback.data as any;
      
      // Extract overall_rating (stored as string '1'-'5', convert to number)
      const overallRating = data?.ratings?.overall_rating;
      const overallScore = overallRating ? parseInt(overallRating, 10) : 0;
      
      // Extract ai_understanding (stored as 'poor'|'fair'|'good'|'excellent', map to 1-5)
      const aiUnderstanding = data?.ratings?.ai_understanding;
      const aiUnderstandingMap: Record<string, number> = {
        'poor': 1,
        'fair': 2,
        'good': 4,
        'excellent': 5
      };
      const aiUnderstandingScore = aiUnderstanding ? (aiUnderstandingMap[aiUnderstanding] || 0) : 0;
      
      return {
        id: feedback.id,
        userId: feedback.userId,
        userEmail: feedback.user.email,
        projectId: feedback.projectId,
        projectName: feedback.project.name,
        overallScore,
        aiUnderstandingScore,
        improvementVectors: (data?.improvementSignals || []).map((s: any) => s.id),
        businessIntent: data?.businessIntent || {},
        createdAt: feedback.createdAt,
      };
    });

    res.json({
      success: true,
      data: transformedFeedback,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors });
    }
    logger.error({ error }, 'Error fetching admin feedback');
    next(error);
  }
});

export { router as adminRouter };

