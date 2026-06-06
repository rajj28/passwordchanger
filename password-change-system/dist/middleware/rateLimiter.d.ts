/**
 * Rate Limiting Middleware
 * Dual-key rate limiting: IP-based + User-based
 */
import { Request, Response, NextFunction } from 'express';
/**
 * IP-based rate limiter
 * Limits: 5 attempts per 15 minutes per IP
 */
export declare function ipRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * User-based rate limiter
 * Limits: 3 attempts per hour per user
 */
export declare function userRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Combined rate limiter (IP + User)
 * Apply both rate limits
 */
export declare function combinedRateLimiter(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Get current rate limit status for a user
 * For displaying remaining attempts to user
 */
export declare function getUserRateLimitStatus(userId: string): Promise<{
    remaining: number;
    resetTime: number;
}>;
//# sourceMappingURL=rateLimiter.d.ts.map