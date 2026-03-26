import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { logger } from '../lib/logger';

/**
 * Middleware: Verify JWT Bearer token from Authorization header
 * Attaches decoded payload to req.tokenPayload
 */
export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.tokenPayload = payload;
    next();
  } catch (err) {
    logger.warn({ err }, 'Token verification failed');
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tokenPayload?: import('../lib/jwt').DecodedToken;
    }
  }
}
