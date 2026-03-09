/**
 * TatvaOps Vision - S3 Utilities
 * 
 * S3 operations for the worker service.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger';

// ===========================================
// S3 Client
// ===========================================

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    : undefined, // Use IAM role if no credentials provided
});

// ===========================================
// Upload Functions
// ===========================================

interface UploadOptions {
  bucket: string;
  key: string;
  body: Buffer | string;
  contentType: string;
  metadata?: Record<string, string>;
}

/**
 * Upload a file to S3.
 */
export async function uploadToS3(options: UploadOptions): Promise<void> {
  const { bucket, key, body, contentType, metadata } = options;

  const params: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    logger.debug('S3 upload successful', { bucket, key });
  } catch (error) {
    logger.error('S3 upload failed', { bucket, key, error: String(error) });
    throw new Error(`Failed to upload to S3: ${error}`);
  }
}

// ===========================================
// Download Functions
// ===========================================

/**
 * Download a file from S3.
 */
export async function downloadFromS3(
  bucket: string,
  key: string
): Promise<{ data: Buffer; contentType: string | undefined }> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const bodyStream = response.Body;
    if (!bodyStream) {
      throw new Error('Empty response body from S3');
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of bodyStream as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }

    return {
      data: Buffer.concat(chunks),
      contentType: response.ContentType,
    };
  } catch (error) {
    logger.error('S3 download failed', { bucket, key, error: String(error) });
    throw new Error(`Failed to download from S3: ${error}`);
  }
}

// ===========================================
// Signed URLs
// ===========================================

/**
 * Generate a signed URL for reading an S3 object.
 */
export async function generateSignedUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    logger.error('Failed to generate signed URL', {
      bucket,
      key,
      error: String(error),
    });
    throw new Error(`Failed to generate signed URL: ${error}`);
  }
}

// ===========================================
// URL Helpers
// ===========================================

/**
 * Check if a string is an S3 URL.
 */
export function isS3Url(url: string): boolean {
  return url.startsWith('s3://');
}

/**
 * Parse an S3 URL into bucket and key.
 */
export function parseS3Url(url: string): { bucket: string; key: string } {
  if (!isS3Url(url)) {
    throw new Error(`Invalid S3 URL: ${url}`);
  }

  const withoutProtocol = url.slice(5); // Remove 's3://'
  const slashIndex = withoutProtocol.indexOf('/');

  if (slashIndex === -1) {
    throw new Error(`Invalid S3 URL (no key): ${url}`);
  }

  return {
    bucket: withoutProtocol.slice(0, slashIndex),
    key: withoutProtocol.slice(slashIndex + 1),
  };
}

/**
 * Build an S3 URL from bucket and key.
 */
export function buildS3Url(bucket: string, key: string): string {
  return `s3://${bucket}/${key}`;
}

