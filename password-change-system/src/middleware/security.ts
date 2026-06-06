/**
 * Security Middleware
 * Helmet.js configuration for production-grade security headers
 */

import helmet from 'helmet';
import { Express } from 'express';
import { config } from '../config';

/**
 * Apply security middleware to Express app
 */
export function applySecurityMiddleware(app: Express): void {
  // ============================================
  // Helmet Configuration
  // ============================================
  
  app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Required for some frontend frameworks
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...config.corsOrigins],
        frameSrc: ["'none'"], // Prevent clickjacking
        objectSrc: ["'none'"], // Prevent plugin-based attacks
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },
    
    // X-Frame-Options (clickjacking protection)
    frameguard: {
      action: 'deny',
    },
    
    // X-Content-Type-Options (MIME sniffing protection)
    noSniff: true,
    
    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: false,
    },
    
    // X-Download-Options (IE only)
    ieNoOpen: true,
    
    // X-Permitted-Cross-Domain-Policies (Flash/Acrobat)
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
    
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    
    // X-XSS-Protection (legacy browsers)
    xssFilter: true,
    
    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disable if you need to load external resources
    
    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin',
    },
    
    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
    
    // Origin-Agent-Cluster
    originAgentCluster: true,
  }));

  // ============================================
  // Additional Security Headers
  // ============================================
  
  app.use((req, res, next) => {
    // Prevent caching of sensitive responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Remove X-Powered-By (already handled by helmet.hidePoweredBy)
    // But double-check it's gone
    res.removeHeader('X-Powered-By');
    
    // Permissions Policy (formerly Feature-Policy)
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    );
    
    next();
  });

  // ============================================
  // Request ID Middleware
  // ============================================
  
  app.use((req, res, next) => {
    // Generate or extract request ID for tracing
    const requestId = req.headers['x-request-id'] as string || 
                      req.headers['x-correlation-id'] as string ||
                      generateRequestId();
    
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    
    next();
  });

  // ============================================
  // IP Extraction Middleware
  // ============================================
  
  if (config.trustProxy) {
    app.set('trust proxy', true);
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}
