import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';
import { StorageError } from '../services/storage';

/**
 * Custom Application Error
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error factory functions
 */
export const errors = {
  unauthorized: (message = 'Unauthorized') =>
    new AppError(message, 'UNAUTHORIZED', 401),
  
  forbidden: (message = 'Forbidden') =>
    new AppError(message, 'FORBIDDEN', 403),
  
  notFound: (resource = 'Resource') =>
    new AppError(`${resource} not found`, 'NOT_FOUND', 404),
  
  badRequest: (message: string, details?: Record<string, unknown>) =>
    new AppError(message, 'BAD_REQUEST', 400, true, details),
  
  conflict: (message: string) =>
    new AppError(message, 'CONFLICT', 409),
  
  tooManyRequests: (message = 'Too many requests') =>
    new AppError(message, 'RATE_LIMIT_EXCEEDED', 429),
  
  internal: (message = 'Internal server error') =>
    new AppError(message, 'INTERNAL_ERROR', 500, false),
};

/**
 * Express error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.headers['x-request-id'] as string;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    logger.warn({ requestId, errors: err.errors }, 'Validation error');
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors,
      },
    });
  }

  // Handle storage configuration / bucket errors
  if (err instanceof StorageError) {
    logger.error({ requestId, message: err.message }, 'Storage error');
    return res.status(503).json({
      success: false,
      error: {
        code: 'STORAGE_ERROR',
        message: err.message,
      },
    });
  }

  // Handle AppError
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ requestId, err }, 'Non-operational error');
    } else {
      logger.warn({ requestId, code: err.code }, err.message);
    }

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Handle unknown errors
  logger.error({ requestId, err }, 'Unhandled error');
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

