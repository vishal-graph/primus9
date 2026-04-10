/**
 * Express Request Type Augmentation
 *
 * Adds custom auth properties that are set by:
 * - requireAuth middleware: sets req.authUser (new)
 * - x-user-id header: used by all route handlers as req.userId (backward-compat)
 */

import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth middleware (new custom JWT implementation)
      authUser?: {
        id: string;
        email: string;
        role: string;
        isInternal: boolean;
        onboardingCompleted: boolean;
      };

      // Backward-compat shims — sourced from req.authUser or x-user-id header
      // Previously set directly by Clerk middleware
      userId?: string;
      user?: {
        id: string;
        email: string;
        isInternal?: boolean;
        plan?: string;
      };

      // Legacy Clerk property — kept for compatibility during migration
      clerkUserId?: string;
    }
  }
}

export {};
