import { verifyToken } from '@clerk/backend';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { errors } from '../lib/error-handler';
import { logger } from '../lib/logger';

/**
 * Authentication Service
 * Clerk integration with abstraction for future provider switching
 * 
 * TODO: Implement full auth flow
 * TODO: Add session management
 * TODO: Prepare for Auth.js migration
 */

export interface AuthUser {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
}

/**
 * Auth Provider Interface
 * Abstraction layer for authentication providers
 */
export interface AuthProvider {
  verifyToken(token: string): Promise<{ userId: string } | null>;
  getUserById(userId: string): Promise<AuthUser | null>;
}

/**
 * Clerk Auth Provider Implementation
 */
export class ClerkAuthProvider implements AuthProvider {
  async verifyToken(token: string): Promise<{ userId: string } | null> {
    try {
      const payload = await verifyToken(token, {
        secretKey: config.clerkSecretKey,
      });
      return { userId: payload.sub };
    } catch {
      return null;
    }
  }

  async getUserById(clerkId: string): Promise<AuthUser | null> {
    // TODO: Fetch from database
    // const user = await prisma.user.findUnique({
    //   where: { clerkId },
    // });
    // return user;
    return null;
  }
}

// Default auth provider
let authProvider: AuthProvider = new ClerkAuthProvider();

/**
 * Switch auth provider (for future Auth.js migration)
 */
export function setAuthProvider(provider: AuthProvider) {
  authProvider = provider;
}

/**
 * Authentication Middleware
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw errors.unauthorized('Missing authorization header');
    }

    const token = authHeader.substring(7);
    const result = await authProvider.verifyToken(token);

    if (!result) {
      throw errors.unauthorized('Invalid token');
    }

    // Add user ID to request
    req.headers['x-user-id'] = result.userId;
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional auth - doesn't fail if no token
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = await authProvider.verifyToken(token);
      
      if (result) {
        req.headers['x-user-id'] = result.userId;
      }
    }
    
    next();
  } catch {
    // Ignore auth errors for optional auth
    next();
  }
}

