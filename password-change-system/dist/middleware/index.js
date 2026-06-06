"use strict";
/**
 * Middleware exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupUncaughtExceptionHandler = exports.setupUnhandledRejectionHandler = exports.RateLimitError = exports.ValidationError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.AppError = exports.asyncHandler = exports.notFoundHandler = exports.globalErrorHandler = exports.sanitizeInputMiddleware = exports.normalizeInputMiddleware = exports.handleValidationErrors = exports.changePasswordValidators = exports.getUserRateLimitStatus = exports.combinedRateLimiter = exports.userRateLimiter = exports.ipRateLimiter = exports.generateToken = exports.optionalAuthMiddleware = exports.authMiddleware = exports.handlePreflight = exports.corsMiddleware = exports.applySecurityMiddleware = void 0;
var security_1 = require("./security");
Object.defineProperty(exports, "applySecurityMiddleware", { enumerable: true, get: function () { return security_1.applySecurityMiddleware; } });
var cors_1 = require("./cors");
Object.defineProperty(exports, "corsMiddleware", { enumerable: true, get: function () { return cors_1.corsMiddleware; } });
Object.defineProperty(exports, "handlePreflight", { enumerable: true, get: function () { return cors_1.handlePreflight; } });
var auth_1 = require("./auth");
Object.defineProperty(exports, "authMiddleware", { enumerable: true, get: function () { return auth_1.authMiddleware; } });
Object.defineProperty(exports, "optionalAuthMiddleware", { enumerable: true, get: function () { return auth_1.optionalAuthMiddleware; } });
Object.defineProperty(exports, "generateToken", { enumerable: true, get: function () { return auth_1.generateToken; } });
var rateLimiter_1 = require("./rateLimiter");
Object.defineProperty(exports, "ipRateLimiter", { enumerable: true, get: function () { return rateLimiter_1.ipRateLimiter; } });
Object.defineProperty(exports, "userRateLimiter", { enumerable: true, get: function () { return rateLimiter_1.userRateLimiter; } });
Object.defineProperty(exports, "combinedRateLimiter", { enumerable: true, get: function () { return rateLimiter_1.combinedRateLimiter; } });
Object.defineProperty(exports, "getUserRateLimitStatus", { enumerable: true, get: function () { return rateLimiter_1.getUserRateLimitStatus; } });
var validation_1 = require("./validation");
Object.defineProperty(exports, "changePasswordValidators", { enumerable: true, get: function () { return validation_1.changePasswordValidators; } });
Object.defineProperty(exports, "handleValidationErrors", { enumerable: true, get: function () { return validation_1.handleValidationErrors; } });
Object.defineProperty(exports, "normalizeInputMiddleware", { enumerable: true, get: function () { return validation_1.normalizeInputMiddleware; } });
Object.defineProperty(exports, "sanitizeInputMiddleware", { enumerable: true, get: function () { return validation_1.sanitizeInputMiddleware; } });
var errorHandler_1 = require("./errorHandler");
Object.defineProperty(exports, "globalErrorHandler", { enumerable: true, get: function () { return errorHandler_1.globalErrorHandler; } });
Object.defineProperty(exports, "notFoundHandler", { enumerable: true, get: function () { return errorHandler_1.notFoundHandler; } });
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return errorHandler_1.asyncHandler; } });
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return errorHandler_1.AppError; } });
Object.defineProperty(exports, "UnauthorizedError", { enumerable: true, get: function () { return errorHandler_1.UnauthorizedError; } });
Object.defineProperty(exports, "ForbiddenError", { enumerable: true, get: function () { return errorHandler_1.ForbiddenError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return errorHandler_1.NotFoundError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errorHandler_1.ValidationError; } });
Object.defineProperty(exports, "RateLimitError", { enumerable: true, get: function () { return errorHandler_1.RateLimitError; } });
Object.defineProperty(exports, "setupUnhandledRejectionHandler", { enumerable: true, get: function () { return errorHandler_1.setupUnhandledRejectionHandler; } });
Object.defineProperty(exports, "setupUncaughtExceptionHandler", { enumerable: true, get: function () { return errorHandler_1.setupUncaughtExceptionHandler; } });
//# sourceMappingURL=index.js.map