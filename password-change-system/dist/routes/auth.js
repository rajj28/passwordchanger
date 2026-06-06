"use strict";
/**
 * Authentication Routes
 * Password change endpoint with full middleware stack
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passwordChangeController_1 = require("../controllers/passwordChangeController");
const middleware_1 = require("../middleware");
const router = (0, express_1.Router)();
// ============================================
// POST /api/v1/auth/change-password
// ============================================
router.post('/change-password', 
// 1. Normalize and sanitize input
middleware_1.normalizeInputMiddleware, middleware_1.sanitizeInputMiddleware, 
// 2. Rate limiting (IP + User based)
(0, middleware_1.asyncHandler)(middleware_1.combinedRateLimiter), 
// 3. Input validation
middleware_1.changePasswordValidators, middleware_1.handleValidationErrors, 
// 5. Password change handler
(0, middleware_1.asyncHandler)(passwordChangeController_1.changePassword));
// ============================================
// GET /api/v1/auth/password-history
// ============================================
router.get('/password-history', 
// Rate limiting (IP + User based)
(0, middleware_1.asyncHandler)(middleware_1.combinedRateLimiter), 
// Authentication
(0, middleware_1.asyncHandler)(middleware_1.authMiddleware), 
// Get history
(0, middleware_1.asyncHandler)(passwordChangeController_1.getPasswordHistory));
exports.default = router;
//# sourceMappingURL=auth.js.map