import { Router, Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../lib/logger';
import { storageService } from '../services/storage';
import { config } from '../config';

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
    }, 'Public download: Fetching from S3');
        
    try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
        Key: objectKey,  // Use resolved objectKey, NOT original s3Key
        });

        // Set timeout for S3 request (25 seconds)
        const s3Response = await Promise.race([
          storageService.s3Client.send(command),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('S3 request timeout after 25s')), 25000)
          ),
      ]);
        
        if (!s3Response || !s3Response.Body) {
        logger.warn({ bucketName, objectKey }, 'Public download: Empty S3 response');
        return res.status(404).json({
          success: false,
          error: 'File not found in storage',
        });
        }

      // Set proper download headers with sanitized filename
      res.setHeader('Content-Type', s3Response.ContentType || 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        
        // Buffer the entire file for reliability
          const chunks: Uint8Array[] = [];
          
          if (s3Response.Body instanceof Readable) {
            for await (const chunk of s3Response.Body) {
              chunks.push(chunk);
            }
          } else {
        // Handle AWS SDK v3 stream types
        for await (const chunk of s3Response.Body as AsyncIterable<Uint8Array>) {
              chunks.push(chunk);
            }
          }
          
          const buffer = Buffer.concat(chunks);
          res.setHeader('Content-Length', buffer.length.toString());
      
      logger.info({ 
        originalKey: s3Key, 
        objectKey, 
        size: buffer.length 
      }, 'Public download: Success');
      
      return res.send(buffer);

    } catch (s3Error: any) {
      // Log detailed error for debugging
      console.error('[DOWNLOAD ERROR]', {
        bucketName,
        objectKey,
        originalKey: s3Key,
        message: s3Error.message,
        code: s3Error.Code || s3Error.name,
      });

      logger.error({ 
        bucketName, 
        objectKey,
        originalKey: s3Key,
        error: s3Error.message,
        code: s3Error.Code || s3Error.name,
      }, 'Public download: S3 access failed');

      // Return appropriate error (never throw unhandled)
      if (s3Error.Code === 'NoSuchKey' || s3Error.name === 'NoSuchKey') {
        return res.status(404).json({
          success: false,
          error: 'Asset not found in storage',
        });
        }

      if (s3Error.Code === 'AccessDenied' || s3Error.name === 'AccessDenied') {
        return res.status(403).json({
          success: false,
          error: 'Access denied to storage',
        });
      }

      if (s3Error.message?.includes('timeout')) {
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

