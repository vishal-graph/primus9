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

  /** Optional Supabase (or other) Postgres URL for product catalog grounding — moodboards / 3D views. */
  productCatalogDatabaseUrl: z.string().url().optional(),
  /** Strict verification mode: sofas/tiles must resolve from product catalog DB. */
  strictCatalogSofaTiles: z.coerce.boolean().default(false),

  // Redis (optional for caching)
  redisUrl: z.string().default('redis://localhost:6379'),
  redisEnabled: z.coerce.boolean().default(true),

  // Supabase Storage
  supabaseUrl: z.string().url(),
  supabaseServiceRoleKey: z.string().min(1),

  // AWS (optional — CloudWatch/SQS only)
  awsAccessKeyId: z.string().optional().default('unused'),
  awsSecretAccessKey: z.string().optional().default('unused'),
  awsRegion: z.string().default('ap-south-1'),

  // Storage bucket names (Supabase Storage)
  s3BucketFloorplans: z.string().default('floorplans'),
  s3BucketMoodboards: z.string().default('moodboards'),
  s3BucketRenders: z.string().default('renders'),
  s3BucketExports: z.string().default('exports'),

  // AWS SQS Queues (Deprecated - Now using BullMQ)
  sqsQueueFloorplanAnalysis: z.string().optional(),
  sqsQueueMoodboardGeneration: z.string().optional(),
  sqsQueueInteriorViewGeneration: z.string().optional(),
  sqsQueueComponentUpdate: z.string().optional(),
  sqsQueueNotification: z.string().optional(),
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

  // Worker Settings (default 1 to avoid DB pool exhaustion with Neon/Supabase Session mode)
  workerConcurrency: z.coerce.number().default(1),
  workerPollInterval: z.coerce.number().default(20),
  workerMaxProcessingTime: z.coerce.number().default(300), // 5 minutes
});

type Config = z.infer<typeof configSchema>;

/** Same rules as backend — plain redis:// to Upstash is closed by the server. */
function normalizeRedisUrl(url: string): string {
  const trimmed = url.trim().replace(/^["']|["']$/g, '');
  if (!trimmed.toLowerCase().startsWith('redis://')) {
    return trimmed;
  }
  try {
    const rest = trimmed.slice('redis://'.length);
    const hostPart = rest.includes('@') ? rest.split('@')[1] : rest;
    const host = (hostPart.split(':')[0] || '').toLowerCase();
    if (
      host.endsWith('.upstash.io') ||
      host.endsWith('.redis.cloud') ||
      host.includes('redns.redis-cloud.com')
    ) {
      return `rediss://${rest}`;
    }
  } catch {
    /* keep */
  }
  return trimmed;
}

function deriveSupabaseUrlFromDatabaseUrl(databaseUrl: string): string | undefined {
  const match = databaseUrl.match(/postgres\.([a-z0-9]+)/i);
  if (match?.[1]) return `https://${match[1]}.supabase.co`;
  return undefined;
}

function loadConfig(): Config {
  try {
    const databaseUrl = process.env.DATABASE_URL || '';
    const supabaseUrl =
      process.env.SUPABASE_URL?.trim() ||
      deriveSupabaseUrlFromDatabaseUrl(databaseUrl) ||
      '';

    const parsed = configSchema.parse({
      serviceName: process.env.SERVICE_NAME,
      nodeEnv: process.env.NODE_ENV,
      databaseUrl,
      supabaseUrl,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      productCatalogDatabaseUrl: process.env.PRODUCT_CATALOG_DATABASE_URL,
      strictCatalogSofaTiles: process.env.STRICT_CATALOG_SOFA_TILES,
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
    const redisUrl = normalizeRedisUrl(parsed.redisUrl);
    process.env.REDIS_URL = redisUrl;
    return { ...parsed, redisUrl };
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

