import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { errors } from '../lib/error-handler';
import { ProjectStage, RoomType, RoomStatus, Prisma } from '@prisma/client';
import { storageService } from '../services/storage';
import { checkProjectLimit, checkRateLimit } from '../services/plan-guardrails';
import { generateUniqueSlug, resolveProjectId } from '../lib/slug';
import * as XLSX from 'xlsx';

const router = Router();

/**
 * Project API Routes
 * Full CRUD operations with Prisma
 */

// ============================================
// Validation Schemas
// ============================================

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  floorPlanUrl: z.string().url().optional(),
  planCode: z.enum(['STARTER', 'STANDARD', 'PRO', 'PREMIUM']).optional(), // For internal users
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentStage: z.nativeEnum(ProjectStage).optional(),
  floorPlanUrl: z.string().url().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(RoomType),
  geometry: z.record(z.unknown()).optional(),
});

const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(RoomType).optional(),
  geometry: z.record(z.unknown()).optional(),
  status: z.nativeEnum(RoomStatus).optional(),
});

// ============================================
// Project Routes
// ============================================

// GET /api/projects - List user's projects
router.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { page = '1', limit = '20', search } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      userId,
      deletedAt: null,
      ...(search && {
        name: {
          contains: search as string,
          mode: 'insensitive' as const,
        },
      }),
    };

    // Fetch projects with room count
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          rooms: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
            },
          },
          _count: {
            select: {
              rooms: true,
              aiJobs: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      success: true,
      data: projects,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id - Get single project with all details (accepts slug or UUID)
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Resolve slug or UUID to actual project ID
    const resolved = await resolveProjectId(id, userId);
    if (!resolved) throw errors.notFound('Project');

    const project = await prisma.project.findFirst({
      where: { id: resolved.id, userId, deletedAt: null },
      include: {
        rooms: {
          include: {
            moodboards: {
              orderBy: { version: 'desc' },
              take: 1,
            },
            elevations: {
              orderBy: { version: 'desc' },
            },
            interiorViews: {
              orderBy: { version: 'desc' },
              take: 1,
            },
            components: true,
          },
        },
        aiJobs: {
          where: {
            status: { in: ['QUEUED', 'PROCESSING'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Enrich rooms with public URLs for moodboards (bucket is public, no presigned URL needed)
    const enrichedRooms = await Promise.all(
      project.rooms.map(async (room) => {
        const enrichedMoodboards = room.moodboards.map((moodboard) => {
            let downloadUrl = moodboard.imageUrl;
            
          // Use public URL if we have an S3 key (avoids CORS issues with presigned URLs)
            if (moodboard.s3Key) {
            downloadUrl = storageService.getPublicUrl('moodboards', moodboard.s3Key);
            }
            
            return {
              ...moodboard,
              imageUrl: downloadUrl,
              s3Key: moodboard.s3Key, // Include s3Key for direct S3 access
            };
        });
        
        return {
          ...room,
          moodboards: enrichedMoodboards,
        };
      })
    );

    res.json({
      success: true,
      data: {
        ...project,
        rooms: enrichedRooms,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const user = req.user!;
    const input = createProjectSchema.parse(req.body);

    // For internal users: require explicit plan selection
    if (user.isInternal) {
      if (!input.planCode) {
        throw errors.badRequest(
          'Internal users must explicitly select a plan for each project.',
          { code: 'PLAN_SELECTION_REQUIRED' }
        );
      }

      // Validate plan code exists
      const { getPlanDefinition } = await import('../lib/plan-config');
      const plan = getPlanDefinition(input.planCode as any);
      if (!plan) {
        throw errors.badRequest(
          `Invalid plan code provided: ${input.planCode}`,
          { code: 'INVALID_PLAN_CODE', planCode: input.planCode }
        );
      }

      // Create project with internal plan override
      const slug = await generateUniqueSlug(input.name);
      const project = await prisma.project.create({
        data: {
          name: input.name,
          slug,
          floorPlanUrl: input.floorPlanUrl,
          userId,
          currentStage: 'FLOOR_PLAN',
          planCode: input.planCode,
          planSource: 'INTERNAL_OVERRIDE',
        },
        include: {
          rooms: true,
        },
      });

      logger.info({ 
        projectId: project.id, 
        userId, 
        planCode: input.planCode,
        planSource: 'INTERNAL_OVERRIDE',
      }, 'Internal project created');

      return res.status(201).json({
        success: true,
        data: project,
      });
    }

    // For regular users: check plan limits
    await checkProjectLimit(userId);
    await checkRateLimit(userId, 'PROJECT_CREATE');

    const slug = await generateUniqueSlug(input.name);
    const project = await prisma.project.create({
      data: {
        ...input,
        slug,
        userId,
        currentStage: 'FLOOR_PLAN',
        // Regular users don't set project-level plan (uses user-level subscription)
        planCode: null,
        planSource: null,
      },
      include: {
        rooms: true,
      },
    });

    logger.info({ projectId: project.id, userId }, 'Project created');

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/projects/:id - Update project (accepts slug or UUID)
router.patch('/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const input = updateProjectSchema.parse(req.body);

    // Resolve slug or UUID
    const resolved = await resolveProjectId(id, userId);
    if (!resolved) throw errors.notFound('Project');

    // If name is being changed, regenerate the slug
    const updateData: any = { ...input };
    if (input.name) {
      updateData.slug = await generateUniqueSlug(input.name, resolved.id);
    }

    const project = await prisma.project.update({
      where: { id: resolved.id },
      data: updateData,
      include: {
        rooms: true,
      },
    });

    logger.info({ projectId: id, userId, changes: Object.keys(input) }, 'Project updated');

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id - Soft delete project (accepts slug or UUID)
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Resolve slug or UUID
    const resolved = await resolveProjectId(id, userId);
    if (!resolved) throw errors.notFound('Project');

    // Soft delete
    await prisma.project.update({
      where: { id: resolved.id },
      data: { deletedAt: new Date() },
    });

    logger.info({ projectId: resolved.id, userId }, 'Project deleted');

    res.json({
      success: true,
      data: { id: resolved.id, deleted: true },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Room Routes (nested under projects)
// ============================================

// GET /api/projects/:projectId/rooms - List rooms
router.get('/:projectId/rooms', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    const rooms = await prisma.room.findMany({
      where: { projectId },
      include: {
        moodboards: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            elevations: true,
            interiorViews: true,
            components: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects/:projectId/rooms - Create room
router.post('/:projectId/rooms', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;
    const input = createRoomSchema.parse(req.body);

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    const room = await prisma.room.create({
      data: {
        name: input.name,
        type: input.type,
        projectId,
        geometry: (input.geometry || {}) as Prisma.InputJsonValue,
      },
    });

    logger.info({ roomId: room.id, projectId, userId }, 'Room created');

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/projects/:projectId/rooms/:roomId - Update room
router.patch('/:projectId/rooms/:roomId', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { projectId, roomId } = req.params;
    const input = updateRoomSchema.parse(req.body);

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Verify room exists
    const existing = await prisma.room.findFirst({
      where: { id: roomId, projectId },
    });

    if (!existing) {
      throw errors.notFound('Room');
    }

    // Build update data with proper typing
    const updateData: Prisma.RoomUpdateInput = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.geometry !== undefined) updateData.geometry = input.geometry as Prisma.InputJsonValue;

    const room = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });

    logger.info({ roomId, projectId, userId, changes: Object.keys(input) }, 'Room updated');

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:projectId/rooms/:roomId - Delete room
router.delete('/:projectId/rooms/:roomId', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { projectId, roomId } = req.params;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Delete room and related data (cascade)
    await prisma.room.delete({
      where: { id: roomId },
    });

    logger.info({ roomId, projectId, userId }, 'Room deleted');

    res.json({
      success: true,
      data: { id: roomId, deleted: true },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Project Stage Progression
// ============================================

// POST /api/projects/:id/advance-stage - Move to next stage
router.post('/:id/advance-stage', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Define stage progression
    const stageOrder: ProjectStage[] = [
      'FLOOR_PLAN',
      'INTENT',
      'MOODBOARD',
      'ELEVATION',
      'TWO_D_VIEWS',
      'COMPONENT',
      'ROOM_WALKTHROUGH',
      'INTERIOR',
      'EXPORT',
    ];

    const currentIndex = stageOrder.indexOf(project.currentStage);
    
    if (currentIndex === stageOrder.length - 1) {
      throw errors.badRequest('Project is already at final stage');
    }

    const nextStage = stageOrder[currentIndex + 1];

    // Create version snapshot before advancing
    await prisma.projectVersion.create({
      data: {
        projectId: id,
        stage: project.currentStage,
        version: await getNextVersion(id, project.currentStage),
        snapshot: {
          stage: project.currentStage,
          advancedAt: new Date(),
        },
      },
    });

    // Update project stage
    const updated = await prisma.project.update({
      where: { id },
      data: { currentStage: nextStage },
    });

    logger.info({ 
      projectId: id, 
      userId, 
      fromStage: project.currentStage, 
      toStage: nextStage 
    }, 'Project stage advanced');

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Elevation Routes
// ============================================

// GET /api/projects/:id/elevations - Get all elevations for a project
router.get('/:id/elevations', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Get all elevations for rooms in this project
    const elevations = await prisma.roomElevation.findMany({
      where: {
        room: {
          projectId: id,
        },
      },
      orderBy: [
        { roomId: 'asc' },
        { wall: 'asc' },
        { version: 'desc' },
      ],
    });

    // Use public URLs for elevations (bucket is public, no presigned URL needed)
    const enrichedElevations = elevations.map((elevation) => {
        let downloadUrl = elevation.imageUrl;
        
      // Use public URL if we have an S3 key (avoids CORS issues with presigned URLs)
        if (elevation.s3Key) {
        downloadUrl = storageService.getPublicUrl('renders', elevation.s3Key);
        }
        
        return {
          ...elevation,
          imageUrl: downloadUrl,
        };
    });

    res.json({
      success: true,
      data: enrichedElevations,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id/rooms/:roomId/elevations - Get elevations for a specific room
router.get('/:id/rooms/:roomId/elevations', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id, roomId } = req.params;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Verify room belongs to project
    const room = await prisma.room.findFirst({
      where: { id: roomId, projectId: id },
      select: { id: true },
    });

    if (!room) {
      throw errors.notFound('Room');
    }

    // Get elevations for this room
    const elevations = await prisma.roomElevation.findMany({
      where: { roomId },
      orderBy: [
        { wall: 'asc' },
        { version: 'desc' },
      ],
    });

    // Use public URLs for elevations (bucket is public, no presigned URL needed)
    const enrichedElevations = elevations.map((elevation) => {
        let downloadUrl = elevation.imageUrl;
        
      // Use public URL if we have an S3 key (avoids CORS issues with presigned URLs)
        if (elevation.s3Key) {
        downloadUrl = storageService.getPublicUrl('renders', elevation.s3Key);
        }
        
        return {
          ...elevation,
          imageUrl: downloadUrl,
        };
    });

    res.json({
      success: true,
      data: enrichedElevations,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 2D VIEWS (ROOM-WISE 5-POINT VIEWS)
// ============================================

// GET /api/projects/:id/2d-views - Get all 2D views for a project
router.get('/:id/2d-views', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    const views = await prisma.room2DView.findMany({
      where: {
        room: {
          projectId: id,
        },
      },
      orderBy: [
        { roomId: 'asc' },
        { viewType: 'asc' },
        { version: 'desc' },
      ],
    });

    const enrichedViews = views.map((view) => {
      let downloadUrl = view.imageUrl;
      if (view.s3Key) {
        downloadUrl = storageService.getPublicUrl('renders', view.s3Key);
      }
      return {
        ...view,
        imageUrl: downloadUrl,
      };
    });

    res.json({
      success: true,
      data: enrichedViews,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id/rooms/:roomId/2d-views - Get 2D views for a specific room
router.get('/:id/rooms/:roomId/2d-views', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id, roomId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, projectId: id },
      select: { id: true },
    });

    if (!room) {
      throw errors.notFound('Room');
    }

    const views = await prisma.room2DView.findMany({
      where: { roomId },
      orderBy: [
        { viewType: 'asc' },
        { version: 'desc' },
      ],
    });

    const enrichedViews = views.map((view) => {
      let downloadUrl = view.imageUrl;
      if (view.s3Key) {
        downloadUrl = storageService.getPublicUrl('renders', view.s3Key);
      }
      return {
        ...view,
        imageUrl: downloadUrl,
      };
    });

    res.json({
      success: true,
      data: enrichedViews,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ROOM WALKTHROUGH VIDEOS (Runway Gen-4 Turbo)
// ============================================

// GET /api/projects/:id/walkthroughs - Get all walkthrough videos for a project
router.get('/:id/walkthroughs', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    const videos = await prisma.roomWalkthroughVideo.findMany({
      where: {
        room: {
          projectId: id,
        },
      },
      orderBy: [
        { roomId: 'asc' },
        { version: 'desc' },
      ],
    });

    const enrichedVideos = videos.map((video) => {
      let downloadUrl = video.videoUrl;
      if (video.s3Key) {
        downloadUrl = storageService.getPublicUrl('renders', video.s3Key);
      }
      return {
        ...video,
        videoUrl: downloadUrl,
      };
    });

    res.json({
      success: true,
      data: enrichedVideos,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id/rooms/:roomId/walkthroughs - Get walkthrough videos for a room
router.get('/:id/rooms/:roomId/walkthroughs', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id, roomId } = req.params;

    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, projectId: id },
      select: { id: true },
    });

    if (!room) {
      throw errors.notFound('Room');
    }

    const videos = await prisma.roomWalkthroughVideo.findMany({
      where: { roomId },
      orderBy: [
        { version: 'desc' },
      ],
    });

    const enrichedVideos = videos.map((video) => {
      let downloadUrl = video.videoUrl;
      if (video.s3Key) {
        downloadUrl = storageService.getPublicUrl('renders', video.s3Key);
      }
      return {
        ...video,
        videoUrl: downloadUrl,
      };
    });

    res.json({
      success: true,
      data: enrichedVideos,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// COMPONENT & MATERIAL EXTRACTION
// ============================================

function formatBuyLinks(links: Array<{ label: string; url: string; note?: string }>): string {
  return links
    .map((link) => (link.note ? `${link.label} - ${link.url} (${link.note})` : `${link.label} - ${link.url}`))
    .join(' | ');
}

function csvEscape(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header] || '')).join(','));
  }
  return lines.join('\n');
}

// GET /api/projects/:id/components - Get component extraction tables
router.get('/:id/components', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const format = (req.query.format as string | undefined)?.toLowerCase();

    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    const extractions = await prisma.roomComponentExtraction.findMany({
      where: {
        room: {
          projectId: id,
        },
      },
      include: {
        room: { select: { id: true, name: true } },
      },
      orderBy: [
        { roomId: 'asc' },
        { version: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const latestByRoom = new Map<string, typeof extractions[number]>();
    for (const extraction of extractions) {
      if (!latestByRoom.has(extraction.roomId)) {
        latestByRoom.set(extraction.roomId, extraction);
      }
    }

    const roomTables = Array.from(latestByRoom.values()).map((extraction) => {
      const data = extraction.data as any;
      return {
        roomId: extraction.roomId,
        roomName: extraction.room.name,
        rows: Array.isArray(data?.rows) ? data.rows : [],
        s3Key: extraction.s3Key,
        version: extraction.version,
        createdAt: extraction.createdAt,
      };
    });

    const combinedRows = roomTables.flatMap((roomTable) =>
      (roomTable.rows || []).map((row: any) => ({
        roomName: row.roomName || roomTable.roomName,
        componentCategory: row.componentCategory || '',
        componentName: row.componentName || '',
        description: row.description || '',
        material: row.material || '',
        finishColor: row.finishColor || '',
        approximateSize: row.approximateSize || '',
        placement: row.placement || '',
        wallLocation: row.wallLocation || '',
        suggestedBuyLinks: formatBuyLinks(row.suggestedBuyLinks || []),
        confidence: typeof row.confidence === 'number' ? String(row.confidence) : '',
      }))
    );

    if (format === 'csv') {
      const csv = toCsv(combinedRows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="components-${id}.csv"`);
      res.send(csv);
      return;
    }

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      const combinedSheet = XLSX.utils.json_to_sheet(combinedRows);
      XLSX.utils.book_append_sheet(workbook, combinedSheet, 'All Components');

      for (const roomTable of roomTables) {
        const sheetRows = (roomTable.rows || []).map((row: any) => ({
          roomName: row.roomName || roomTable.roomName,
          componentCategory: row.componentCategory || '',
          componentName: row.componentName || '',
          description: row.description || '',
          material: row.material || '',
          finishColor: row.finishColor || '',
          approximateSize: row.approximateSize || '',
          placement: row.placement || '',
          wallLocation: row.wallLocation || '',
          suggestedBuyLinks: formatBuyLinks(row.suggestedBuyLinks || []),
          confidence: typeof row.confidence === 'number' ? String(row.confidence) : '',
        }));
        const sheet = XLSX.utils.json_to_sheet(sheetRows);
        const sheetName = roomTable.roomName.substring(0, 31) || 'Room';
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      }

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="components-${id}.xlsx"`);
      res.send(buffer);
      return;
    }

    res.json({
      success: true,
      data: {
        rooms: roomTables,
        combined: combinedRows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// ISOMETRIC FLOOR ELEVATIONS (NEW - SOURCE OF TRUTH)
// ============================================

// GET /api/projects/:id/isometric - Get isometric floor elevations
/**
 * ============================================================
 * ❗ THIS IS THE SINGLE SOURCE OF TRUTH FOR ELEVATIONS ❗
 * ❗ REPLACES ROOM-WISE ELEVATIONS ❗
 * ============================================================
 */
router.get('/:id/isometric', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { floor } = req.query;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Get isometric elevations
    const whereClause: { projectId: string; floor?: number } = { projectId: id };
    if (floor) {
      whereClause.floor = parseInt(floor as string);
    }

    const isometricElevations = await prisma.isometricFloorElevation.findMany({
      where: whereClause,
      orderBy: [
        { floor: 'asc' },
        { version: 'desc' },
      ],
    });

    // Use public URLs (bucket is public, no presigned URL needed)
    const enrichedElevations = isometricElevations.map((elevation) => {
        let downloadUrl = elevation.imageUrl;
        
      // Use public URL if we have an S3 key (avoids CORS issues with presigned URLs)
        if (elevation.s3Key) {
        downloadUrl = storageService.getPublicUrl('renders', elevation.s3Key);
        }
        
        return {
          ...elevation,
          imageUrl: downloadUrl,
        };
    });

    res.json({
      success: true,
      data: enrichedElevations,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id/isometric/latest - Get latest isometric elevation
router.get('/:id/isometric/latest', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { floor = '1' } = req.query;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Get latest isometric elevation for this floor
    const latestElevation = await prisma.isometricFloorElevation.findFirst({
      where: { 
        projectId: id,
        floor: parseInt(floor as string),
      },
      orderBy: { version: 'desc' },
    });

    if (!latestElevation) {
      return res.json({
        success: true,
        data: null,
        message: 'No isometric elevation generated yet',
      });
    }

    // Use public URL (bucket is public, no presigned URL needed)
    let downloadUrl = latestElevation.imageUrl;
    if (latestElevation.s3Key) {
      downloadUrl = storageService.getPublicUrl('renders', latestElevation.s3Key);
    }

    res.json({
      success: true,
      data: {
        ...latestElevation,
        imageUrl: downloadUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Helper to get next version number
async function getNextVersion(projectId: string, stage: ProjectStage): Promise<number> {
  const latest = await prisma.projectVersion.findFirst({
    where: { projectId, stage },
    orderBy: { version: 'desc' },
  });
  return (latest?.version || 0) + 1;
}

export { router as projectsRouter };
