/**
 * CORS Configuration
 * Strict origin checking for production security
 */

import cors from 'cors';
import { config } from '../config';
import { logSecurity } from '../utils/logger';

/**
 * CORS middleware with strict origin validation
 */
export const corsMiddleware = cors({
  // Only allow specific origins (no wildcards in production)
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      // In production, you might want to block this
      if (config.nodeEnv === 'production') {
        logSecurity('CORS request without origin blocked', { origin: 'none' });
        callback(new Error('Origin required'), false);
        return;
      }
      callback(null, true);
      return;
    }

    // Check if origin is in allowed list
    if (config.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Log rejected origins for security monitoring
    logSecurity('CORS origin rejected', {
      origin,
      allowedOrigins: config.corsOrigins,
    });

    callback(new Error('Not allowed by CORS'), false);
  },

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'X-Idempotency-Key',
    'Accept',
    'Origin',
  ],

  // Exposed headers
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],

  // Max age for preflight cache (24 hours)
  maxAge: 86400,

  // Handle preflight
  optionsSuccessStatus: 204,
});

/**
 * Preflight handler for OPTIONS requests
 */
export function handlePreflight(req: unknown, res: unknown, next: () => void): void {
  // Let the cors middleware handle OPTIONS
  next();
}
