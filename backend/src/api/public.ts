import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger';
import { storageService } from '../services/storage';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { errors } from '../lib/error-handler';
import { generateUniqueSlug } from '../lib/slug';
import { AIJobType } from '@prisma/client';
import { aiJobQueue } from '../workers/queue';
import { jobCache } from '../lib/redis-client';

export const publicRouter = Router();

// ===========================================
// Helper: Sanitize filename for Content-Disposition
// ===========================================

/**
 * Sanitize filename to prevent Content-Disposition header issues.
 * Removes slashes, backslashes, and other unsafe characters.
 */
const sanitizeFilename = (name: string): string => {
  return name
    .replace(/[\/\\]/g, '-')           // Replace slashes with dashes
    .replace(/[^a-zA-Z0-9._-]/g, '')   // Remove other unsafe characters
    .replace(/^-+|-+$/g, '')            // Trim leading/trailing dashes
    || 'download.jpg';                   // Fallback if empty
};

// ===========================================
// Helper: Resolve S3 bucket and object key from logical key
// ===========================================

interface S3Resolution {
  bucketName: string | null;
  objectKey: string;
  prefix: string | null;
}

/**
 * Resolve the actual S3 bucket and object key from a logical s3Key.
 * 
 * The s3Key may include virtual prefixes like:
 * - moodboards/projectId/roomId/v1_123.png â†’ bucket: moodboards, key: projectId/roomId/v1_123.png
 * - isometric/projectId/floor_1_v1.png â†’ bucket: renders, key: projectId/floor_1_v1.png
 * - renders/... â†’ bucket: renders
 * - floorplans/... â†’ bucket: floorplans
 */
const resolveS3Location = (s3Key: string, providedBucket?: string | null): S3Resolution => {
  // If bucket is explicitly provided, use it and don't strip prefix
  if (providedBucket) {
    return {
      bucketName: providedBucket,
      objectKey: s3Key,
      prefix: null,
    };
  }

  let bucketName: string | null = null;
  let objectKey = s3Key;
  let prefix: string | null = null;

  if (s3Key.startsWith('moodboards/')) {
    bucketName = config.s3BucketMoodboards;
    objectKey = s3Key;  // Keep full key - stored as moodboards/projectId/roomId/file.jpg in moodboards bucket
    prefix = 'moodboards';
  } else if (s3Key.startsWith('isometric/')) {
    bucketName = config.s3BucketRenders;
    objectKey = s3Key;  // Keep full key - stored as isometric/projectId/file.jpg in renders bucket
    prefix = 'isometric';
  } else if (s3Key.startsWith('renders/')) {
    bucketName = config.s3BucketRenders;
    objectKey = s3Key.replace(/^renders\//, '');
    prefix = 'renders';
  } else if (s3Key.startsWith('elevations/')) {
    bucketName = config.s3BucketRenders;
    objectKey = s3Key.replace(/^elevations\//, '');
    prefix = 'elevations';
  } else if (s3Key.startsWith('floorplans/')) {
    bucketName = config.s3BucketFloorplans;
    objectKey = s3Key.replace(/^floorplans\//, '');
    prefix = 'floorplans';
  } else if (s3Key.startsWith('exports/')) {
    bucketName = config.s3BucketExports;
    objectKey = s3Key; // Keep the full key including 'exports/' prefix if that's how it's stored
    prefix = 'exports';
  }

  return { bucketName, objectKey, prefix };

};

// ===========================================
// GET /api/public/download
// ===========================================

/**
 * Public proxy download endpoint with proper headers.
 * No authentication required - used for downloading moodboards and elevations.
 * 
 * Query params:
 * - s3Key: Logical S3 key (e.g., moodboards/projectId/roomId/v1.png)
 * - filename: Desired download filename
 * - bucket: (optional) Override bucket name
 * - url: (fallback) Direct URL to fetch from
 */
publicRouter.get('/download', async (req: Request, res: Response, _next: NextFunction) => {
    const { url: imageUrl, filename, s3Key, bucket } = req.query;

    // Set CORS headers early (before any async operations)
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

  // Sanitize filename upfront
  const safeFilename = sanitizeFilename(
    typeof filename === 'string' ? filename : 'download.jpg'
  );

  // ===========================================
  // S3 Direct Access (Primary Method)
  // ===========================================

    if (s3Key && typeof s3Key === 'string') {
    // Resolve bucket and object key from logical s3Key
    const providedBucket = (bucket && typeof bucket === 'string') ? bucket : null;
    const { bucketName, objectKey, prefix } = resolveS3Location(s3Key, providedBucket);
        
    // [DEBUG] Log the resolution (remove after verification)
    console.log('[DOWNLOAD REQUEST]', {
      originalKey: s3Key,
      resolvedBucket: bucketName,
      resolvedKey: objectKey,
      prefix,
      filename: safeFilename,
    });

    // Validate bucket was resolved
        if (!bucketName) {
      logger.warn({ s3Key }, 'Public download: Invalid s3Key prefix');
      return res.status(400).json({
        success: false,
        error: 'Invalid s3Key prefix. Must start with moodboards/, renders/, elevations/, isometric/, or floorplans/',
      });
        }
        
    logger.info({ 
      originalKey: s3Key, 
      bucket: bucketName, 
      objectKey 
    }, 'Public download: Fetching from storage');
        
    try {
        const { data: fileBuffer, contentType } = await Promise.race([
          storageService.downloadFile(bucketName, objectKey),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Storage request timeout after 25s')), 25000)
          ),
        ]);

      res.setHeader('Content-Type', contentType || 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());
      
      logger.info({ 
        originalKey: s3Key, 
        objectKey, 
        size: fileBuffer.length 
      }, 'Public download: Success');
      
      return res.send(fileBuffer);

    } catch (storageError: unknown) {
      const err = storageError as { message?: string; name?: string; Code?: string };
      console.error('[DOWNLOAD ERROR]', {
        bucketName,
        objectKey,
        originalKey: s3Key,
        message: err.message,
        code: err.Code || err.name,
      });

      logger.error({ 
        bucketName, 
        objectKey,
        originalKey: s3Key,
        error: err.message,
        code: err.Code || err.name,
      }, 'Public download: Storage access failed');

      if (err.message?.includes('not found') || err.name === 'NoSuchKey') {
        return res.status(404).json({
          success: false,
          error: 'Asset not found in storage',
        });
      }

      if (err.message?.includes('timeout')) {
        return res.status(504).json({
          success: false,
          error: 'Storage request timed out',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve asset from storage',
      });
    }
  }

  // ===========================================
  // URL Fallback (Secondary Method)
  // ===========================================

    if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Either s3Key or url parameter is required',
    });
    }

  logger.info({ url: imageUrl.substring(0, 100) }, 'Public download: Fetching from URL');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
      logger.warn({ url: imageUrl.substring(0, 100), status: response.status }, 'Public download: URL fetch failed');
      return res.status(response.status).json({
        success: false,
        error: `Failed to fetch image: ${response.status}`,
      });
      }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

      res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      res.setHeader('Content-Length', buffer.length.toString());
    
    logger.info({ url: imageUrl.substring(0, 50), size: buffer.length }, 'Public download: URL fetch success');
    return res.send(buffer);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

    console.error('[DOWNLOAD ERROR - URL]', {
      url: imageUrl.substring(0, 100),
      message: fetchError.message,
    });

      if (fetchError.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout: Image fetch took too long',
      });
      }

    logger.error({ url: imageUrl.substring(0, 100), error: fetchError.message }, 'Public download: URL fetch error');
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch image from URL',
    });
  }
});

// ===========================================
// OPTIONS handler for CORS preflight
// ===========================================

publicRouter.options('/download', (req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(204).end();
});

// ===========================================
// POST /api/public/uploads/presigned-url
// ===========================================
/**
 * Public presigned upload URL endpoint (NO auth).
 *
 * Intended for apps that do auth externally and only need a presigned URL.
 * Caller must provide userId (body.userId or x-user-id header) and projectId.
 */
const publicPresignedUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  bucket: z.enum(['floorplans', 'moodboards', 'renders', 'exports']),
  projectId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});

publicRouter.post('/uploads/presigned-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = publicPresignedUploadSchema.parse(req.body);
    const headerUserId = typeof req.headers['x-user-id'] === 'string' ? req.headers['x-user-id'] : undefined;
    const userId = (input.userId || headerUserId || '').trim();

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId. Provide body.userId or x-user-id header.',
      });
    }

    // Generate presigned URL (no ownership checks in public mode)
    const { url, key } = await storageService.generateUploadUrl({
      bucket: input.bucket,
      filename: input.filename,
      contentType: input.contentType,
      userId,
      projectId: input.projectId,
    });

    logger.info(
      {
        userId,
        projectId: input.projectId,
        bucket: input.bucket,
        key,
        public: true,
      },
      'Public upload URL generated'
    );

    return res.json({
      success: true,
      data: {
        uploadUrl: url,
        key,
        bucket: input.bucket,
        expiresIn: 3600,
        instructions: {
          method: 'PUT',
          headers: { 'Content-Type': input.contentType },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.options('/uploads/presigned-url', (req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(204).end();
});

// ===========================================
// Floor plan public flow (start -> upload -> confirm + trigger analysis)
// ===========================================

const floorplanStartSchema = z.object({
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  projectName: z.string().min(1).max(100).optional(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
});

/**
 * POST /api/public/floorplans/start
 *
 * Creates (or reuses) a project and returns a presigned URL for floorplan upload.
 * No auth middleware; caller must pass userId (body.userId or x-user-id header).
 */
publicRouter.post('/floorplans/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = floorplanStartSchema.parse(req.body);
    const headerUserId = typeof req.headers['x-user-id'] === 'string' ? req.headers['x-user-id'] : undefined;
    const userId = (input.userId || headerUserId || '').trim();
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId. Provide body.userId or x-user-id header.',
      });
    }

    let projectId = input.projectId?.trim();
    let slug: string | null = null;

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId, deletedAt: null },
        select: { id: true, slug: true },
      });
      if (!project) throw errors.notFound('Project');
      slug = project.slug;
    } else {
      const name = input.projectName?.trim() || 'Untitled project';
      slug = await generateUniqueSlug(name);
      const project = await prisma.project.create({
        data: {
          name,
          slug,
          userId,
          currentStage: 'FLOOR_PLAN',
          planCode: null,
          planSource: null,
        },
        select: { id: true, slug: true },
      });
      projectId = project.id;
      slug = project.slug;
    }

    const { url, key } = await storageService.generateUploadUrl({
      bucket: 'floorplans',
      filename: input.filename,
      contentType: input.contentType,
      userId,
      projectId,
    });

    return res.json({
      success: true,
      data: {
        projectId,
        slug,
        uploadUrl: url,
        key,
        bucket: 'floorplans',
        expiresIn: 3600,
        instructions: {
          method: 'PUT',
          headers: { 'Content-Type': input.contentType },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

const floorplanConfirmSchema = z.object({
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  key: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive().optional(),
  planType: z.enum(['residential', 'commercial']).optional(),
});

async function enqueuePublicFloorplanAnalysis(args: {
  userId: string;
  projectId: string;
  imageUrl: string;
  mimeType: string;
  planType?: 'residential' | 'commercial';
}): Promise<string> {
  const jobId = uuidv4();

  await prisma.aIJob.create({
    data: {
      id: jobId,
      userId: args.userId,
      projectId: args.projectId,
      type: 'FLOORPLAN_ANALYSIS',
      status: 'QUEUED',
      payload: {
        projectId: args.projectId,
        imageUrl: args.imageUrl,
        mimeType: args.mimeType,
        hints: { planType: args.planType ?? 'residential' },
      },
    },
  });

  await aiJobQueue.add(
    AIJobType.FLOORPLAN_ANALYSIS,
    {
      userId: args.userId,
      jobId,
      projectId: args.projectId,
      imageUrl: args.imageUrl,
      mimeType: args.mimeType,
      hints: { planType: args.planType ?? 'residential' },
    },
    {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000, age: 24 * 60 * 60 },
      removeOnFail: { count: 500, age: 7 * 24 * 60 * 60 },
    }
  );

  await jobCache.setStatus(jobId, { status: 'QUEUED', progress: 0 });
  return jobId;
}

/**
 * POST /api/public/floorplans/confirm
 *
 * Confirms that the client uploaded the floorplan to S3, registers it as FLOORPLAN_ORIGINAL
 * (same DB + storage model as the authenticated flow), updates project.floorPlanUrl,
 * and kicks off FLOORPLAN_ANALYSIS job in the same BullMQ pipeline.
 */
publicRouter.post('/floorplans/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = floorplanConfirmSchema.parse(req.body);
    const headerUserId = typeof req.headers['x-user-id'] === 'string' ? req.headers['x-user-id'] : undefined;
    const userId = (input.userId || headerUserId || '').trim();
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId. Provide body.userId or x-user-id header.',
      });
    }

    const project = await prisma.project.findFirst({
      where: { id: input.projectId, userId, deletedAt: null },
      select: { id: true, slug: true },
    });
    if (!project) throw errors.notFound('Project');

    const bucketName = config.s3BucketFloorplans;
    const imageUrl = storageService.getPublicUrl('floorplans', input.key);

    // Create asset version record similar to /api/uploads/confirm
    const latestVersion = await prisma.assetVersion.findFirst({
      where: {
        projectId: input.projectId,
        roomId: null,
        assetType: 'FLOORPLAN_ORIGINAL',
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    if (latestVersion) {
      await prisma.assetVersion.updateMany({
        where: {
          projectId: input.projectId,
          roomId: null,
          assetType: 'FLOORPLAN_ORIGINAL',
          isLatest: true,
        },
        data: { isLatest: false },
      });
    }

    const assetVersion = await prisma.assetVersion.create({
      data: {
        projectId: input.projectId,
        roomId: null,
        assetType: 'FLOORPLAN_ORIGINAL',
        version: nextVersion,
        s3Bucket: bucketName,
        s3Key: input.key,
        contentType: input.contentType,
        fileSize: input.fileSize,
        metadata: { publicUpload: true },
        isLatest: true,
        createdBy: userId,
      },
    });

    await prisma.project.update({
      where: { id: input.projectId },
      data: { floorPlanUrl: imageUrl },
    });

    const jobId = await enqueuePublicFloorplanAnalysis({
      userId,
      projectId: input.projectId,
      imageUrl,
      mimeType: input.contentType,
      planType: input.planType,
    });

    return res.status(201).json({
      success: true,
      data: {
        projectId: input.projectId,
        slug: project.slug,
        assetVersionId: assetVersion.id,
        key: input.key,
        imageUrl,
        jobId,
        nextPath: `/project/${project.slug || input.projectId}/floor-plan`,
      },
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.options('/floorplans/start', (req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(204).end();
});

publicRouter.options('/floorplans/confirm', (req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(204).end();
});

