"use strict";
/**
 * Express Server
 * Production-grade setup with all security middleware
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("./database/mongodb");
const redis_1 = require("./database/redis");
const middleware_1 = require("./middleware");
const routes_1 = require("./routes");
const models_1 = require("./models");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
// Seed demo user for testing
async function seedDemoUser() {
    try {
        const existingUser = await models_1.UserModel.findOne({ username: 'demouser' });
        if (!existingUser) {
            (0, logger_1.logInfo)('Creating demo user...');
            await models_1.UserModel.create({
                username: 'demouser',
                passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I7K', // password: "password123"
                isActive: true,
                sessionVersion: 1,
            });
            (0, logger_1.logInfo)('Demo user created successfully');
        }
        else {
            (0, logger_1.logInfo)('Demo user already exists');
        }
    }
    catch (error) {
        (0, logger_1.logError)('Failed to seed demo user', error);
    }
}
// ============================================
// Initialize Express App
// ============================================
const app = (0, express_1.default)();
// ============================================
// Setup Process Handlers
// ============================================
(0, middleware_1.setupUnhandledRejectionHandler)();
(0, middleware_1.setupUncaughtExceptionHandler)();
// ============================================
// Apply Middleware
// ============================================
// Security headers and request ID
(0, middleware_1.applySecurityMiddleware)(app);
// CORS
app.use(middleware_1.corsMiddleware);
// Body parsing
app.use(express_1.default.json({ limit: '10kb' })); // Limit body size
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
// ============================================
// Health Check Endpoint
// ============================================
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    });
});
// ============================================
// API Routes
// ============================================
const API_PREFIX = `/api/${config_1.config.apiVersion}`;
// Authentication routes
app.use(`${API_PREFIX}/auth`, routes_1.authRoutes);
// ============================================
// 404 Handler
// ============================================
app.use(middleware_1.notFoundHandler);
// ============================================
// Global Error Handler
// ============================================
app.use(middleware_1.globalErrorHandler);
// ============================================
// Server Initialization
// ============================================
async function startServer() {
    try {
        (0, logger_1.logInfo)('Starting server initialization...');
        // 1. Calibrate bcrypt cost factor
        await (0, config_1.calibrateBcryptCost)();
        const benchmark = await (0, config_1.generateBcryptBenchmark)();
        (0, logger_1.logInfo)(benchmark);
        // 2. Connect to MongoDB
        await (0, mongodb_1.connectDatabase)();
        // 3. Connect to Redis (optional)
        if (config_1.config.redis.enabled) {
            await (0, redis_1.connectRedis)();
        }
        else {
            (0, logger_1.logInfo)('Redis disabled - skipping connection');
        }
        // 4. Seed demo user for testing
        await seedDemoUser();
        // 5. Start HTTP server
        const PORT = config_1.config.port;
        app.listen(PORT, () => {
            (0, logger_1.logInfo)(`Server running on port ${PORT}`);
            (0, logger_1.logInfo)(`API available at ${API_PREFIX}`);
            (0, logger_1.logInfo)(`Environment: ${config_1.config.nodeEnv}`);
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to start server', error);
        process.exit(1);
    }
}
// ============================================
// Graceful Shutdown
// ============================================
process.on('SIGTERM', async () => {
    (0, logger_1.logInfo)('SIGTERM received, shutting down gracefully...');
    // Close connections
    try {
        const { disconnectDatabase } = await Promise.resolve().then(() => __importStar(require('./database/mongodb')));
        await disconnectDatabase();
        if (config_1.config.redis.enabled) {
            const { disconnectRedis } = await Promise.resolve().then(() => __importStar(require('./database/redis')));
            await disconnectRedis();
        }
        (0, logger_1.logInfo)('Connections closed, exiting...');
        process.exit(0);
    }
    catch (error) {
        (0, logger_1.logError)('Error during shutdown', error);
        process.exit(1);
    }
});
process.on('SIGINT', async () => {
    (0, logger_1.logInfo)('SIGINT received, shutting down gracefully...');
    try {
        const { disconnectDatabase } = await Promise.resolve().then(() => __importStar(require('./database/mongodb')));
        await disconnectDatabase();
        if (config_1.config.redis.enabled) {
            const { disconnectRedis } = await Promise.resolve().then(() => __importStar(require('./database/redis')));
            await disconnectRedis();
        }
        (0, logger_1.logInfo)('Connections closed, exiting...');
        process.exit(0);
    }
    catch (error) {
        (0, logger_1.logError)('Error during shutdown', error);
        process.exit(1);
    }
});
// ============================================
// Start Server
// ============================================
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map