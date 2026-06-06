"use strict";
/**
 * Rate Limiting Middleware
 * Dual-key rate limiting: IP-based + User-based
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ipRateLimiter = ipRateLimiter;
exports.userRateLimiter = userRateLimiter;
exports.combinedRateLimiter = combinedRateLimiter;
exports.getUserRateLimitStatus = getUserRateLimitStatus;
const config_1 = require("../config");
const redis_1 = require("../database/redis");
const logger_1 = require("../utils/logger");
// ============================================
// Rate Limiting Functions
// ============================================
/**
 * Get client IP address
 */
function getClientIP(req) {
    // Trust proxy setting should be enabled for production
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        const parts = forwarded.split(',');
        return parts[0]?.trim() || 'unknown';
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
/**
 * Format rate limit headers
 */
function formatRateLimitHeaders(limit, remaining, resetTime) {
    return {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    };
}
/**
 * IP-based rate limiter
 * Limits: 5 attempts per 15 minutes per IP
 */
async function ipRateLimiter(req, res, next) {
    const authReq = req;
    const requestId = authReq.requestId || 'unknown';
    const ip = getClientIP(req);
    const key = `${config_1.config.rateLimit.ip.keyPrefix}:${ip}`;
    try {
        const result = config_1.config.redis.enabled
            ? await (0, redis_1.checkRateLimit)(key, config_1.config.rateLimit.ip.windowMs, config_1.config.rateLimit.ip.maxRequests)
            : await (0, redis_1.checkRateLimitMemory)(key, config_1.config.rateLimit.ip.windowMs, config_1.config.rateLimit.ip.maxRequests);
        // Set rate limit headers
        const headers = formatRateLimitHeaders(config_1.config.rateLimit.ip.maxRequests, result.remaining, result.resetTime);
        Object.entries(headers).forEach(([header, value]) => {
            res.setHeader(header, value);
        });
        if (!result.allowed) {
            (0, logger_1.logSecurity)('IP rate limit exceeded', {
                requestId,
                ip,
                totalHits: result.totalHits,
            });
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many requests from this IP. Please try again later.',
                },
                requestId,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        next();
    }
    catch (error) {
        // Fail open or closed? For security, fail open (allow request) but log error
        // In high-security environments, you might want to fail closed
        (0, logger_1.logSecurity)('Rate limiter error (allowing request)', {
            requestId,
            ip,
            error: error.message,
        });
        next();
    }
}
/**
 * User-based rate limiter
 * Limits: 3 attempts per hour per user
 */
async function userRateLimiter(req, res, next) {
    const authReq = req;
    const requestId = authReq.requestId || 'unknown';
    // Skip if no user (unauthenticated requests shouldn't hit user rate limit)
    if (!authReq.user) {
        next();
        return;
    }
    const userId = authReq.user.sub;
    const key = `${config_1.config.rateLimit.user.keyPrefix}:${userId}`;
    try {
        const result = config_1.config.redis.enabled
            ? await (0, redis_1.checkRateLimit)(key, config_1.config.rateLimit.user.windowMs, config_1.config.rateLimit.user.maxRequests)
            : await (0, redis_1.checkRateLimitMemory)(key, config_1.config.rateLimit.user.windowMs, config_1.config.rateLimit.user.maxRequests);
        // Set rate limit headers (user-specific)
        const headers = formatRateLimitHeaders(config_1.config.rateLimit.user.maxRequests, result.remaining, result.resetTime);
        // Prefix headers to distinguish from IP rate limits
        Object.entries(headers).forEach(([header, value]) => {
            res.setHeader(`${header}-User`, value);
        });
        if (!result.allowed) {
            (0, logger_1.logSecurity)('User rate limit exceeded', {
                requestId,
                userId,
                totalHits: result.totalHits,
            });
            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: 'Too many password change attempts. Please try again in an hour.',
                },
                requestId,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        next();
    }
    catch (error) {
        (0, logger_1.logSecurity)('User rate limiter error (allowing request)', {
            requestId,
            userId,
            error: error.message,
        });
        next();
    }
}
/**
 * Combined rate limiter (IP + User)
 * Apply both rate limits
 */
async function combinedRateLimiter(req, res, next) {
    // Apply IP rate limit first
    await ipRateLimiter(req, res, (err) => {
        if (err) {
            next(err);
            return;
        }
        // Then apply user rate limit
        userRateLimiter(req, res, next);
    });
}
/**
 * Get current rate limit status for a user
 * For displaying remaining attempts to user
 */
async function getUserRateLimitStatus(userId) {
    const key = `${config_1.config.rateLimit.user.keyPrefix}:${userId}`;
    try {
        const result = await (0, redis_1.getRateLimitInfo)(key, config_1.config.rateLimit.user.windowMs, config_1.config.rateLimit.user.maxRequests);
        return {
            remaining: result.remaining,
            resetTime: result.resetTime,
        };
    }
    catch {
        // Return conservative values on error
        return {
            remaining: 0,
            resetTime: Date.now() + config_1.config.rateLimit.user.windowMs,
        };
    }
}
//# sourceMappingURL=rateLimiter.js.map