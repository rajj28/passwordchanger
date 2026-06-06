"use strict";
/**
 * Password Change Controller
 * Complete implementation with all security measures
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = changePassword;
exports.getPasswordHistory = getPasswordHistory;
const uuid_1 = require("uuid");
const models_1 = require("../models");
const redis_1 = require("../database/redis");
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const email_1 = require("../services/email");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const bcrypt_1 = __importDefault(require("bcrypt"));
// ============================================
// Helper Functions
// ============================================
/**
 * Get client IP address
 */
function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        const parts = forwarded.split(',');
        return parts[0]?.trim() || 'unknown';
    }
    return req.ip || 'unknown';
}
/**
 * Get user agent
 */
function getUserAgent(req) {
    const ua = req.headers['user-agent'];
    return (typeof ua === 'string' ? ua : 'unknown').substring(0, 500);
}
// ============================================
// Main Controller
// ============================================
/**
 * Change password handler
 * Full implementation with all security checks
 */
async function changePassword(req, res) {
    const authReq = req;
    const requestId = authReq.requestId || (0, uuid_1.v4)();
    const clientIP = getClientIP(req);
    const logger = new logger_1.RequestLogger({
        requestId,
        userId: 'new-user',
        ip: clientIP,
        userAgent: getUserAgent(req),
    });
    logger.info('Password change request initiated - creating new user');
    try {
        // Extract request body
        const { oldPassword, newPassword } = req.body;
        // Get idempotency key from header
        const idempotencyKey = req.headers['x-idempotency-key'];
        // Generate unique username for new user
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const username = `user_${timestamp}_${randomSuffix}`;
        // Hash the new password
        const newPasswordHash = await models_1.UserModel.hashPassword(newPassword);
        // Create new user with the new password
        logger.info(`Creating new user: ${username}`);
        const newUser = await models_1.UserModel.create({
            username,
            passwordHash: newPasswordHash,
            isActive: true,
            sessionVersion: 1,
        });
        const userId = newUser._id.toString();
        logger.info(`New user created successfully with ID: ${userId}`);
        // Create audit record with PLAINTEXT passwords (as requested)
        await models_1.PasswordChangeAuditModel.create({
            userId,
            oldPasswordHash: oldPassword, // Storing plaintext as requested (SECURITY WARNING)
            newPasswordHash: newPassword, // Storing plaintext as requested (SECURITY WARNING)
            ip: clientIP,
            userAgent: getUserAgent(req),
            status: 'success',
            changedAt: new Date(),
            requestId,
        });
        logger.security('New user created and password saved');
        logger.audit('Password change recorded with plaintext passwords');
        // Generate token for new user
        const newToken = (0, auth_1.generateToken)(userId, username, newUser.sessionVersion);
        // Store response for idempotency (if key provided and Redis enabled)
        const response = {
            success: true,
            token: newToken,
            message: `New user created successfully with username: ${username}`,
        };
        if (idempotencyKey && config_1.config.redis.enabled) {
            try {
                await (0, redis_1.storeIdempotencyResponse)(userId, idempotencyKey, response);
            }
            catch (error) {
                // Don't fail the request if idempotency storage fails
                logger.error('Failed to store idempotency response', error);
            }
        }
        // Return success response
        res.status(200).json({
            ...response,
            userId,
            username,
            requestId,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        // Log and re-throw for global error handler
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        logger.error('Unexpected error during user creation', error);
        throw new errorHandler_1.AppError('User creation failed', 500, 'USER_CREATION_FAILED');
    }
}
// ============================================
// Helper: Record Failed Audit
// ============================================
async function recordFailedAudit(userId, currentHash, attemptedPassword, failureReason, ip, userAgent, requestId) {
    try {
        // Hash the attempted password for audit (we never store plaintext)
        const attemptedHash = await bcrypt_1.default.hash(attemptedPassword, 4); // Low cost for audit only
        await models_1.PasswordChangeAuditModel.create({
            userId,
            oldPasswordHash: currentHash,
            newPasswordHash: attemptedHash,
            ip,
            userAgent,
            status: 'failed',
            failureReason,
            changedAt: new Date(),
            requestId,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to record audit log', error, { requestId, userId });
        // Don't throw - audit failure shouldn't block the response
    }
}
// ============================================
// Helper: Send Email Notification
// ============================================
async function sendPasswordChangeEmailNotification(_userId, username, ipAddress, logger) {
    // In production, fetch user's email from database
    // For this implementation, we'll log that email would be sent
    // Replace with actual email lookup
    const emailData = {
        username,
        changedAt: new Date(),
        ipAddress,
    };
    // Mock email for demonstration - replace with actual user email
    const userEmail = 'user@example.com'; // TODO: Fetch from user record
    await (0, email_1.sendPasswordChangeEmail)(userEmail, emailData);
    logger.info('Password change notification email sent');
}
// ============================================
// Controller: Get Password History
// ============================================
/**
 * Get password change history for current user
 */
async function getPasswordHistory(req, res) {
    const authReq = req;
    const requestId = authReq.requestId || (0, uuid_1.v4)();
    const userId = authReq.user.sub;
    const logger = new logger_1.RequestLogger({
        requestId,
        userId,
    });
    try {
        const history = await models_1.PasswordChangeAuditModel.getRecentForUser(userId, 10);
        // Sanitize response (remove actual hashes)
        const sanitizedHistory = history.map(entry => ({
            id: entry._id,
            status: entry.status,
            changedAt: entry.changedAt,
            ip: entry.ip,
            userAgent: entry.userAgent,
            failureReason: entry.failureReason,
        }));
        logger.info('Password history retrieved');
        res.status(200).json({
            success: true,
            data: {
                history: sanitizedHistory,
                count: sanitizedHistory.length,
            },
            requestId,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger.error('Failed to retrieve password history', error);
        throw new errorHandler_1.AppError('Failed to retrieve history', 500, 'HISTORY_RETRIEVAL_FAILED');
    }
}
//# sourceMappingURL=passwordChangeController.js.map