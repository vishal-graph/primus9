import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

/**
 * Storage Service
 * Abstracted S3 storage operations
 * Cloud-provider agnostic interface
 */

type BucketType = 'floorplans' | 'moodboards' | 'renders' | 'exports';

interface UploadOptions {
  bucket: BucketType;
  filename: string;
  contentType: string;
  userId: string;
  projectId?: string;
}

export class StorageService {
  public s3Client: S3Client;
  private bucketMap: Record<BucketType, string>;

  constructor() {
    this.s3Client = new S3Client({
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
      requestHandler: {
        requestTimeout: 30000, // 30 second timeout for S3 requests
      },
    });

    this.bucketMap = {
      floorplans: config.s3BucketFloorplans,
      moodboards: config.s3BucketMoodboards,
      renders: config.s3BucketRenders,
      exports: config.s3BucketExports,
    };
  }

  /**
   * Generate presigned URL for file upload
   */
  async generateUploadUrl(options: UploadOptions): Promise<{ url: string; key: string }> {
    const { bucket, filename, contentType, userId, projectId } = options;
    const bucketName = this.bucketMap[bucket];

    // Generate unique key with organized path
    const ext = filename.split('.').pop() || 'bin';
    const key = projectId
      ? `${userId}/${projectId}/${uuidv4()}.${ext}`
      : `${userId}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return { url, key };
  }

  /**
   * Generate presigned URL for file download
   */
  async generateDownloadUrl(bucket: BucketType, key: string): Promise<string> {
    const bucketName = this.bucketMap[bucket];

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });
  }

  /**
   * Delete file from S3
   */
  async deleteFile(bucket: BucketType, key: string): Promise<void> {
    const bucketName = this.bucketMap[bucket];

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Get full URL for a stored file
   */
  getPublicUrl(bucket: BucketType, key: string): string {
    const bucketName = this.bucketMap[bucket];
    return `https://${bucketName}.s3.${config.awsRegion}.amazonaws.com/${key}`;
  }
}

// Singleton instance
export const storageService = new StorageService();

// Export s3Client for direct access (used by invoice service)
export const s3Client = storageService.s3Client;

