"use strict";
/**
 * Authentication Middleware
 * JWT validation with session version checking
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.authMiddleware = authMiddleware;
exports.optionalAuthMiddleware = optionalAuthMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
// ============================================
// JWT Verification
// ============================================
/**
 * Extract JWT from Authorization header
 */
function extractToken(authHeader) {
    if (!authHeader) {
        return null;
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    return parts[1] || null;
}
/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return null;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return null;
        }
        return null;
    }
}
/**
 * Generate new JWT token
 */
function generateToken(userId, username, sessionVersion) {
    const payload = {
        sub: userId,
        username,
        sv: sessionVersion,
    };
    const token = jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, {
        expiresIn: config_1.config.jwt.expiresIn,
    });
    return token;
}
// ============================================
// Authentication Middleware
// ============================================
/**
 * Authentication middleware
 * Validates JWT and checks session version
 */
async function authMiddleware(req, res, next) {
    const authReq = req;
    const requestId = authReq.requestId || 'unknown';
    try {
        // Extract token
        const authHeader = req.headers.authorization;
        const token = extractToken(authHeader);
        if (!token) {
            (0, logger_1.logSecurity)('Authentication failed: No token provided', {
                requestId,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            });
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
                requestId,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        // Verify token
        const decoded = verifyToken(token);
        if (!decoded) {
            (0, logger_1.logSecurity)('Authentication failed: Invalid or expired token', {
                requestId,
                ip: req.ip,
            });
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid or expired token',
                },
                requestId,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        // Fetch user and verify session version
        const user = await models_1.UserModel.findById(decoded.sub).select('+passwordHash');
        if (!user) {
            (0, logger_1.logSecurity)('Authentication failed: User not found', {
                requestId,
                userId: decoded.sub,
            });
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not found',
                },
                requestId,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        if (!user.isActive) {
            (0, logger_1.logSecurity)('Authentication failed: Account deactivated', {
                requestId,
                userId: decoded.sub,
            });
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Account deactivated',
                },
                requestId,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        // Check session version (token invalidation mechanism)
        if (decoded.sv !== user.sessionVersion) {
            (0, logger_1.logSecurity)('Authentication failed: Session version mismatch (token invalidated)', {
                requestId,
                userId: decoded.sub,
                tokenSessionVersion: decoded.sv,
                currentSessionVersion: user.sessionVersion,
            });
            res.status(401).json({
                success: false,
                error: {
                    code: 'SESSION_INVALIDATED',
                    message: 'Session invalidated due to password change',
                },
                requestId,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        // Attach user to request
        authReq.user = decoded;
        (0, logger_1.logSecurity)('Authentication successful', {
            requestId,
            userId: decoded.sub,
            username: decoded.username,
        });
        next();
    }
    catch (error) {
        (0, logger_1.logError)('Authentication error', error, { requestId });
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Authentication service error',
            },
            requestId,
            timestamp: new Date().toISOString(),
        });
    }
}
/**
 * Optional authentication middleware
 * Attaches user if token valid, but doesn't require it
 */
async function optionalAuthMiddleware(req, _res, next) {
    const authReq = req;
    try {
        const authHeader = req.headers.authorization;
        const token = extractToken(authHeader);
        if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
                // Verify user exists and is active
                const user = await models_1.UserModel.findById(decoded.sub);
                if (user && user.isActive && decoded.sv === user.sessionVersion) {
                    authReq.user = decoded;
                }
            }
        }
        next();
    }
    catch {
        // Silently continue without auth
        next();
    }
}
//# sourceMappingURL=auth.js.map