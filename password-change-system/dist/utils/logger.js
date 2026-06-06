"use strict";
/**
 * Production-grade Logger
 * Structured JSON logging with request correlation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.RequestLogger = void 0;
exports.logInfo = logInfo;
exports.logWarn = logWarn;
exports.logError = logError;
exports.logDebug = logDebug;
exports.logSecurity = logSecurity;
exports.logAudit = logAudit;
exports.sanitizeContext = sanitizeContext;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
// ============================================
// Winston Configuration
// ============================================
const { combine, timestamp, json, printf, colorize, errors } = winston_1.default.format;
// Custom format for development (human-readable)
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        const metaStr = JSON.stringify(metadata, null, 2);
        msg += `\n${metaStr}`;
    }
    return msg;
});
// Create logger instance
const logger = winston_1.default.createLogger({
    level: config_1.config.nodeEnv === 'production' ? 'info' : 'debug',
    defaultMeta: {
        service: 'password-change-system',
        environment: config_1.config.nodeEnv,
    },
    transports: [
        // Console transport
        new winston_1.default.transports.Console({
            format: config_1.config.nodeEnv === 'production'
                ? combine(timestamp(), json(), errors({ stack: true }))
                : combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), devFormat),
        }),
    ],
    // Exit on error: false ensures logger doesn't crash the app
    exitOnError: false,
});
exports.logger = logger;
// ============================================
// Structured Logging Helpers
// ============================================
function logInfo(message, context) {
    logger.info(message, context || {});
}
function logWarn(message, context) {
    logger.warn(message, context || {});
}
function logError(message, error, context) {
    const logContext = {
        ...context,
        error: error
            ? {
                name: error.name,
                message: error.message,
                stack: config_1.config.nodeEnv !== 'production' ? error.stack : undefined,
            }
            : undefined,
    };
    logger.error(message, logContext);
}
function logDebug(message, context) {
    if (config_1.config.nodeEnv !== 'production') {
        logger.debug(message, context || {});
    }
}
function logSecurity(event, context) {
    logger.info(`[SECURITY] ${event}`, {
        ...context,
        securityEvent: event,
        timestamp: new Date().toISOString(),
    });
}
function logAudit(event, context) {
    logger.info(`[AUDIT] ${event}`, {
        ...context,
        auditEvent: event,
        timestamp: new Date().toISOString(),
    });
}
// ============================================
// Request Context Logger
// ============================================
class RequestLogger {
    context;
    constructor(context) {
        this.context = context;
    }
    info(message, additionalContext) {
        logInfo(message, { ...this.context, ...additionalContext });
    }
    warn(message, additionalContext) {
        logWarn(message, { ...this.context, ...additionalContext });
    }
    error(message, error, additionalContext) {
        logError(message, error, { ...this.context, ...additionalContext });
    }
    debug(message, additionalContext) {
        logDebug(message, { ...this.context, ...additionalContext });
    }
    security(event, additionalContext) {
        logSecurity(event, { ...this.context, ...additionalContext });
    }
    audit(event, additionalContext) {
        logAudit(event, { ...this.context, ...additionalContext });
    }
}
exports.RequestLogger = RequestLogger;
// ============================================
// Sanitization Helpers
// ============================================
/**
 * Sanitize sensitive data from log context
 * Never log passwords, tokens, or PII
 */
function sanitizeContext(context) {
    const sensitiveFields = [
        'password',
        'oldPassword',
        'newPassword',
        'confirmPassword',
        'token',
        'authorization',
        'cookie',
        'session',
        'creditCard',
        'ssn',
        'phone',
    ];
    const sanitized = {};
    for (const [key, value] of Object.entries(context)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
//# sourceMappingURL=logger.js.map