"use strict";
/**
 * Global Error Handler
 * Production-grade error handling with security considerations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.ValidationError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.AppError = void 0;
exports.asyncHandler = asyncHandler;
exports.globalErrorHandler = globalErrorHandler;
exports.notFoundHandler = notFoundHandler;
exports.setupUnhandledRejectionHandler = setupUnhandledRejectionHandler;
exports.setupUncaughtExceptionHandler = setupUncaughtExceptionHandler;
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
// ============================================
// Custom Error Classes
// ============================================
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED', true);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN', true);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = 'Not found') {
        super(message, 404, 'NOT_FOUND', true);
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends AppError {
    details;
    constructor(message = 'Validation failed', details = {}) {
        super(message, 400, 'VALIDATION_ERROR', true);
        this.details = details;
    }
}
exports.ValidationError = ValidationError;
class RateLimitError extends AppError {
    retryAfter;
    constructor(message = 'Rate limit exceeded', retryAfter = 60) {
        super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
        this.retryAfter = retryAfter;
    }
}
exports.RateLimitError = RateLimitError;
// ============================================
// Async Handler Wrapper
// ============================================
/**
 * Wrap async route handlers to catch errors
 */
function asyncHandler(fn) {
    return (req, res, next) => {
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
function globalErrorHandler(err, req, res, _next) {
    const authReq = req;
    const requestId = authReq.requestId || 'unknown';
    // Default error response
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let errorDetails;
    let retryAfter;
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
            (0, logger_1.logError)(`Operational error: ${err.code}`, err, {
                requestId,
                userId: authReq.user?.sub,
                statusCode,
                ip: req.ip,
            });
        }
        else {
            // Log programming errors at error level with stack
            (0, logger_1.logError)(`Programming error: ${err.code}`, err, {
                requestId,
                userId: authReq.user?.sub,
                statusCode,
                ip: req.ip,
                stack: config_1.config.nodeEnv !== 'production' ? err.stack : undefined,
            });
        }
    }
    else {
        // Unknown error type - serious issue
        (0, logger_1.logError)('Unknown error type', err, {
            requestId,
            userId: authReq.user?.sub,
            ip: req.ip,
            stack: config_1.config.nodeEnv !== 'production' ? err.stack : undefined,
        });
    }
    // Security: Don't expose internal details in production
    if (config_1.config.nodeEnv === 'production' && statusCode === 500) {
        errorMessage = 'Internal server error';
        errorDetails = undefined;
    }
    // Build response
    const response = {
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
function notFoundHandler(req, res, _next) {
    const authReq = req;
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
function setupUnhandledRejectionHandler() {
    process.on('unhandledRejection', (reason) => {
        (0, logger_1.logError)('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)));
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
function setupUncaughtExceptionHandler() {
    process.on('uncaughtException', (error) => {
        (0, logger_1.logError)('Uncaught Exception', error);
        // Immediate shutdown for uncaught exceptions
        console.error('Uncaught exception. Shutting down immediately...');
        process.exit(1);
    });
}
//# sourceMappingURL=errorHandler.js.map