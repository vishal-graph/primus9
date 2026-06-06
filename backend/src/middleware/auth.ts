import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { errors } from '../lib/error-handler';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

/**
 * Auth Middleware — TatvaOps Custom JWT
 *
 * Replaces the previous Clerk-based auth middleware.
 * Verifies our own JWTs issued by services/auth-service.
 */

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  isInternal: boolean;
  onboardingCompleted: boolean;
}

function isUuid(value: string): boolean {
  // Accept any 36-char UUID-like value (we only need a stable identifier here).
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());
}

function allowHeaderBypass(): boolean {
  const raw = (process.env.ALLOW_X_USER_ID_BYPASS || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function tryApplyHeaderBypass(req: Request): boolean {
  if (!allowHeaderBypass()) return false;

  const header = req.headers['x-user-id'];
  const userId = typeof header === 'string' ? header.trim() : '';
  if (!userId || !isUuid(userId)) return false;

  req.authUser = {
    id: userId,
    email: '',
    role: 'EXTERNAL',
    isInternal: false,
    onboardingCompleted: true,
  };

  // Backward-compat shims — existing route handlers use req.userId / req.user / req.clerkUserId
  req.userId = userId;
  req.clerkUserId = userId;
  req.user = { id: userId, email: '', isInternal: false };
  req.headers['x-user-id'] = userId;
  return true;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string;
        role: string;
        isInternal: boolean;
        onboardingCompleted: boolean;
      };
    }
  }
}

/**
 * Required authentication middleware — rejects requests without a valid JWT.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Temporary integration mode: allow upstream apps to pass x-user-id without JWT.
    if (tryApplyHeaderBypass(req)) {
      next();
      return;
    }

    let token = '';
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      // Try extracting from cookies (e.g. Next.js API route proxying)
      const match = req.headers.cookie.match(/tatvaops_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      throw errors.unauthorized('Missing authorization header or token');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, config.jwtSecret, {
        issuer: 'tatvaops-auth-service',
        audience: 'tatvaops-apps',
      }) as JwtPayload;
    } catch {
      throw errors.unauthorized('Invalid or expired token');
    }

    if (!payload.userId) {
      throw errors.unauthorized('Invalid token payload');
    }

    // Attach the auth user to request for downstream handlers
    req.authUser = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      isInternal: payload.isInternal,
      onboardingCompleted: payload.onboardingCompleted,
    };

    // Backward-compat shims — existing route handlers use req.userId / req.user / req.clerkUserId
    req.userId = payload.userId;
    req.clerkUserId = payload.userId; // Legacy alias
    req.user = { id: payload.userId, email: payload.email, isInternal: payload.isInternal };

    // Also set x-user-id for any handlers that read from headers
    req.headers['x-user-id'] = payload.userId;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional auth — sets auth user if token is present and valid, continues regardless.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (tryApplyHeaderBypass(req)) {
      next();
      return;
    }

    let token = '';
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/tatvaops_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret, {
          issuer: 'tatvaops-auth-service',
          audience: 'tatvaops-apps',
        }) as JwtPayload;
        if (payload.userId) {
          req.authUser = {
            id: payload.userId,
            email: payload.email,
            role: payload.role,
            isInternal: payload.isInternal,
            onboardingCompleted: payload.onboardingCompleted,
          };
          req.headers['x-user-id'] = payload.userId;
        }
      } catch {
        // Silently ignore invalid token for optional auth
        logger.debug('Optional auth: invalid token, continuing unauthenticated');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Admin-only guard — requires isInternal flag in JWT.
 * Must be used AFTER requireAuth.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.authUser?.isInternal) {
    next(errors.forbidden('Admin access required'));
    return;
  }
  next();
}

// Backward-compat alias
export const authMiddleware = requireAuth;
export const optionalAuthMiddleware = optionalAuth;
