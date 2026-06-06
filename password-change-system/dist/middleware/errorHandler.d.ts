/**
 * Global Error Handler
 * Production-grade error handling with security considerations
 */
import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string, isOperational?: boolean);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    readonly details: Record<string, string[]>;
    constructor(message?: string, details?: Record<string, string[]>);
}
export declare class RateLimitError extends AppError {
    readonly retryAfter: number;
    constructor(message?: string, retryAfter?: number);
}
/**
 * Wrap async route handlers to catch errors
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Main error handling middleware
 * Must be registered last in middleware stack
 */
export declare function globalErrorHandler(err: Error | AppError, req: Request, res: Response, _next: NextFunction): void;
/**
 * Handle unmatched routes
 */
export declare function notFoundHandler(req: Request, res: Response, _next: NextFunction): void;
/**
 * Handle unhandled promise rejections
 */
export declare function setupUnhandledRejectionHandler(): void;
/**
 * Handle uncaught exceptions
 */
export declare function setupUncaughtExceptionHandler(): void;
//# sourceMappingURL=errorHandler.d.ts.map