/**
 * Authentication Middleware
 * 
 * Verifies Clerk JWT tokens and extracts user information.
 * Uses @clerk/backend for token verification.
 */

import { Request, Response, NextFunction } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { config } from '../config';
import { isTatvaOpsEmail, getInternalRole } from '../lib/internal-user-utils';

// Initialize Clerk client
const clerk = createClerkClient({
  secretKey: config.clerkSecretKey,
  publishableKey: config.clerkPublishableKey, // Need this for token verification
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      clerkUserId?: string;
      user?: {
        id: string;
        clerkId: string;
        email: string;
        name?: string | null;
        plan: string;
        isInternal: boolean;
        internalRole?: string | null;
      };
    }
  }
}

/**
 * Verify Clerk JWT token and attach user to request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      });
      return;
    }

    const token = authHeader.slice(7);

    // Verify token with Clerk
    let clerkUserId: string;
    
    try {
      // Use verifyToken with secretKey for backend verification
      // Added primus9.ai primary domains to authorized parties
      const verified = await verifyToken(token, {
        secretKey: config.clerkSecretKey,
        authorizedParties: [
          'http://localhost:3000', 
          'http://localhost:3001', 
          'https://vision.tatvaops.com',
          'https://primus9.ai',
          'https://www.primus9.ai'
        ],
      });
      clerkUserId = verified.sub;
      logger.debug({ clerkUserId }, 'Token verified successfully');
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : error }, 'Invalid Clerk token');
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
      return;
    }

    // Get or create user in database
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        plan: true,
        isInternal: true,
        internalRole: true,
      },
    });

    if (!user) {
      // Fetch user details from Clerk and create in our DB
      const clerkUser = await clerk.users.getUser(clerkUserId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      
      // Auto-detect internal employee
      const isInternal = isTatvaOpsEmail(email);
      const internalRole = isInternal ? getInternalRole(email) : null;
      
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
          avatarUrl: clerkUser.imageUrl,
          isInternal,
          internalRole,
        },
        select: {
          id: true,
          clerkId: true,
          email: true,
          name: true,
          plan: true,
          isInternal: true,
          internalRole: true,
        },
      });

      logger.info({ 
        userId: user.id, 
        clerkId: clerkUserId, 
        isInternal,
        internalRole,
      }, 'New user created from Clerk');
    } else if (!user.isInternal && isTatvaOpsEmail(user.email)) {
      // Update existing user to mark as internal if not already marked
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          isInternal: true,
          internalRole: getInternalRole(user.email),
        },
        select: {
          id: true,
          clerkId: true,
          email: true,
          name: true,
          plan: true,
          isInternal: true,
          internalRole: true,
        },
      });
      
      logger.info({ userId: user.id }, 'Marked existing user as internal employee');
    }

    // Attach to request
    req.userId = user.id;
    req.clerkUserId = clerkUserId;
    req.user = user;

    next();
  } catch (error) {
    logger.error({ error }, 'Auth middleware error');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' },
    });
  }
}

/**
 * Optional auth - doesn't fail if no token, but attaches user if present
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  // Use main auth middleware logic
  return authMiddleware(req, res, next);
}

/**
 * Check if user has specific plan or higher
 */
export function requirePlan(...plans: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!plans.includes(req.user.plan)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PLAN',
          message: `This feature requires one of these plans: ${plans.join(', ')}`,
          currentPlan: req.user.plan,
          requiredPlans: plans,
        },
      });
      return;
    }

    next();
  };
}

