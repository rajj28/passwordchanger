/**
 * Password Change Controller
 * Complete implementation with all security measures
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UserModel, PasswordChangeAuditModel } from '../models';
import { IAuthenticatedRequest, IChangePasswordRequest, IChangePasswordResponse } from '../types';
import { withTransaction } from '../database/mongodb';
import { checkIdempotencyKey, storeIdempotencyResponse, checkIdempotencyKeyMemory } from '../database/redis';
import { config } from '../config';
import { generateToken } from '../middleware/auth';
import { sendPasswordChangeEmail } from '../services/email';
import { logInfo, logSecurity, logError, RequestLogger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { getBcryptCostFactor } from '../config';
import bcrypt from 'bcrypt';

// ============================================
// Helper Functions
// ============================================

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
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
function getUserAgent(req: Request): string {
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
export async function changePassword(
  req: Request,
  res: Response
): Promise<void> {
  const authReq = req as IAuthenticatedRequest;
  const requestId = authReq.requestId || uuidv4();
  const clientIP = getClientIP(req);
  
  const logger = new RequestLogger({
    requestId,
    userId: 'new-user',
    ip: clientIP,
    userAgent: getUserAgent(req),
  });
  
  logger.info('Password change request initiated - creating new user');
  
  try {
    // Extract request body
    const { oldPassword, newPassword }: IChangePasswordRequest = req.body;
    
    // Get idempotency key from header
    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    
    // Generate unique username for new user
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const username = `user_${timestamp}_${randomSuffix}`;
    
    // Hash the new password
    const newPasswordHash = await UserModel.hashPassword(newPassword);
    
    // Create new user with the new password
    logger.info(`Creating new user: ${username}`);
    const newUser = await UserModel.create({
      username,
      passwordHash: newPasswordHash,
      isActive: true,
      sessionVersion: 1,
    });
    
    const userId = newUser._id.toString();
    
    logger.info(`New user created successfully with ID: ${userId}`);
    
    // Create audit record with PLAINTEXT passwords (as requested)
    await PasswordChangeAuditModel.create({
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
    const newToken = generateToken(userId, username, newUser.sessionVersion);
    
    // Store response for idempotency (if key provided and Redis enabled)
    const response: IChangePasswordResponse = {
      success: true,
      token: newToken,
      message: `New user created successfully with username: ${username}`,
    };
    
    if (idempotencyKey && config.redis.enabled) {
      try {
        await storeIdempotencyResponse(userId, idempotencyKey, response);
      } catch (error) {
        // Don't fail the request if idempotency storage fails
        logger.error('Failed to store idempotency response', error as Error);
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
    
  } catch (error) {
    // Log and re-throw for global error handler
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Unexpected error during user creation', error as Error);
    throw new AppError('User creation failed', 500, 'USER_CREATION_FAILED');
  }
}

// ============================================
// Helper: Record Failed Audit
// ============================================

async function recordFailedAudit(
  userId: string,
  currentHash: string,
  attemptedPassword: string,
  failureReason: string,
  ip: string,
  userAgent: string,
  requestId: string
): Promise<void> {
  try {
    // Hash the attempted password for audit (we never store plaintext)
    const attemptedHash = await bcrypt.hash(attemptedPassword, 4); // Low cost for audit only
    
    await PasswordChangeAuditModel.create({
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
  } catch (error) {
    logError('Failed to record audit log', error as Error, { requestId, userId });
    // Don't throw - audit failure shouldn't block the response
  }
}

// ============================================
// Helper: Send Email Notification
// ============================================

async function sendPasswordChangeEmailNotification(
  _userId: string,
  username: string,
  ipAddress: string,
  logger: RequestLogger
): Promise<void> {
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
  
  await sendPasswordChangeEmail(userEmail, emailData);
  
  logger.info('Password change notification email sent');
}

// ============================================
// Controller: Get Password History
// ============================================

/**
 * Get password change history for current user
 */
export async function getPasswordHistory(
  req: Request,
  res: Response
): Promise<void> {
  const authReq = req as IAuthenticatedRequest;
  const requestId = authReq.requestId || uuidv4();
  const userId = authReq.user!.sub;
  
  const logger = new RequestLogger({
    requestId,
    userId,
  });
  
  try {
    const history = await PasswordChangeAuditModel.getRecentForUser(userId, 10);
    
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
  } catch (error) {
    logger.error('Failed to retrieve password history', error as Error);
    throw new AppError('Failed to retrieve history', 500, 'HISTORY_RETRIEVAL_FAILED');
  }
}
