"use strict";
/**
 * Security Middleware
 * Helmet.js configuration for production-grade security headers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySecurityMiddleware = applySecurityMiddleware;
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("../config");
/**
 * Apply security middleware to Express app
 */
function applySecurityMiddleware(app) {
    // ============================================
    // Helmet Configuration
    // ============================================
    app.use((0, helmet_1.default)({
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"], // Required for some frontend frameworks
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", ...config_1.config.corsOrigins],
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
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
        next();
    });
    // ============================================
    // Request ID Middleware
    // ============================================
    app.use((req, res, next) => {
        // Generate or extract request ID for tracing
        const requestId = req.headers['x-request-id'] ||
            req.headers['x-correlation-id'] ||
            generateRequestId();
        req.requestId = requestId;
        res.setHeader('X-Request-ID', requestId);
        next();
    });
    // ============================================
    // IP Extraction Middleware
    // ============================================
    if (config_1.config.trustProxy) {
        app.set('trust proxy', true);
    }
}
/**
 * Generate unique request ID
 */
function generateRequestId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
}
//# sourceMappingURL=security.js.map