/**
 * Authentication Routes
 * Password change endpoint with full middleware stack
 */

import { Router } from 'express';
import { changePassword, getPasswordHistory } from '../controllers/passwordChangeController';
import {
  authMiddleware,
  combinedRateLimiter,
  changePasswordValidators,
  handleValidationErrors,
  normalizeInputMiddleware,
  sanitizeInputMiddleware,
  asyncHandler,
} from '../middleware';

const router = Router();

// ============================================
// POST /api/v1/auth/change-password
// ============================================

router.post(
  '/change-password',
  // 1. Normalize and sanitize input
  normalizeInputMiddleware,
  sanitizeInputMiddleware,
  
  // 2. Rate limiting (IP + User based)
  asyncHandler(combinedRateLimiter),
  
  // 3. Input validation
  changePasswordValidators,
  handleValidationErrors,
  
  // 5. Password change handler
  asyncHandler(changePassword)
);

// ============================================
// GET /api/v1/auth/password-history
// ============================================

router.get(
  '/password-history',
  // Rate limiting (IP + User based)
  asyncHandler(combinedRateLimiter),
  
  // Authentication
  asyncHandler(authMiddleware),
  
  // Get history
  asyncHandler(getPasswordHistory)
);

export default router;
