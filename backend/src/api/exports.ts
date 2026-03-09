/**
 * TatvaOps Vision - Exports API
 * 
 * Handles PDF export generation for moodboards and design documents.
 * 
 * Flow:
 * 1. POST /api/exports/moodboard-pdf - Create export job
 * 2. Worker generates PDF asynchronously
 * 3. GET /api/exports/:id - Check status / get download URL
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ExportAssetType } from '@prisma/client';
import { logger } from '../lib/logger';
import { errors } from '../lib/error-handler';
import { prisma } from '../lib/prisma';
import { aiJobQueue } from '../workers/queue';

export const exportsRouter = Router();

// ===========================================
// POST /api/exports/moodboard-pdf
// ===========================================
// Create a new moodboard PDF export job

exportsRouter.post('/moodboard-pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw errors.unauthorized('Not authenticated');
    }

    const { projectId, options } = req.body;

    if (!projectId) {
      throw errors.badRequest('projectId is required');
    }

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
        deletedAt: null,
      },
      include: {
        rooms: {
          include: {
            moodboards: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!project) {
      throw errors.notFound('Project not found');
    }

    // Check if there are any moodboards to export
    const roomsWithMoodboards = project.rooms.filter(
      (room) => room.moodboards.length > 0
    );

    if (roomsWithMoodboards.length === 0) {
      throw errors.badRequest('No moodboards available to export. Generate moodboards first.');
    }

    // Check for existing pending/processing export
    const existingExport = await prisma.exportAsset.findFirst({
      where: {
        projectId,
        type: 'MOODBOARD_PDF',
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (existingExport) {
      // Return existing export job instead of creating new one
      return res.status(200).json({
        success: true,
        data: {
          id: existingExport.id,
          status: existingExport.status,
          message: 'Export already in progress',
        },
      });
    }

    // Create AI job for tracking
    const jobId = uuidv4();
    const exportId = uuidv4();

    // Create export asset record
    const exportAsset = await prisma.exportAsset.create({
      data: {
        id: exportId,
        projectId,
        userId: user.id,
        type: 'MOODBOARD_PDF',
        status: 'PENDING',
        jobId,
        metadata: {
          roomCount: roomsWithMoodboards.length,
          options: options || {},
          requestedAt: new Date().toISOString(),
        },
      },
    });

    // Create AI job record
    await prisma.aIJob.create({
      data: {
        id: jobId,
        projectId,
        userId: user.id,
        type: 'PDF_EXPORT',
        status: 'QUEUED',
        payload: {
          exportId,
          type: 'MOODBOARD_PDF',
          options: options || { includeDescriptions: true },
        },
      },
    });

    // Enqueue the PDF export job via BullMQ (Redis)
    try {
      await aiJobQueue.add('PDF_EXPORT', {
        jobId,
        exportId,
        userId: user.id,
        projectId,
        type: 'MOODBOARD_PDF',
        options: options || { includeDescriptions: true },
      }, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      logger.info({
        exportId,
        jobId,
        projectId,
        userId: user.id,
        roomCount: roomsWithMoodboards.length,
      }, 'PDF export job enqueued to BullMQ');

    } catch (queueError) {
      // Update export status to FAILED if queue fails
      await prisma.exportAsset.update({
        where: { id: exportId },
        data: {
          status: 'FAILED',
          error: 'Failed to enqueue export job',
        },
      });

      await prisma.aIJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: 'Failed to enqueue export job',
        },
      });

      throw errors.internal('Failed to start export job. Please try again.');
    }

    return res.status(201).json({
      success: true,
      data: {
        id: exportAsset.id,
        jobId,
        status: 'PENDING',
        message: 'Export job started. Your PDF will be ready shortly.',
        roomCount: roomsWithMoodboards.length,
      },
    });

  } catch (error) {
    next(error);
  }
});

// ===========================================
// GET /api/exports/:id
// ===========================================
// Get export status and download URL

exportsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw errors.unauthorized('Not authenticated');
    }

    const { id } = req.params;

    const exportAsset = await prisma.exportAsset.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!exportAsset) {
      throw errors.notFound('Export not found');
    }

    // Build response
    const response: {
      id: string;
      type: string;
      status: string;
      createdAt: Date;
      completedAt: Date | null;
      downloadUrl?: string;
      s3Key?: string;
      filename?: string;
      error?: string;
      metadata?: unknown;
    } = {
      id: exportAsset.id,
      type: exportAsset.type,
      status: exportAsset.status,
      createdAt: exportAsset.createdAt,
      completedAt: exportAsset.completedAt,
      metadata: exportAsset.metadata,
    };

    if (exportAsset.status === 'COMPLETED' && exportAsset.s3Key) {
      // Return s3Key for download via /public/download endpoint
      response.s3Key = exportAsset.s3Key;
      response.filename = exportAsset.filename || 'design-moodboard.pdf';
    }

    if (exportAsset.status === 'FAILED') {
      response.error = exportAsset.error || 'Export failed';
    }

    return res.status(200).json({
      success: true,
      data: response,
    });

  } catch (error) {
    next(error);
  }
});

// ===========================================
// GET /api/exports/project/:projectId
// ===========================================
// Get all exports for a project

exportsRouter.get('/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw errors.unauthorized('Not authenticated');
    }

    const { projectId } = req.params;

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!project) {
      throw errors.notFound('Project not found');
    }

    const exports = await prisma.exportAsset.findMany({
      where: {
        projectId,
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return res.status(200).json({
      success: true,
      data: exports.map((exp) => ({
        id: exp.id,
        type: exp.type,
        status: exp.status,
        createdAt: exp.createdAt,
        completedAt: exp.completedAt,
        s3Key: exp.status === 'COMPLETED' ? exp.s3Key : undefined,
        filename: exp.filename,
        error: exp.status === 'FAILED' ? exp.error : undefined,
      })),
    });

  } catch (error) {
    next(error);
  }
});

// ===========================================
// GET /api/exports/project/:projectId/latest
// ===========================================
// Get latest completed export for a project

exportsRouter.get('/project/:projectId/latest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw errors.unauthorized('Not authenticated');
    }

    const { projectId } = req.params;
    const { type } = req.query;

    // Validate and cast type parameter
    const exportType: ExportAssetType =
      type && ['MOODBOARD_PDF', 'ELEVATION_PDF', 'FULL_DESIGN_PDF'].includes(type as string)
        ? (type as ExportAssetType)
        : 'MOODBOARD_PDF';

    const latestExport = await prisma.exportAsset.findFirst({
      where: {
        projectId,
        userId: user.id,
        type: exportType,
        status: 'COMPLETED',
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    if (!latestExport) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: latestExport.id,
        type: latestExport.type,
        status: latestExport.status,
        createdAt: latestExport.createdAt,
        completedAt: latestExport.completedAt,
        s3Key: latestExport.s3Key,
        filename: latestExport.filename,
      },
    });

  } catch (error) {
    next(error);
  }
});

