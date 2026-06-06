"use strict";
/**
 * Application Configuration
 * Centralized configuration with validation and defaults
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.calibrateBcryptCost = calibrateBcryptCost;
exports.getBcryptCostFactor = getBcryptCostFactor;
exports.generateBcryptBenchmark = generateBcryptBenchmark;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
// ============================================
// Configuration Loader with Validation
// ============================================
function loadConfig() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    // Required environment variables
    const required = [
        'JWT_SECRET',
        'MONGODB_URI',
    ];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    // JWT Secret validation (must be at least 32 bytes for HS256)
    const jwtSecret = process.env.JWT_SECRET;
    if (Buffer.from(jwtSecret).length < 32) {
        throw new Error('JWT_SECRET must be at least 32 bytes (256 bits) for HS256 security');
    }
    // Parse CORS origins
    const corsOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
        : ['http://localhost:5173'];
    // Validate bcrypt cost factor
    const bcryptCost = parseInt(process.env.BCRYPT_COST || '12', 10);
    if (isNaN(bcryptCost) || bcryptCost < 10 || bcryptCost > 20) {
        throw new Error('BCRYPT_COST must be between 10 and 20');
    }
    return {
        nodeEnv,
        port: parseInt(process.env.PORT || '3000', 10),
        apiVersion: process.env.API_VERSION || 'v1',
        mongodb: {
            uri: process.env.MONGODB_URI,
            dbName: process.env.MONGODB_DB_NAME || 'password_change_db',
        },
        redis: {
            url: process.env.REDIS_URL || '',
            password: process.env.REDIS_PASSWORD,
            enabled: !!process.env.REDIS_URL,
        },
        jwt: {
            secret: jwtSecret,
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        },
        bcrypt: {
            costFactor: bcryptCost,
        },
        rateLimit: {
            ip: {
                windowMs: parseInt(process.env.RATE_LIMIT_IP_WINDOW_MS || '900000', 10), // 15 minutes
                maxRequests: parseInt(process.env.RATE_LIMIT_IP_MAX || '5', 10),
                keyPrefix: 'ratelimit:ip',
            },
            user: {
                windowMs: parseInt(process.env.RATE_LIMIT_USER_WINDOW_MS || '3600000', 10), // 1 hour
                maxRequests: parseInt(process.env.RATE_LIMIT_USER_MAX || '3', 10),
                keyPrefix: 'ratelimit:user',
            },
        },
        email: {
            host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || 'apikey',
                pass: process.env.SMTP_PASS || '',
            },
            from: process.env.EMAIL_FROM || 'noreply@example.com',
            fromName: process.env.EMAIL_FROM_NAME || 'Your App',
        },
        corsOrigins,
        trustProxy: process.env.TRUST_PROXY === 'true' || isProduction,
    };
}
exports.config = loadConfig();
// ============================================
// Bcrypt Calibration
// ============================================
const bcrypt_1 = __importDefault(require("bcrypt"));
let calibratedCostFactor = null;
/**
 * Calibrate bcrypt cost factor to achieve ~250ms hash time
 * Run once at startup and cache result
 */
async function calibrateBcryptCost() {
    if (calibratedCostFactor !== null) {
        return calibratedCostFactor;
    }
    const targetTimeMs = 250;
    const testPassword = 'calibration_test_password_123';
    console.log('Calibrating bcrypt cost factor...');
    // Start from configured cost and increase until we hit target
    let cost = exports.config.bcrypt.costFactor;
    const maxCost = 16;
    while (cost <= maxCost) {
        const startTime = process.hrtime.bigint();
        await bcrypt_1.default.hash(testPassword, cost);
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1_000_000;
        console.log(`  Cost ${cost}: ${durationMs.toFixed(2)}ms`);
        if (durationMs >= targetTimeMs) {
            calibratedCostFactor = cost;
            console.log(`Selected bcrypt cost factor: ${cost} (~${durationMs.toFixed(2)}ms)`);
            return cost;
        }
        cost++;
    }
    // If we hit max cost without reaching target, use max
    calibratedCostFactor = maxCost;
    console.log(`Using maximum bcrypt cost factor: ${maxCost}`);
    return maxCost;
}
/**
 * Get current bcrypt cost factor (calibrated or fallback)
 */
function getBcryptCostFactor() {
    return calibratedCostFactor || exports.config.bcrypt.costFactor;
}
// ============================================
// Bcrypt Benchmark Table
// ============================================
async function generateBcryptBenchmark() {
    const testPassword = 'benchmark_test_password_123';
    const results = [];
    for (let cost = 10; cost <= 16; cost++) {
        const iterations = 3;
        let totalTime = 0;
        for (let i = 0; i < iterations; i++) {
            const startTime = process.hrtime.bigint();
            await bcrypt_1.default.hash(testPassword, cost);
            const endTime = process.hrtime.bigint();
            totalTime += Number(endTime - startTime);
        }
        const avgTimeMs = (totalTime / iterations) / 1_000_000;
        results.push({ cost, timeMs: avgTimeMs });
    }
    let table = '\nBcrypt Cost Factor Benchmark (2025 Hardware)\n';
    table += '='.repeat(50) + '\n';
    table += 'Cost Factor | Avg Time (ms) | Recommendation\n';
    table += '-'.repeat(50) + '\n';
    results.forEach(({ cost, timeMs }) => {
        let recommendation = '';
        if (cost === 10)
            recommendation = 'Minimum (fast hardware)';
        else if (cost === 12)
            recommendation = 'Default (balanced)';
        else if (cost === 14)
            recommendation = 'Recommended (~250ms target)';
        else if (cost >= 15)
            recommendation = 'Maximum security';
        table += `${cost.toString().padStart(11)} | ${timeMs.toFixed(2).padStart(13)} | ${recommendation}\n`;
    });
    table += '='.repeat(50) + '\n';
    table += `Current selection: Cost ${getBcryptCostFactor()}\n`;
    return table;
}
//# sourceMappingURL=index.js.map