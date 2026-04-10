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
 * Custom Auth Provider Implementation
 */
export class CustomAuthProvider implements AuthProvider {
  async verifyToken(token: string): Promise<{ userId: string } | null> {
    try {
      // Basic JWT decoding for the custom tatvaops_token
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      const payload = JSON.parse(jsonPayload);
      
      // The payload has { "userId": "..." }
      if (payload && payload.userId) {
        return { userId: payload.userId };
      }
      // Also fallback if the token sub is used
      if (payload && payload.sub) {
        return { userId: payload.sub };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    return null;
  }
}

// Default auth provider
let authProvider: AuthProvider = new CustomAuthProvider();

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

