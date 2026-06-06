/**
 * Rate Limiting Middleware
 * Dual-key rate limiting: IP-based + User-based
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { checkRateLimit, getRateLimitInfo, checkRateLimitMemory } from '../database/redis';
import { IAuthenticatedRequest } from '../types';
import { logSecurity } from '../utils/logger';

// ============================================
// Rate Limiting Functions
// ============================================

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
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
function formatRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number
): Record<string, string> {
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
export async function ipRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authReq = req as IAuthenticatedRequest;
  const requestId = authReq.requestId || 'unknown';
  
  const ip = getClientIP(req);
  const key = `${config.rateLimit.ip.keyPrefix}:${ip}`;
  
  try {
    const result = config.redis.enabled
      ? await checkRateLimit(key, config.rateLimit.ip.windowMs, config.rateLimit.ip.maxRequests)
      : await checkRateLimitMemory(key, config.rateLimit.ip.windowMs, config.rateLimit.ip.maxRequests);
    
    // Set rate limit headers
    const headers = formatRateLimitHeaders(
      config.rateLimit.ip.maxRequests,
      result.remaining,
      result.resetTime
    );
    
    Object.entries(headers).forEach(([header, value]) => {
      res.setHeader(header, value);
    });
    
    if (!result.allowed) {
      logSecurity('IP rate limit exceeded', {
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
  } catch (error) {
    // Fail open or closed? For security, fail open (allow request) but log error
    // In high-security environments, you might want to fail closed
    logSecurity('Rate limiter error (allowing request)', {
      requestId,
      ip,
      error: (error as Error).message,
    });
    
    next();
  }
}

/**
 * User-based rate limiter
 * Limits: 3 attempts per hour per user
 */
export async function userRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authReq = req as IAuthenticatedRequest;
  const requestId = authReq.requestId || 'unknown';
  
  // Skip if no user (unauthenticated requests shouldn't hit user rate limit)
  if (!authReq.user) {
    next();
    return;
  }
  
  const userId = authReq.user.sub;
  const key = `${config.rateLimit.user.keyPrefix}:${userId}`;
  
  try {
    const result = config.redis.enabled
      ? await checkRateLimit(key, config.rateLimit.user.windowMs, config.rateLimit.user.maxRequests)
      : await checkRateLimitMemory(key, config.rateLimit.user.windowMs, config.rateLimit.user.maxRequests);
    
    // Set rate limit headers (user-specific)
    const headers = formatRateLimitHeaders(
      config.rateLimit.user.maxRequests,
      result.remaining,
      result.resetTime
    );
    
    // Prefix headers to distinguish from IP rate limits
    Object.entries(headers).forEach(([header, value]) => {
      res.setHeader(`${header}-User`, value);
    });
    
    if (!result.allowed) {
      logSecurity('User rate limit exceeded', {
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
  } catch (error) {
    logSecurity('User rate limiter error (allowing request)', {
      requestId,
      userId,
      error: (error as Error).message,
    });
    
    next();
  }
}

/**
 * Combined rate limiter (IP + User)
 * Apply both rate limits
 */
export async function combinedRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Apply IP rate limit first
  await ipRateLimiter(req, res, (err?: unknown) => {
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
export async function getUserRateLimitStatus(
  userId: string
): Promise<{ remaining: number; resetTime: number }> {
  const key = `${config.rateLimit.user.keyPrefix}:${userId}`;
  
  try {
    const result = await getRateLimitInfo(
      key,
      config.rateLimit.user.windowMs,
      config.rateLimit.user.maxRequests
    );
    
    return {
      remaining: result.remaining,
      resetTime: result.resetTime,
    };
  } catch {
    // Return conservative values on error
    return {
      remaining: 0,
      resetTime: Date.now() + config.rateLimit.user.windowMs,
    };
  }
}
