/**
 * Global Error Handler
 * Production-grade error handling with security considerations
 */

import { Request, Response, NextFunction } from 'express';
import { IAuthenticatedRequest } from '../types';
import { logError } from '../utils/logger';
import { config } from '../config';

// ============================================
// Custom Error Classes
// ============================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED', true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN', true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 404, 'NOT_FOUND', true);
  }
}

export class ValidationError extends AppError {
  public readonly details: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    details: Record<string, string[]> = {}
  ) {
    super(message, 400, 'VALIDATION_ERROR', true);
    this.details = details;
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter: number = 60) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
    this.retryAfter = retryAfter;
  }
}

// ============================================
// Async Handler Wrapper
// ============================================

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================
// Global Error Handler
// ============================================

/**
 * Main error handling middleware
 * Must be registered last in middleware stack
 */
export function globalErrorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const authReq = req as IAuthenticatedRequest;
  const requestId = authReq.requestId || 'unknown';

  // Default error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let errorMessage = 'An unexpected error occurred';
  let errorDetails: Record<string, string[]> | undefined;
  let retryAfter: number | undefined;

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    errorMessage = err.message;

    if (err instanceof ValidationError) {
      errorDetails = err.details;
    }

    if (err instanceof RateLimitError) {
      retryAfter = err.retryAfter;
    }

    // Log operational errors at warning level
    if (err.isOperational) {
      logError(`Operational error: ${err.code}`, err, {
        requestId,
        userId: authReq.user?.sub,
        statusCode,
        ip: req.ip,
      });
    } else {
      // Log programming errors at error level with stack
      logError(`Programming error: ${err.code}`, err, {
        requestId,
        userId: authReq.user?.sub,
        statusCode,
        ip: req.ip,
        stack: config.nodeEnv !== 'production' ? err.stack : undefined,
      });
    }
  } else {
    // Unknown error type - serious issue
    logError('Unknown error type', err, {
      requestId,
      userId: authReq.user?.sub,
      ip: req.ip,
      stack: config.nodeEnv !== 'production' ? err.stack : undefined,
    });
  }

  // Security: Don't expose internal details in production
  if (config.nodeEnv === 'production' && statusCode === 500) {
    errorMessage = 'Internal server error';
    errorDetails = undefined;
  }

  // Build response
  const response: Record<string, unknown> = {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      ...(errorDetails && { details: errorDetails }),
    },
    requestId,
    timestamp: new Date().toISOString(),
  };

  // Add retry-after header for rate limits
  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter);
  }

  // Timing safety: Add small random delay for auth errors to prevent timing attacks
  if (statusCode === 401 || statusCode === 403) {
    const delay = Math.floor(Math.random() * 50) + 50; // 50-100ms
    
    setTimeout(() => {
      res.status(statusCode).json(response);
    }, delay);
    return;
  }

  res.status(statusCode).json(response);
}

// ============================================
// 404 Handler
// ============================================

/**
 * Handle unmatched routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const authReq = req as IAuthenticatedRequest;
  const requestId = authReq.requestId || 'unknown';

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    requestId,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// Unhandled Rejection Handler
// ============================================

/**
 * Handle unhandled promise rejections
 */
export function setupUnhandledRejectionHandler(): void {
  process.on('unhandledRejection', (reason: unknown) => {
    logError('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)));
    
    // Graceful shutdown
    console.error('Unhandled rejection. Shutting down gracefully...');
    process.exit(1);
  });
}

// ============================================
// Uncaught Exception Handler
// ============================================

/**
 * Handle uncaught exceptions
 */
export function setupUncaughtExceptionHandler(): void {
  process.on('uncaughtException', (error: Error) => {
    logError('Uncaught Exception', error);
    
    // Immediate shutdown for uncaught exceptions
    console.error('Uncaught exception. Shutting down immediately...');
    process.exit(1);
  });
}
