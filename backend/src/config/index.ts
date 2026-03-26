import { z } from 'zod';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file
dotenvConfig();

/**
 * Configuration Schema
 * Validates environment variables at startup
 * 
 * Architecture Decision:
 * - All secrets via environment variables
 * - Optional values have sensible defaults
 * - Validation at startup prevents runtime errors
 */

// Helper for optional URL that can be empty string
const optionalUrl = z.string().url().optional().or(z.literal(''));

const configSchema = z.object({
  // Server
  port: z.coerce.number().default(4000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  corsOrigins: z.string().transform((s) => s.split(',')).default('http://localhost:3000,http://localhost:3001'),
  serviceName: z.string().default('primus9-api'),

  // Database (Supabase PostgreSQL)
  databaseUrl: z.string().url(),

  // Redis (Upstash or local)
  redisUrl: z.string().default('redis://localhost:6379'),
  redisEnabled: z.coerce.boolean().default(true),

  // Clerk Authentication
  clerkSecretKey: z.string(),
  clerkPublishableKey: z.string().optional(), // For token verification
  clerkWebhookSecret: z.string().optional(),

  // AWS
  awsAccessKeyId: z.string(),
  awsSecretAccessKey: z.string(),
  awsRegion: z.string().default('ap-south-1'),

  // CloudWatch Logs (optional; when unset, CloudWatch logger is disabled)
  cloudwatchEnabled: z.coerce.boolean().default(false),
  cloudwatchLogGroup: z.string().optional(),
  cloudwatchLogStream: z.string().optional(),

  // SQS queue URLs (optional; jobs use BullMQ/Redis when Redis is enabled)
  sqsQueueFloorplanAnalysis: z.string().optional(),
  sqsQueueMoodboardGeneration: z.string().optional(),
  sqsQueueInteriorViewGeneration: z.string().optional(),
  sqsQueueComponentUpdate: z.string().optional(),
  sqsQueueNotification: z.string().optional(),
  sqsQueuePdfExport: z.string().optional(),
  sqsQueueSenseInference: z.string().optional(),
  sqsDlqFloorplanAnalysis: z.string().optional(),
  sqsDlqMoodboardGeneration: z.string().optional(),
  sqsDlqInteriorViewGeneration: z.string().optional(),
  sqsDlqComponentUpdate: z.string().optional(),
  sqsDlqNotification: z.string().optional(),
  sqsDlqPdfExport: z.string().optional(),
  sqsDlqSenseInference: z.string().optional(),

  // AWS S3 Buckets
  s3BucketFloorplans: z.string(),
  s3BucketMoodboards: z.string(),
  s3BucketRenders: z.string(),
  s3BucketExports: z.string(),
  s3SignedUrlExpiry: z.coerce.number().default(3600), // 1 hour

  // Resend Email
  resendApiKey: z.string().default('re_dummy'),
  emailFromAddress: z.string().default('Primus9 <noreply@primus9.ai>'),
  emailReplyTo: z.string().default('support@primus9.ai'),

  // Google Gemini AI
  geminiApiKey: z.string(),
  geminiModel: z.string().default('gemini-2.5-flash'),
  geminiImageModel: z.string().default('gemini-3-pro-image-preview'),
  geminiTextApiVersion: z.string().default('v1'),
  geminiImageApiVersion: z.string().default('v1beta'),

  // Runway (image-to-video for room walkthroughs). Optional. When set, worker uses Runway Gen-4 Turbo.
  runwayApiKey: z.string().optional(),

  // Razorpay Payments
  razorpayKeyId: z.string().optional(),
  razorpayKeySecret: z.string().optional(),
  razorpayWebhookSecret: z.string().optional(),

  // MSG91 (WhatsApp)
  msg91AuthKey: z.string().optional(),
  msg91SenderId: z.string().optional(),
  msg91TemplateId: z.string().optional(),
  msg91Enabled: z.coerce.boolean().default(false),

  // Rate Limiting
  rateLimitWindowMs: z.coerce.number().default(60000), // 1 minute
  rateLimitMaxRequests: z.coerce.number().default(800), // 800/min (getProjects does 1+2N; dev often skips limit)
  rateLimitAiWindowMs: z.coerce.number().default(60000),
  rateLimitAiMaxRequests: z.coerce.number().default(10),

  // Feature Flags
  featureMoodboardV2: z.coerce.boolean().default(false),
  feature3DPreview: z.coerce.boolean().default(false),
  featureComponentInjection: z.coerce.boolean().default(false),
  featureWhatsappNotifications: z.coerce.boolean().default(false),

  // Worker Settings (for BullMQ worker)
  workerConcurrency: z.coerce.number().default(3),
});

type Config = z.infer<typeof configSchema>;

/**
 * Cloud Redis often requires TLS. Plain `redis://` to Upstash (etc.) is reset by the server → ECONNRESET.
 * Auto-upgrade to `rediss://` when the host is a known TLS-only endpoint.
 */
function normalizeRedisUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.toLowerCase().startsWith('redis://')) {
    return trimmed;
  }
  try {
    const rest = trimmed.slice('redis://'.length);
    const hostPart = rest.includes('@') ? rest.split('@')[1] : rest;
    const host = (hostPart.split(':')[0] || '').toLowerCase();
    const tlsHosts =
      host.endsWith('.upstash.io') ||
      host.endsWith('.redis.cloud') ||
      host.includes('redns.redis-cloud.com');
    if (tlsHosts) {
      return `rediss://${rest}`;
    }
  } catch {
    /* keep original */
  }
  return trimmed;
}

function loadConfig(): Config {
  try {
    const isQueueWorkerProcess = process.argv.some((arg) =>
      /(?:^|[\\/])(?:src|dist)[\\/]workers[\\/]index\.(?:ts|js)$/.test(arg)
    );
    const nodeEnvRaw = (
      !process.env.NODE_ENV?.trim() ? 'development' : process.env.NODE_ENV
    ).toLowerCase();
    const isDevLike = nodeEnvRaw === 'development' || nodeEnvRaw === 'test';
    // `npm run dev` sets npm_lifecycle_event=dev even when .env has NODE_ENV=production.
    const isNpmDevScript = process.env.npm_lifecycle_event === 'dev';
    // Clerk is not wired into request auth anymore; key is only validated for legacy/env completeness.
    // Allow local dev / queue worker without CLERK_SECRET_KEY. Real deployments should set a real key.
    if (
      !process.env.CLERK_SECRET_KEY &&
      (isQueueWorkerProcess || isDevLike || isNpmDevScript)
    ) {
      process.env.CLERK_SECRET_KEY = isQueueWorkerProcess ? 'worker-no-clerk' : 'dev-no-clerk';
    }

    const parsed = configSchema.parse({
      // Server
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,
      corsOrigins: process.env.CORS_ORIGINS,
      serviceName: process.env.SERVICE_NAME,

      // Database
      databaseUrl: process.env.DATABASE_URL,

      // Redis
      redisUrl: process.env.REDIS_URL,
      redisEnabled: process.env.REDIS_ENABLED,

      // Clerk
      clerkSecretKey: process.env.CLERK_SECRET_KEY,
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET,

      // AWS General
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION,

      // CloudWatch
      cloudwatchEnabled: process.env.CLOUDWATCH_ENABLED,
      cloudwatchLogGroup: process.env.CLOUDWATCH_LOG_GROUP,
      cloudwatchLogStream: process.env.CLOUDWATCH_LOG_STREAM,

      // SQS
      sqsQueueFloorplanAnalysis: process.env.SQS_QUEUE_FLOORPLAN_ANALYSIS,
      sqsQueueMoodboardGeneration: process.env.SQS_QUEUE_MOODBOARD_GENERATION,
      sqsQueueInteriorViewGeneration: process.env.SQS_QUEUE_INTERIOR_VIEW_GENERATION,
      sqsQueueComponentUpdate: process.env.SQS_QUEUE_COMPONENT_UPDATE,
      sqsQueueNotification: process.env.SQS_QUEUE_NOTIFICATION,
      sqsQueuePdfExport: process.env.SQS_QUEUE_PDF_EXPORT,
      sqsQueueSenseInference: process.env.SQS_QUEUE_SENSE_INFERENCE,
      sqsDlqFloorplanAnalysis: process.env.SQS_DLQ_FLOORPLAN_ANALYSIS,
      sqsDlqMoodboardGeneration: process.env.SQS_DLQ_MOODBOARD_GENERATION,
      sqsDlqInteriorViewGeneration: process.env.SQS_DLQ_INTERIOR_VIEW_GENERATION,
      sqsDlqComponentUpdate: process.env.SQS_DLQ_COMPONENT_UPDATE,
      sqsDlqNotification: process.env.SQS_DLQ_NOTIFICATION,
      sqsDlqPdfExport: process.env.SQS_DLQ_PDF_EXPORT,
      sqsDlqSenseInference: process.env.SQS_DLQ_SENSE_INFERENCE,

      // S3
      s3BucketFloorplans: process.env.S3_BUCKET_FLOORPLANS,
      s3BucketMoodboards: process.env.S3_BUCKET_MOODBOARDS,
      s3BucketRenders: process.env.S3_BUCKET_RENDERS,
      s3BucketExports: process.env.S3_BUCKET_EXPORTS,
      s3SignedUrlExpiry: process.env.S3_SIGNED_URL_EXPIRY,

      // Resend Email
      resendApiKey: process.env.RESEND_API_KEY,
      emailFromAddress: process.env.EMAIL_FROM_ADDRESS,
      emailReplyTo: process.env.EMAIL_REPLY_TO,

      // Gemini
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
      geminiImageModel: process.env.GEMINI_IMAGE_MODEL,
      geminiTextApiVersion: process.env.GEMINI_TEXT_API_VERSION,
      geminiImageApiVersion: process.env.GEMINI_IMAGE_API_VERSION,

      // Runway (worker reads process.env.RUNWAY_API_KEY when running in this process)
      runwayApiKey: process.env.RUNWAY_API_KEY,

      // Razorpay
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
      razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,

      // MSG91
      msg91AuthKey: process.env.MSG91_AUTH_KEY,
      msg91SenderId: process.env.MSG91_SENDER_ID,
      msg91TemplateId: process.env.MSG91_TEMPLATE_ID,
      msg91Enabled: process.env.MSG91_ENABLED,

      // Rate Limiting
      rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
      rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
      rateLimitAiWindowMs: process.env.RATE_LIMIT_AI_WINDOW_MS,
      rateLimitAiMaxRequests: process.env.RATE_LIMIT_AI_MAX_REQUESTS,

      // Feature Flags
      featureMoodboardV2: process.env.FEATURE_MOODBOARD_V2,
      feature3DPreview: process.env.FEATURE_3D_PREVIEW,
      featureComponentInjection: process.env.FEATURE_COMPONENT_INJECTION,
      featureWhatsappNotifications: process.env.FEATURE_WHATSAPP_NOTIFICATIONS,

      // Worker
      workerConcurrency: process.env.WORKER_CONCURRENCY,
    });
    const redisUrl = normalizeRedisUrl(parsed.redisUrl);
    // Vision worker handlers read process.env.REDIS_URL; keep in sync with BullMQ (TLS for Upstash).
    process.env.REDIS_URL = redisUrl;
    return {
      ...parsed,
      redisUrl,
    };
  } catch (error) {
    console.error('❌ Configuration validation failed:');
    if (error instanceof z.ZodError) {
      console.error(error.errors);
    }
    process.exit(1);
  }
}

export const config = loadConfig();
export type { Config };

/**
 * Helper to check if running in production
 */
export const isProduction = config.nodeEnv === 'production';

/**
 * Helper to check if a feature is enabled
 */
export const features = {
  moodboardV2: config.featureMoodboardV2,
  preview3D: config.feature3DPreview,
  componentInjection: config.featureComponentInjection,
  whatsappNotifications: config.featureWhatsappNotifications,
};

