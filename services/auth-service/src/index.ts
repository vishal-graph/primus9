import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { config } from './config';
import { logger } from './lib/logger';
import { connectDatabase, disconnectDatabase } from './lib/prisma';
import { authRouter } from './routes/auth';
import { onboardingRouter } from './routes/onboarding';

const app = express();

// ============================================================
// Core Security Middleware
// ============================================================

app.set('trust proxy', 1); // Trust first proxy for correct req.ip

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,        // Allow cookies cross-origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
  maxAge: 86_400,
}));

// ============================================================
// Request Parsing
// ============================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================
// Logging
// ============================================================

app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ============================================================
// Health Check
// ============================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: config.serviceName,
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// ============================================================
// Auth Routes
// ============================================================

app.use('/auth', authRouter);
app.use('/onboarding', onboardingRouter);

// ============================================================
// 404 Fallback
// ============================================================

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// ============================================================
// Error Handler
// ============================================================

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

// ============================================================
// Start Server
// ============================================================

async function startServer() {
  try {
    await connectDatabase();

    const server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`🔐 TatvaOps Auth Service running on port ${config.port}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 CORS origins: ${config.corsOrigins.join(', ')}`);
    });

    const shutdown = async () => {
      logger.info('Shutting down auth service...');
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Auth service stopped');
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 15000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error({ error }, 'Failed to start auth service');
    process.exit(1);
  }
}

startServer();

export default app;
