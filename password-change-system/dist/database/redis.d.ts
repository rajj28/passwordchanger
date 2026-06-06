/**
 * Redis Connection Manager
 * Production-grade Redis client with connection pooling
 */
import Redis from 'ioredis';
export declare function connectRedis(): Promise<Redis>;
export declare function disconnectRedis(): Promise<void>;
export declare function getRedisClient(): Redis;
export declare function isRedisConnected(): boolean;
export interface IRateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
}
/**
 * Check rate limit using sliding window algorithm
 * @param key - Unique identifier (IP or userId)
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests allowed in window
 */
export declare function checkRateLimit(key: string, windowMs: number, maxRequests: number): Promise<IRateLimitResult>;
/**
 * Get rate limit info without incrementing
 */
export declare function getRateLimitInfo(key: string, windowMs: number, maxRequests: number): Promise<IRateLimitResult>;
/**
 * Check and store idempotency key
 * @returns true if key is new (request should proceed), false if duplicate
 */
export declare function checkIdempotencyKey(userId: string, idempotencyKey: string): Promise<boolean>;
/**
 * Store response for idempotency key (for replaying same response)
 */
export declare function storeIdempotencyResponse(userId: string, idempotencyKey: string, response: unknown): Promise<void>;
/**
 * Get stored response for idempotency key
 */
export declare function getIdempotencyResponse(userId: string, idempotencyKey: string): Promise<unknown | null>;
/**
 * In-memory rate limit check (fallback when Redis disabled)
 */
export declare function checkRateLimitMemory(key: string, windowMs: number, maxRequests: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
}>;
/**
 * In-memory idempotency check (fallback when Redis disabled)
 */
export declare function checkIdempotencyKeyMemory(userId: string, idempotencyKey: string): Promise<boolean>;
//# sourceMappingURL=redis.d.ts.map