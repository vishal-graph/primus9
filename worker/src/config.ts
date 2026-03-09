import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

/**
 * Worker Service Configuration
 * Separate from API config to allow independent deployment
 */

const configSchema = z.object({
  // Service
  serviceName: z.string().default('tatvaops-vision-worker'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  databaseUrl: z.string().url(),

  // Redis (optional for caching)
  redisUrl: z.string().default('redis://localhost:6379'),
  redisEnabled: z.coerce.boolean().default(true),

  // AWS General
  awsAccessKeyId: z.string(),
  awsSecretAccessKey: z.string(),
  awsRegion: z.string().default('ap-south-1'),

  // AWS S3
  s3BucketFloorplans: z.string(),
  s3BucketMoodboards: z.string(),
  s3BucketRenders: z.string(),
  s3BucketExports: z.string(),

  // AWS SQS Queues
  sqsQueueFloorplanAnalysis: z.string(),
  sqsQueueMoodboardGeneration: z.string(),
  sqsQueueInteriorViewGeneration: z.string(),
  sqsQueueComponentUpdate: z.string(),
  sqsQueueNotification: z.string(),
  sqsQueuePdfExport: z.string().optional(),

  // SQS Settings
  sqsVisibilityTimeout: z.coerce.number().default(300),
  sqsMaxReceiveCount: z.coerce.number().default(3),

  // AWS CloudWatch
  cloudwatchEnabled: z.coerce.boolean().default(true),
  cloudwatchLogGroup: z.string().default('/tatvaops/vision/worker'),
  cloudwatchLogStream: z.string().optional(),

  // Google Gemini AI
  geminiApiKey: z.string(),
  // Runway (image-to-video). Required for room walkthrough; no fallback (Runway only).
  runwayApiKey: z.string().optional(),
  // Image generation model (for moodboards)
  geminiImageModel: z.string().default('gemini-3-pro-image-preview'),
  // Fallback image model if primary (e.g. gemini-3-pro) fails
  geminiImageModelFallback: z.string().optional(),
  // Text analysis model (for image analysis)
  geminiTextModel: z.string().default('gemini-2.5-flash'),
  // API Versions
  geminiTextApiVersion: z.string().default('v1'),
  geminiImageApiVersion: z.string().default('v1beta'),

  // Worker Settings
  workerConcurrency: z.coerce.number().default(2),
  workerPollInterval: z.coerce.number().default(20),
  workerMaxProcessingTime: z.coerce.number().default(300), // 5 minutes
});

type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  try {
    return configSchema.parse({
      serviceName: process.env.SERVICE_NAME,
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      redisEnabled: process.env.REDIS_ENABLED,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION,
      s3BucketFloorplans: process.env.S3_BUCKET_FLOORPLANS,
      s3BucketMoodboards: process.env.S3_BUCKET_MOODBOARDS,
      s3BucketRenders: process.env.S3_BUCKET_RENDERS,
      s3BucketExports: process.env.S3_BUCKET_EXPORTS,
      sqsQueueFloorplanAnalysis: process.env.SQS_QUEUE_FLOORPLAN_ANALYSIS,
      sqsQueueMoodboardGeneration: process.env.SQS_QUEUE_MOODBOARD_GENERATION,
      sqsQueueInteriorViewGeneration: process.env.SQS_QUEUE_INTERIOR_VIEW_GENERATION,
      sqsQueueComponentUpdate: process.env.SQS_QUEUE_COMPONENT_UPDATE,
      sqsQueueNotification: process.env.SQS_QUEUE_NOTIFICATION,
      sqsQueuePdfExport: process.env.SQS_QUEUE_PDF_EXPORT,
      sqsVisibilityTimeout: process.env.SQS_VISIBILITY_TIMEOUT,
      sqsMaxReceiveCount: process.env.SQS_MAX_RECEIVE_COUNT,
      cloudwatchEnabled: process.env.CLOUDWATCH_ENABLED,
      cloudwatchLogGroup: process.env.CLOUDWATCH_LOG_GROUP,
      cloudwatchLogStream: process.env.CLOUDWATCH_LOG_STREAM,
      geminiApiKey: process.env.GEMINI_API_KEY,
      runwayApiKey: process.env.RUNWAY_API_KEY,
      geminiImageModel: process.env.GEMINI_IMAGE_MODEL,
      geminiImageModelFallback: process.env.GEMINI_IMAGE_MODEL_FALLBACK,
      geminiTextModel: process.env.GEMINI_MODEL || process.env.GEMINI_TEXT_MODEL,
      geminiTextApiVersion: process.env.GEMINI_TEXT_API_VERSION,
      geminiImageApiVersion: process.env.GEMINI_IMAGE_API_VERSION,
      workerConcurrency: process.env.WORKER_CONCURRENCY,
      workerPollInterval: process.env.WORKER_POLL_INTERVAL,
      workerMaxProcessingTime: process.env.WORKER_MAX_PROCESSING_TIME,
    });
  } catch (error) {
    console.error('❌ Worker configuration validation failed:');
    if (error instanceof z.ZodError) {
      console.error(error.errors);
    }
    process.exit(1);
  }
}

export const config = loadConfig();
export type { Config };

