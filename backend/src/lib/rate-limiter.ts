import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * Rate limiter configuration
 * Can be customized per route or user tier
 * 
 * Excludes:
 * - /api/user/* (needed for authentication)
 * - /api/public/* (public downloads)
 * - /api/webhooks/* (webhook endpoints)
 */
export const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  keyGenerator: (req) => {
    // Prefer x-user-id (sent by frontend from Clerk) so each user has their own limit; fallback to IP
    const userId = req.headers['x-user-id'] as string;
    if (userId && typeof userId === 'string' && userId.length > 0) return userId;
    return req.ip || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting in development to avoid "Too many requests" during local dev
    if (process.env.NODE_ENV === 'development') return true;
    // Skip rate limiting for user auth endpoints, public routes, and webhooks
    const path = req.path;
    return (
      path.startsWith('/api/user') ||
      path.startsWith('/api/public') ||
      path.startsWith('/api/webhooks')
    );
  },
});

/**
 * Stricter rate limiter for AI generation endpoints
 * Increased to 50/minute to support multi-room moodboard generation
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute (supports ~10 room batch generation)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'AI generation limit reached. Please wait before trying again.',
    },
  },
});

