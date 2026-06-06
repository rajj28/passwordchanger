/**
 * Express Server
 * Production-grade setup with all security middleware
 */

import express, { Express, Request, Response } from 'express';
import { connectDatabase } from './database/mongodb';
import { connectRedis } from './database/redis';
import {
  applySecurityMiddleware,
  corsMiddleware,
  globalErrorHandler,
  notFoundHandler,
  setupUnhandledRejectionHandler,
  setupUncaughtExceptionHandler,
} from './middleware';
import { authRoutes } from './routes';
import { UserModel } from './models';
import { config, calibrateBcryptCost, generateBcryptBenchmark } from './config';
import { logInfo, logError } from './utils/logger';

// Seed demo user for testing
async function seedDemoUser(): Promise<void> {
  try {
    const existingUser = await UserModel.findOne({ username: 'demouser' });
    if (!existingUser) {
      logInfo('Creating demo user...');
      await UserModel.create({
        username: 'demouser',
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I7K', // password: "password123"
        isActive: true,
        sessionVersion: 1,
      });
      logInfo('Demo user created successfully');
    } else {
      logInfo('Demo user already exists');
    }
  } catch (error) {
    logError('Failed to seed demo user', error as Error);
  }
}

// ============================================
// Initialize Express App
// ============================================

const app: Express = express();

// ============================================
// Setup Process Handlers
// ============================================

setupUnhandledRejectionHandler();
setupUncaughtExceptionHandler();

// ============================================
// Apply Middleware
// ============================================

// Security headers and request ID
applySecurityMiddleware(app);

// CORS
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============================================
// Health Check Endpoint
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ============================================
// API Routes
// ============================================

const API_PREFIX = `/api/${config.apiVersion}`;

// Authentication routes
app.use(`${API_PREFIX}/auth`, authRoutes);

// ============================================
// 404 Handler
// ============================================

app.use(notFoundHandler);

// ============================================
// Global Error Handler
// ============================================

app.use(globalErrorHandler);

// ============================================
// Server Initialization
// ============================================

async function startServer(): Promise<void> {
  try {
    logInfo('Starting server initialization...');
    
    // 1. Calibrate bcrypt cost factor
    await calibrateBcryptCost();
    const benchmark = await generateBcryptBenchmark();
    logInfo(benchmark);
    
    // 2. Connect to MongoDB
    await connectDatabase();
    
    // 3. Connect to Redis (optional)
    if (config.redis.enabled) {
      await connectRedis();
    } else {
      logInfo('Redis disabled - skipping connection');
    }
    
    // 4. Seed demo user for testing
    await seedDemoUser();
    
    // 5. Start HTTP server
    const PORT = config.port;
    
    app.listen(PORT, () => {
      logInfo(`Server running on port ${PORT}`);
      logInfo(`API available at ${API_PREFIX}`);
      logInfo(`Environment: ${config.nodeEnv}`);
    });
    
  } catch (error) {
    logError('Failed to start server', error as Error);
    process.exit(1);
  }
}

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGTERM', async () => {
  logInfo('SIGTERM received, shutting down gracefully...');
  
  // Close connections
  try {
    const { disconnectDatabase } = await import('./database/mongodb');
    await disconnectDatabase();
    
    if (config.redis.enabled) {
      const { disconnectRedis } = await import('./database/redis');
      await disconnectRedis();
    }
    
    logInfo('Connections closed, exiting...');
    process.exit(0);
  } catch (error) {
    logError('Error during shutdown', error as Error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logInfo('SIGINT received, shutting down gracefully...');
  
  try {
    const { disconnectDatabase } = await import('./database/mongodb');
    await disconnectDatabase();
    
    if (config.redis.enabled) {
      const { disconnectRedis } = await import('./database/redis');
      await disconnectRedis();
    }
    
    logInfo('Connections closed, exiting...');
    process.exit(0);
  } catch (error) {
    logError('Error during shutdown', error as Error);
    process.exit(1);
  }
});

// ============================================
// Start Server
// ============================================

startServer();

export default app;
