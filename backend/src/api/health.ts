import { Router } from 'express';
import { checkDatabaseHealth } from '../lib/prisma';
import { isRedisConnected } from '../lib/redis-client';
import { config } from '../config';

const router = Router();

/**
 * Health Check Endpoints
 * Used by load balancers and monitoring
 */

// GET /health - Basic liveness check
router.get('/', async (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: config.serviceName,
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '0.1.0',
  });
});

// GET /health/ready - Readiness check (all dependencies)
router.get('/ready', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};
  let allHealthy = true;

  // Check database
  try {
    const dbHealthy = await checkDatabaseHealth();
    checks.database = dbHealthy ? 'ok' : 'error';
    if (!dbHealthy) allHealthy = false;
  } catch {
    checks.database = 'error';
    allHealthy = false;
  }

  // Check Redis (optional - graceful degradation)
  if (config.redisEnabled) {
    checks.redis = isRedisConnected() ? 'ok' : 'error';
    // Redis failure is not critical - just log it
  }

  if (allHealthy) {
    res.json({
      status: 'ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /health/live - Kubernetes liveness probe
router.get('/live', (_req, res) => {
  res.status(200).send('OK');
});

// GET /health/startup - Kubernetes startup probe
router.get('/startup', async (_req, res) => {
  try {
    // Quick check - just verify database is reachable
    const dbHealthy = await checkDatabaseHealth();
    
    if (dbHealthy) {
      res.status(200).send('OK');
    } else {
      res.status(503).send('Database not ready');
    }
  } catch {
    res.status(503).send('Startup check failed');
  }
});

export { router as healthRouter };
