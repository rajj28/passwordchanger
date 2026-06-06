"use strict";
/**
 * Redis Connection Manager
 * Production-grade Redis client with connection pooling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.getRedisClient = getRedisClient;
exports.isRedisConnected = isRedisConnected;
exports.checkRateLimit = checkRateLimit;
exports.getRateLimitInfo = getRateLimitInfo;
exports.checkIdempotencyKey = checkIdempotencyKey;
exports.storeIdempotencyResponse = storeIdempotencyResponse;
exports.getIdempotencyResponse = getIdempotencyResponse;
exports.checkRateLimitMemory = checkRateLimitMemory;
exports.checkIdempotencyKeyMemory = checkIdempotencyKeyMemory;
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
// ============================================
// Redis Client Instance
// ============================================
let redisClient = null;
// ============================================
// Redis Connection Functions
// ============================================
async function connectRedis() {
    if (redisClient && redisClient.status === 'ready') {
        (0, logger_1.logDebug)('Using existing Redis connection');
        return redisClient;
    }
    try {
        (0, logger_1.logInfo)('Connecting to Redis...');
        redisClient = new ioredis_1.default(config_1.config.redis.url, {
            password: config_1.config.redis.password || undefined,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                (0, logger_1.logWarn)(`Redis retry attempt ${times}, delaying ${delay}ms`);
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false,
        });
        // Set up event handlers
        redisClient.on('connect', () => {
            (0, logger_1.logInfo)('Redis client connected');
        });
        redisClient.on('ready', () => {
            (0, logger_1.logInfo)('Redis client ready');
        });
        redisClient.on('error', (error) => {
            (0, logger_1.logError)('Redis client error', error);
        });
        redisClient.on('close', () => {
            (0, logger_1.logWarn)('Redis connection closed');
        });
        redisClient.on('reconnecting', () => {
            (0, logger_1.logInfo)('Redis client reconnecting...');
        });
        // Wait for connection
        await redisClient.ping();
        (0, logger_1.logInfo)('Redis connection established and verified');
        return redisClient;
    }
    catch (error) {
        (0, logger_1.logError)('Failed to connect to Redis', error);
        throw error;
    }
}
async function disconnectRedis() {
    if (!redisClient) {
        return;
    }
    try {
        await redisClient.quit();
        redisClient = null;
        (0, logger_1.logInfo)('Redis connection closed');
    }
    catch (error) {
        (0, logger_1.logError)('Error closing Redis connection', error);
        throw error;
    }
}
function getRedisClient() {
    if (!redisClient || redisClient.status !== 'ready') {
        throw new Error('Redis not connected');
    }
    return redisClient;
}
function isRedisConnected() {
    return redisClient !== null && redisClient.status === 'ready';
}
/**
 * Check rate limit using sliding window algorithm
 * @param key - Unique identifier (IP or userId)
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Maximum requests allowed in window
 */
async function checkRateLimit(key, windowMs, maxRequests) {
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
    const count = (countResult && countResult[1] ? countResult[1] : 0) + 1; // +1 for the request we just added
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
async function getRateLimitInfo(key, windowMs, maxRequests) {
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
    const count = countResult && countResult[1] ? countResult[1] : 0;
    const oldestResult = results[2];
    const oldestEntries = oldestResult && oldestResult[1] ? oldestResult[1] : [];
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
async function checkIdempotencyKey(userId, idempotencyKey) {
    const client = getRedisClient();
    const key = `${IDEMPOTENCY_PREFIX}${userId}:${idempotencyKey}`;
    const result = await client.set(key, '1', 'EX', IDEMPOTENCY_TTL_SECONDS, 'NX');
    return result === 'OK'; // 'OK' means key was set (new), null means key existed (duplicate)
}
/**
 * Store response for idempotency key (for replaying same response)
 */
async function storeIdempotencyResponse(userId, idempotencyKey, response) {
    const client = getRedisClient();
    const key = `${IDEMPOTENCY_PREFIX}${userId}:${idempotencyKey}:response`;
    await client.setex(key, IDEMPOTENCY_TTL_SECONDS, JSON.stringify(response));
}
/**
 * Get stored response for idempotency key
 */
async function getIdempotencyResponse(userId, idempotencyKey) {
    const client = getRedisClient();
    const key = `${IDEMPOTENCY_PREFIX}${userId}:${idempotencyKey}:response`;
    const result = await client.get(key);
    return result ? JSON.parse(result) : null;
}
// ============================================
// In-Memory Fallback for when Redis is disabled
// ============================================
const memoryStore = new Map();
const idempotencyMemoryStore = new Set();
/**
 * In-memory rate limit check (fallback when Redis disabled)
 */
async function checkRateLimitMemory(key, windowMs, maxRequests) {
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
async function checkIdempotencyKeyMemory(userId, idempotencyKey) {
    const key = `${userId}:${idempotencyKey}`;
    if (idempotencyMemoryStore.has(key)) {
        return false; // Duplicate
    }
    idempotencyMemoryStore.add(key);
    // Auto-expire after 15 minutes (simple cleanup)
    setTimeout(() => idempotencyMemoryStore.delete(key), 15 * 60 * 1000);
    return true; // New key
}
//# sourceMappingURL=redis.js.map