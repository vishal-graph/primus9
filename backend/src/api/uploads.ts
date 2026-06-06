import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { errors } from '../lib/error-handler';
import { storageService } from '../services/storage';
import { config } from '../config';
import { AssetType } from '@prisma/client';

const router = Router();

/**
 * Upload API Routes
 * Generates presigned URLs for S3 uploads/downloads
 * Tracks asset versions in database
 */

// ============================================
// Validation Schemas
// ============================================

const presignedUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  bucket: z.enum(['floorplans', 'moodboards', 'renders', 'exports']),
  projectId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  assetType: z.nativeEnum(AssetType).optional(),
});

const presignedDownloadSchema = z.object({
  key: z.string().min(1),
  bucket: z.enum(['floorplans', 'moodboards', 'renders', 'exports']),
});

const confirmUploadSchema = z.object({
  key: z.string().min(1),
  bucket: z.enum(['floorplans', 'moodboards', 'renders', 'exports']),
  projectId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  assetType: z.nativeEnum(AssetType),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// Bucket to Asset Type Mapping
// ============================================

const BUCKET_ASSET_TYPE_MAP: Record<string, AssetType> = {
  floorplans: 'FLOORPLAN_ORIGINAL',
  moodboards: 'MOODBOARD',
  renders: 'INTERIOR_VIEW',
  exports: 'EXPORT_PACKAGE',
};

// ============================================
// Routes
// ============================================

// POST /api/uploads/presigned-url - Get presigned URL for upload
router.post('/presigned-url', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const input = presignedUploadSchema.parse(req.body);

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // If roomId provided, verify it exists
    if (input.roomId) {
      const room = await prisma.room.findFirst({
        where: { id: input.roomId, projectId: input.projectId },
      });
      if (!room) {
        throw errors.notFound('Room');
      }
    }

    // Generate presigned URL
    const { url, key } = await storageService.generateUploadUrl({
      bucket: input.bucket,
      filename: input.filename,
      contentType: input.contentType,
      userId,
      projectId: input.projectId,
    });

    logger.info({
      userId,
      projectId: input.projectId,
      bucket: input.bucket,
      key,
    }, 'Upload URL generated');

    res.json({
      success: true,
      data: {
        uploadUrl: url,
        key,
        bucket: input.bucket,
        expiresIn: 3600,
        instructions: {
          method: 'PUT',
          headers: {
            'Content-Type': input.contentType,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/uploads/confirm - Confirm upload and create asset version
router.post('/confirm', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const input = confirmUploadSchema.parse(req.body);

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Get bucket name from mapping
    const bucketName = getBucketName(input.bucket);

    // Get next version number
    const latestVersion = await prisma.assetVersion.findFirst({
      where: {
        projectId: input.projectId,
        roomId: input.roomId || null,
        assetType: input.assetType,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Mark previous versions as not latest
    if (latestVersion) {
      await prisma.assetVersion.updateMany({
        where: {
          projectId: input.projectId,
          roomId: input.roomId || null,
          assetType: input.assetType,
          isLatest: true,
        },
        data: { isLatest: false },
      });
    }

    // Create asset version record
    const assetVersion = await prisma.assetVersion.create({
      data: {
        projectId: input.projectId,
        roomId: input.roomId,
        assetType: input.assetType,
        version: nextVersion,
        s3Bucket: bucketName,
        s3Key: input.key,
        contentType: input.contentType,
        fileSize: input.fileSize,
        metadata: input.metadata as any,
        isLatest: true,
        createdBy: userId,
      },
    });

    // Generate download URL for immediate access
    const downloadUrl = await storageService.generateDownloadUrl(input.bucket, input.key);

    logger.info({
      userId,
      assetVersionId: assetVersion.id,
      projectId: input.projectId,
      roomId: input.roomId,
      assetType: input.assetType,
      version: nextVersion,
    }, 'Asset version created');

    res.status(201).json({
      success: true,
      data: {
        ...assetVersion,
        downloadUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/uploads/download-url - Get presigned URL for download
router.post('/download-url', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const input = presignedDownloadSchema.parse(req.body);

    // TODO: Add access control check
    // Verify the user has access to this file

    const url = await storageService.generateDownloadUrl(input.bucket, input.key);

    res.json({
      success: true,
      data: {
        downloadUrl: url,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/uploads/proxy-download - Proxy download with proper headers
router.get('/proxy-download', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { url: imageUrl, filename, s3Key, bucket } = req.query;

    // Set CORS headers early (before any async operations)
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Try direct storage download if we have s3Key (fastest and most reliable)
    if (s3Key && typeof s3Key === 'string') {
      try {
        const bucketName = (bucket && typeof bucket === 'string')
          ? storageService.resolveBucketName(bucket)
          : config.s3BucketMoodboards;

        const file = await Promise.race([
          storageService.downloadFile(bucketName, s3Key),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Storage request timeout')), 25000)
          ),
        ]);

        res.setHeader('Content-Type', file.contentType || 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${filename || 'moodboard.png'}"`);
        res.setHeader('Content-Length', file.data.length.toString());
        res.send(file.data);
        return;
      } catch (storageError: unknown) {
        logger.warn({ s3Key, bucket, error: String(storageError) }, 'Storage direct access failed, falling back to URL fetch');
        // Fall through to URL-based fetch
      }
    }

    // Fallback: Fetch from presigned URL (with timeout)
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw errors.badRequest('URL or S3 key/bucket parameters are required');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw errors.badRequest(`Failed to fetch image: ${response.status}`);
      }

      // Get content type from response
      const contentType = response.headers.get('content-type') || 'image/png';
      const contentLength = response.headers.get('content-length');

      // Set proper download headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename || 'moodboard.png'}"`);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      // Buffer the response (simpler and more reliable than streaming)
      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      res.setHeader('Content-Length', buffer.length.toString());
      res.send(buffer);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw errors.badRequest('Request timeout: Image fetch took too long');
      }
      throw fetchError;
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/uploads/assets/:projectId - List project assets
router.get('/assets/:projectId', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { projectId } = req.params;
    const { assetType, roomId, latestOnly = 'true' } = req.query;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    const assets = await prisma.assetVersion.findMany({
      where: {
        projectId,
        ...(assetType && { assetType: assetType as AssetType }),
        ...(roomId && { roomId: roomId as string }),
        ...(latestOnly === 'true' && { isLatest: true }),
      },
      orderBy: [
        { assetType: 'asc' },
        { roomId: 'asc' },
        { version: 'desc' },
      ],
    });

    // Generate download URLs for each asset
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        const bucket = getBucketFromName(asset.s3Bucket);
        const downloadUrl = bucket 
          ? await storageService.generateDownloadUrl(bucket, asset.s3Key)
          : null;
        return { ...asset, downloadUrl };
      })
    );

    res.json({
      success: true,
      data: assetsWithUrls,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/uploads/assets/:projectId/:assetId/versions - Get all versions
router.get('/assets/:projectId/:assetId/versions', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { projectId, assetId } = req.params;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.notFound('Project');
    }

    // Get the asset to find its type and room
    const asset = await prisma.assetVersion.findFirst({
      where: { id: assetId, projectId },
    });

    if (!asset) {
      throw errors.notFound('Asset');
    }

    // Get all versions of this asset
    const versions = await prisma.assetVersion.findMany({
      where: {
        projectId,
        roomId: asset.roomId,
        assetType: asset.assetType,
      },
      orderBy: { version: 'desc' },
    });

    // Generate download URLs
    const versionsWithUrls = await Promise.all(
      versions.map(async (v) => {
        const bucket = getBucketFromName(v.s3Bucket);
        const downloadUrl = bucket 
          ? await storageService.generateDownloadUrl(bucket, v.s3Key)
          : null;
        return { ...v, downloadUrl };
      })
    );

    res.json({
      success: true,
      data: versionsWithUrls,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/uploads/assets/:assetId - Delete an asset
router.delete('/assets/:assetId', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const { assetId } = req.params;

    // Get the asset
    const asset = await prisma.assetVersion.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw errors.notFound('Asset');
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: asset.projectId, userId, deletedAt: null },
    });

    if (!project) {
      throw errors.forbidden('Not authorized to delete this asset');
    }

    // Delete from S3
    const bucket = getBucketFromName(asset.s3Bucket);
    if (bucket) {
      await storageService.deleteFile(bucket, asset.s3Key);
    }

    // Delete from database
    await prisma.assetVersion.delete({
      where: { id: assetId },
    });

    // If this was the latest, mark previous version as latest
    if (asset.isLatest) {
      const previousVersion = await prisma.assetVersion.findFirst({
        where: {
          projectId: asset.projectId,
          roomId: asset.roomId,
          assetType: asset.assetType,
          version: { lt: asset.version },
        },
        orderBy: { version: 'desc' },
      });

      if (previousVersion) {
        await prisma.assetVersion.update({
          where: { id: previousVersion.id },
          data: { isLatest: true },
        });
      }
    }

    logger.info({
      userId,
      assetId,
      projectId: asset.projectId,
    }, 'Asset deleted');

    res.json({
      success: true,
      data: { id: assetId, deleted: true },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Helper Functions
// ============================================

function getBucketName(bucket: string): string {
  const bucketMap: Record<string, string> = {
    floorplans: process.env.S3_BUCKET_FLOORPLANS || '',
    moodboards: process.env.S3_BUCKET_MOODBOARDS || '',
    renders: process.env.S3_BUCKET_RENDERS || '',
    exports: process.env.S3_BUCKET_EXPORTS || '',
  };
  return bucketMap[bucket] || bucket;
}

function getBucketFromName(bucketName: string): 'floorplans' | 'moodboards' | 'renders' | 'exports' | null {
  if (bucketName.includes('floorplan')) return 'floorplans';
  if (bucketName.includes('moodboard')) return 'moodboards';
  if (bucketName.includes('render') || bucketName.includes('interior')) return 'renders';
  if (bucketName.includes('export')) return 'exports';
  return null;
}

export { router as uploadsRouter };
