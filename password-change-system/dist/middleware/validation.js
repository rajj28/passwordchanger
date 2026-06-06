"use strict";
/**
 * Input Validation Middleware
 * express-validator with strict sanitization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordValidators = void 0;
exports.handleValidationErrors = handleValidationErrors;
exports.normalizeInputMiddleware = normalizeInputMiddleware;
exports.sanitizeInputMiddleware = sanitizeInputMiddleware;
const express_validator_1 = require("express-validator");
const logger_1 = require("../utils/logger");
// ============================================
// Validation Constants
// ============================================
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 64;
const MAX_PASSWORD_BYTES = 72; // bcrypt limitation
// ============================================
// Sanitization Helpers
// ============================================
/**
 * Unicode normalization (NFC)
 * Prevents spoofing attacks with visually similar characters
 */
function normalizeUnicode(input) {
    return input.normalize('NFC');
}
/**
 * Check for null bytes (potential injection)
 */
function containsNullBytes(input) {
    return input.includes('\0');
}
/**
 * Check byte length for bcrypt compatibility
 */
function exceedsByteLimit(input) {
    return Buffer.byteLength(input, 'utf8') > MAX_PASSWORD_BYTES;
}
// ============================================
// Change Password Validators
// ============================================
exports.changePasswordValidators = [
    // Old password validation
    (0, express_validator_1.body)('oldPassword')
        .exists({ checkFalsy: true })
        .withMessage('Current password is required')
        .isString()
        .withMessage('Password must be a string')
        .notEmpty()
        .withMessage('Current password cannot be empty')
        .trim()
        .custom((value) => {
        const normalized = normalizeUnicode(value);
        if (containsNullBytes(normalized)) {
            throw new Error('Password contains invalid characters');
        }
        if (exceedsByteLimit(normalized)) {
            throw new Error(`Password exceeds maximum length (${MAX_PASSWORD_BYTES} bytes)`);
        }
        return true;
    }),
    // New password validation
    (0, express_validator_1.body)('newPassword')
        .exists({ checkFalsy: true })
        .withMessage('New password is required')
        .isString()
        .withMessage('Password must be a string')
        .trim()
        .isLength({ min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH })
        .withMessage(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`)
        .custom((value) => {
        const normalized = normalizeUnicode(value);
        if (containsNullBytes(normalized)) {
            throw new Error('Password contains invalid characters');
        }
        if (exceedsByteLimit(normalized)) {
            throw new Error(`Password exceeds maximum length (${MAX_PASSWORD_BYTES} bytes)`);
        }
        return true;
    })
        .custom((value, { req }) => {
        const oldPassword = req.body.oldPassword;
        if (value === oldPassword) {
            throw new Error('New password must be different from current password');
        }
        return true;
    }),
    // Confirm password validation
    (0, express_validator_1.body)('confirmPassword')
        .exists({ checkFalsy: true })
        .withMessage('Please confirm your new password')
        .isString()
        .withMessage('Confirmation must be a string')
        .trim()
        .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
];
// ============================================
// Validation Error Handler
// ============================================
function handleValidationErrors(req, res, next) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (errors.isEmpty()) {
        next();
        return;
    }
    const authReq = req;
    const requestId = authReq.requestId || 'unknown';
    // Format errors for response
    const formattedErrors = {};
    errors.array().forEach(error => {
        if (error.type === 'field') {
            const field = error.path;
            if (!formattedErrors[field]) {
                formattedErrors[field] = [];
            }
            formattedErrors[field].push(error.msg);
        }
    });
    // Log validation failures for security monitoring
    (0, logger_1.logSecurity)('Input validation failed', {
        requestId,
        userId: authReq.user?.sub,
        errors: Object.keys(formattedErrors),
        ip: req.ip,
    });
    res.status(400).json({
        success: false,
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input provided',
            details: formattedErrors,
        },
        requestId,
        timestamp: new Date().toISOString(),
    });
}
// ============================================
// Input Sanitization Middleware
// ============================================
/**
 * Normalize all string inputs to NFC
 */
function normalizeInputMiddleware(req, _res, next) {
    if (req.body && typeof req.body === 'object') {
        for (const key of Object.keys(req.body)) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = normalizeUnicode(req.body[key]);
            }
        }
    }
    next();
}
/**
 * Strip potentially dangerous characters
 * Note: We don't strip too aggressively to support international passwords
 */
function sanitizeInputMiddleware(req, _res, next) {
    if (req.body && typeof req.body === 'object') {
        for (const key of Object.keys(req.body)) {
            if (typeof req.body[key] === 'string') {
                // Only remove control characters except common whitespace
                // Keep: tab (9), newline (10), carriage return (13)
                req.body[key] = req.body[key].replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
            }
        }
    }
    next();
}
//# sourceMappingURL=validation.js.map