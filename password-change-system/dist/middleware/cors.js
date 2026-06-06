"use strict";
/**
 * CORS Configuration
 * Strict origin checking for production security
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsMiddleware = void 0;
exports.handlePreflight = handlePreflight;
const cors_1 = __importDefault(require("cors"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
/**
 * CORS middleware with strict origin validation
 */
exports.corsMiddleware = (0, cors_1.default)({
    // Only allow specific origins (no wildcards in production)
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
            // In production, you might want to block this
            if (config_1.config.nodeEnv === 'production') {
                (0, logger_1.logSecurity)('CORS request without origin blocked', { origin: 'none' });
                callback(new Error('Origin required'), false);
                return;
            }
            callback(null, true);
            return;
        }
        // Check if origin is in allowed list
        if (config_1.config.corsOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        // Log rejected origins for security monitoring
        (0, logger_1.logSecurity)('CORS origin rejected', {
            origin,
            allowedOrigins: config_1.config.corsOrigins,
        });
        callback(new Error('Not allowed by CORS'), false);
    },
    // Allow credentials (cookies, authorization headers)
    credentials: true,
    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Allowed headers
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Request-ID',
        'X-Idempotency-Key',
        'Accept',
        'Origin',
    ],
    // Exposed headers
    exposedHeaders: [
        'X-Request-ID',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
    ],
    // Max age for preflight cache (24 hours)
    maxAge: 86400,
    // Handle preflight
    optionsSuccessStatus: 204,
});
/**
 * Preflight handler for OPTIONS requests
 */
function handlePreflight(req, res, next) {
    // Let the cors middleware handle OPTIONS
    next();
}
//# sourceMappingURL=cors.js.map