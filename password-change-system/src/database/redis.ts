/**
 * Redis Connection Manager
 * Production-grade Redis client with connection pooling
 */

import Redis from 'ioredis';
import { config } from '../config';
import { logInfo, logError, logDebug, logWarn } from '../utils/logger';

// ============================================
// Redis Client Instance
// ============================================

let redisClient: Redis | null = null;

// ============================================
// Redis Connection Functions
// ============================================

export async function connectRedis(): Promise<Redis> {
  if (redisClient && redisClient.status === 'ready') {
    logDebug('Using existing Redis connection');
    return redisClient;
  }

  try {
    logInfo('Connecting to Redis...');

    redisClient = new Redis(config.redis.url, {
      password: config.redis.password || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logWarn(`Redis retry attempt ${times}, delaying ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    // Set up event handlers
    redisClient.on('connect', () => {
      logInfo('Redis client connected');
    });

    redisClient.on('ready', () => {
      logInfo('Redis client ready');
    });

    redisClient.on('error', (error) => {
      logError('Redis client error', error);
    });

    redisClient.on('close', () => {
      logWarn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logInfo('Redis client reconnecting...');
    });

    // Wait for connection
    await redisClient.ping();
    
    logInfo('Redis connection established and verified');
    return redisClient;
  } catch (error) {
    logError('Failed to connect to Redis', error as Error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
    redisClient = null;
    logInfo('Redis connection closed');
  } catch (error) {
    logError('Error closing Redis connection', error as Error);
    throw error;
  }
}

export function getRedisClient(): Redis {
  if (!redisClient || redisClient.status !== 'ready') {
    throw new Error('Redis not connected');
  }
  return redisClient;
}

export function isRedisConnected(): boolean {
  return redisClient !== null && redisClient.status === 'ready';
}

// ============================================
// Rate Limiting Helpers
// ============================================

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
export async function checkRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<IRateLimitResult> {
  const client = getRedisClient();
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const pipeline = client.pipeline();
  
  // Remove entries outside the window
  pipeline.zremrangebyscore(key, 0, windowStart);
  
  // Count entries within window
  pipeline.zcard(key);
  
  // Add current request
  pipeline.zadd(key, now, `${now}-${Math.random()}`);
  
  // Set expiry on the key
  pipeline.pexpire(key, windowMs);
  
  const results = await pipeline.exec();
  
  if (!results) {
    throw new Error('Redis pipeline failed');
  }
  
  // Get the count result (second command)
  const countResult = results[1];
  const count = (countResult && countResult[1] ? (countResult[1] as number) : 0) + 1; // +1 for the request we just added
  
  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  const resetTime = now + windowMs;
  
  return {
    allowed,
    remaining,
    resetTime,
    totalHits: count,
  };
}

/**
 * Get rate limit info without incrementing
 */
export async function getRateLimitInfo(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<IRateLimitResult> {
  const client = getRedisClient();
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const pipeline = client.pipeline();
  
  // Remove old entries
  pipeline.zremrangebyscore(key, 0, windowStart);
  
  // Count current entries
  pipeline.zcard(key);
  
  // Get oldest entry for reset time calculation
  pipeline.zrange(key, 0, 0, 'WITHSCORES');
  
  const results = await pipeline.exec();
  
  if (!results) {
    throw new Error('Redis pipeline failed');
  }
  
  const countResult = results[1];
  const count = countResult && countResult[1] ? (countResult[1] as number) : 0;
  const oldestResult = results[2];
  const oldestEntries = oldestResult && oldestResult[1] ? (oldestResult[1] as string[]) : [];
  
  let resetTime = now + windowMs;
  if (oldestEntries.length >= 2 && oldestEntries[1]) {
    const oldestTimestamp = parseInt(oldestEntries[1], 10);
    resetTime = oldestTimestamp + windowMs;
  }
  
  return {
    allowed: count < maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetTime,
    totalHits: count,
  };
}

// ============================================
// Idempotency Key Helpers
// ============================================

const IDEMPOTENCY_PREFIX = 'idempotency:';
const IDEMPOTENCY_TTL_SECONDS = 900; // 15 minutes

/**
 * Check and store idempotency key
 * @returns true if key is new (request should proceed), false if duplicate
 */
export async function checkIdempotencyKey(
  userId: string,
  idempotencyKey: string
): Promise<boolean> {
  const client = getRedisClient();
  const key = `${IDEMPOTENCY_PREFIX}${userId}:${idempotencyKey}`;
  
  const result = await client.set(key, '1', 'EX', IDEMPOTENCY_TTL_SECONDS, 'NX');
  
  return result === 'OK'; // 'OK' means key was set (new), null means key existed (duplicate)
}

/**
 * Store response for idempotency key (for replaying same response)
 */
export async function storeIdempotencyResponse(
  userId: string,
  idempotencyKey: string,
  response: unknown
): Promise<void> {
  const client = getRedisClient();
  const key = `${IDEMPOTENCY_PREFIX}${userId}:${idempotencyKey}:response`;
  
  await client.setex(
    key,
    IDEMPOTENCY_TTL_SECONDS,
    JSON.stringify(response)
  );
}

/**
 * Get stored response for idempotency key
 */
export async function getIdempotencyResponse(
  userId: string,
  idempotencyKey: string
): Promise<unknown | null> {
  const client = getRedisClient();
  const key = `${IDEMPOTENCY_PREFIX}${userId}:${idempotencyKey}:response`;
  
  const result = await client.get(key);
  return result ? JSON.parse(result) : null;
}

// ============================================
// In-Memory Fallback for when Redis is disabled
// ============================================

const memoryStore = new Map<string, { count: number; resetTime: number; timestamps: number[] }>();
const idempotencyMemoryStore = new Set<string>();

/**
 * In-memory rate limit check (fallback when Redis disabled)
 */
export async function checkRateLimitMemory(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number; totalHits: number }> {
  const now = Date.now();
  const entry = memoryStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // Create new entry
    memoryStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
      timestamps: [now],
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
      totalHits: 1,
    };
  }
  
  // Increment count
  entry.count++;
  entry.timestamps.push(now);
  
  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
    totalHits: entry.count,
  };
}

/**
 * In-memory idempotency check (fallback when Redis disabled)
 */
export async function checkIdempotencyKeyMemory(
  userId: string,
  idempotencyKey: string
): Promise<boolean> {
  const key = `${userId}:${idempotencyKey}`;
  if (idempotencyMemoryStore.has(key)) {
    return false; // Duplicate
  }
  idempotencyMemoryStore.add(key);
  // Auto-expire after 15 minutes (simple cleanup)
  setTimeout(() => idempotencyMemoryStore.delete(key), 15 * 60 * 1000);
  return true; // New key
}
