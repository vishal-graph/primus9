/**
 * Admin Authentication Middleware
 * 
 * Restricts access to admin routes to @tatvaops.com email addresses only
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Check if user email is a TatvaOps admin email
 */
function isTatvaOpsEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith('@tatvaops.com');
}

/**
 * Admin authentication middleware
 * Verifies that authenticated user has @tatvaops.com email domain
 */
export async function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const token = authHeader.substring(7);
    const parts = token.split('.');
    if (parts.length !== 3) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token format' },
      });
      return;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(jsonPayload);

    const userEmail = payload.email || null;
    const isInternal = payload.isInternal || false;

    // Check if email is @tatvaops.com domain or marked as internal in JWT
    if (!userEmail || (!isTatvaOpsEmail(userEmail) && !isInternal)) {
      logger.warn(
        { userId: payload.userId, email: userEmail },
        'Non-admin user attempted to access admin route'
      );

      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access restricted to @tatvaops.com emails',
        },
      });
      return;
    }

    // User is admin, log access and continue
    logger.info(
      { 
        userId: payload.userId, 
        email: userEmail, 
        path: req.path,
        method: req.method,
      },
      'Admin route accessed'
    );

    // Attach admin flag to request for downstream use
    (req as any).isAdmin = true;
    (req as any).adminEmail = userEmail;

    next();
  } catch (error) {
    logger.error({ error }, 'Error in admin auth middleware');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication check failed',
      },
    });
  }
}

