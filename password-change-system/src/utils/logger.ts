/**
 * Production-grade Logger
 * Structured JSON logging with request correlation
 */

import winston from 'winston';
import { config } from '../config';
import { ILogContext } from '../types';

// ============================================
// Winston Configuration
// ============================================

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

// Custom format for development (human-readable)
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    const metaStr = JSON.stringify(metadata, null, 2);
    msg += `\n${metaStr}`;
  }
  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  defaultMeta: {
    service: 'password-change-system',
    environment: config.nodeEnv,
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.nodeEnv === 'production'
        ? combine(timestamp(), json(), errors({ stack: true }))
        : combine(
            colorize(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            devFormat
          ),
    }),
  ],
  // Exit on error: false ensures logger doesn't crash the app
  exitOnError: false,
});

// ============================================
// Structured Logging Helpers
// ============================================

export function logInfo(message: string, context?: ILogContext): void {
  logger.info(message, context || {});
}

export function logWarn(message: string, context?: ILogContext): void {
  logger.warn(message, context || {});
}

export function logError(message: string, error?: Error, context?: ILogContext): void {
  const logContext = {
    ...context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: config.nodeEnv !== 'production' ? error.stack : undefined,
        }
      : undefined,
  };
  logger.error(message, logContext);
}

export function logDebug(message: string, context?: ILogContext): void {
  if (config.nodeEnv !== 'production') {
    logger.debug(message, context || {});
  }
}

export function logSecurity(event: string, context?: ILogContext): void {
  logger.info(`[SECURITY] ${event}`, {
    ...context,
    securityEvent: event,
    timestamp: new Date().toISOString(),
  });
}

export function logAudit(event: string, context?: ILogContext): void {
  logger.info(`[AUDIT] ${event}`, {
    ...context,
    auditEvent: event,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// Request Context Logger
// ============================================

export class RequestLogger {
  private context: ILogContext;

  constructor(context: ILogContext) {
    this.context = context;
  }

  info(message: string, additionalContext?: Partial<ILogContext>): void {
    logInfo(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: Partial<ILogContext>): void {
    logWarn(message, { ...this.context, ...additionalContext });
  }

  error(message: string, error?: Error, additionalContext?: Partial<ILogContext>): void {
    logError(message, error, { ...this.context, ...additionalContext });
  }

  debug(message: string, additionalContext?: Partial<ILogContext>): void {
    logDebug(message, { ...this.context, ...additionalContext });
  }

  security(event: string, additionalContext?: Partial<ILogContext>): void {
    logSecurity(event, { ...this.context, ...additionalContext });
  }

  audit(event: string, additionalContext?: Partial<ILogContext>): void {
    logAudit(event, { ...this.context, ...additionalContext });
  }
}

// ============================================
// Sanitization Helpers
// ============================================

/**
 * Sanitize sensitive data from log context
 * Never log passwords, tokens, or PII
 */
export function sanitizeContext(context: Record<string, unknown>): ILogContext {
  const sensitiveFields = [
    'password',
    'oldPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'authorization',
    'cookie',
    'session',
    'creditCard',
    'ssn',
    'phone',
  ];

  const sanitized: ILogContext = {};
  
  for (const [key, value] of Object.entries(context)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export { logger };
