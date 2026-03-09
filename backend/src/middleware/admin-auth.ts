/**
 * Admin Authentication Middleware
 * 
 * Restricts access to admin routes to @tatvaops.com email addresses only
 */

import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
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
    const clerkUserId = req.clerkUserId;

    // Check if user is authenticated
    if (!clerkUserId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Get user from Clerk to check email domain
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    
    // Get primary email address
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    );

    const userEmail = primaryEmail?.emailAddress || null;

    // Check if email is @tatvaops.com domain
    if (!isTatvaOpsEmail(userEmail)) {
      logger.warn(
        { clerkUserId, email: userEmail },
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
        clerkUserId, 
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

