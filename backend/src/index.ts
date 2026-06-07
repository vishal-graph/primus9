import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import { logger } from './lib/logger';
import { errorHandler } from './lib/error-handler';
import { requestIdMiddleware } from './lib/request-id';
import { rateLimiter } from './lib/rate-limiter';
import { connectDatabase, disconnectDatabase } from './lib/prisma';
import { connectRedis, disconnectRedis } from './lib/redis-client';
import { storageService } from './services/storage';

// Middleware
import { authMiddleware } from './middleware/auth';
import { adminAuthMiddleware } from './middleware/admin-auth';

// API Routes
import { webhooksRouter } from './api/webhooks';
import { projectsRouter } from './api/projects';
import { userRouter } from './api/user';
import { jobsRouter } from './api/jobs';
import { uploadsRouter } from './api/uploads';
import { healthRouter } from './api/health';
import { notificationsRouter } from './api/notifications';
import { feedbackRouter } from './api/feedback';
import { adminRouter } from './api/admin';
import { publicRouter } from './api/public';
import { exportsRouter } from './api/exports';
import { senseRouter } from './api/sense';
import { thinkRouter } from './api/think';
import { catalogRouter } from './api/catalog';
import plansRouter from './api/plans';
import billingRouter from './api/billing';
import couponsRouter from './api/coupons';
import { cloudwatch } from './lib/cloudwatch';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging & tracking
app.use(requestIdMiddleware);
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Rate limiting (skip for webhooks)
app.use('/api', rateLimiter);

// Health check (no auth required)
app.use('/health', healthRouter);

// Webhooks (custom auth via signatures)
app.use('/api/webhooks', webhooksRouter);

// Public routes (no auth required - e.g., downloads)
app.use('/api/public', publicRouter);

// Protected API routes (with Clerk authentication)
app.use('/api/user', authMiddleware, userRouter);
app.use('/api/projects', authMiddleware, projectsRouter);
app.use('/api/jobs', authMiddleware, jobsRouter);
app.use('/api/uploads', authMiddleware, uploadsRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api/plans', authMiddleware, plansRouter);
app.use('/api/billing', authMiddleware, billingRouter);
app.use('/api/coupons', authMiddleware, couponsRouter);
app.use('/api/feedback', authMiddleware, feedbackRouter);
app.use('/api/exports', authMiddleware, exportsRouter);
app.use('/api/sense', authMiddleware, senseRouter);
app.use('/api/think', authMiddleware, thinkRouter);
app.use('/api/catalog', authMiddleware, catalogRouter);

// Admin routes (with @tatvaops.com email validation)
app.use('/api/admin', authMiddleware, adminAuthMiddleware, adminRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// Error handler
app.use(errorHandler);

// Start server with database connection
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Verify Supabase Storage (creates missing buckets)
    await storageService.ensureReady();
    
    // Connect to Redis (optional, graceful degradation)
    if (config.redisEnabled) {
      await connectRedis();
    }
    
    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📦 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 CORS origins: ${config.corsOrigins.join(', ')}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Disconnect from services
        await disconnectDatabase();
        await disconnectRedis();
        await cloudwatch.shutdown();
        
        logger.info('All connections closed');
        process.exit(0);
      });
      
      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

startServer();

export default app;

