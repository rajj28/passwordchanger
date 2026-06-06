/**
 * Middleware exports
 */

export { applySecurityMiddleware } from './security';
export { corsMiddleware, handlePreflight } from './cors';
export { authMiddleware, optionalAuthMiddleware, generateToken } from './auth';
export { ipRateLimiter, userRateLimiter, combinedRateLimiter, getUserRateLimitStatus } from './rateLimiter';
export { changePasswordValidators, handleValidationErrors, normalizeInputMiddleware, sanitizeInputMiddleware } from './validation';
export {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  setupUnhandledRejectionHandler,
  setupUncaughtExceptionHandler,
} from './errorHandler';
