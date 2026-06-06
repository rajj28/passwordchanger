/**
 * Type definitions for Password Change System
 * Production-grade TypeScript interfaces and types
 */

import { Request } from 'express';

// ============================================
// Extend Express Request type
// ============================================

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// ============================================
// User & Authentication Types
// ============================================

export interface IUser {
  _id: string;
  username: string;
  passwordHash: string;
  passwordHistory: IPasswordHistoryEntry[];
  sessionVersion: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPasswordHistoryEntry {
  hash: string;
  changedAt: Date;
}

export interface IUserDocument extends IUser {
  comparePassword(candidatePassword: string): Promise<boolean>;
  isPasswordInHistory(candidatePassword: string): Promise<boolean>;
}

// ============================================
// JWT Types
// ============================================

export interface IJWTPayload {
  sub: string;           // userId
  username: string;
  sv: number;           // sessionVersion
  iat: number;
  exp: number;
}

export interface IAuthenticatedRequest extends Request {
  user?: IJWTPayload;
  requestId: string;
}

// ============================================
// Password Change Types
// ============================================

export interface IChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IChangePasswordResponse {
  success: boolean;
  token: string;
  message: string;
}

export interface IPasswordChangeAudit {
  _id?: string;
  userId: string;
  oldPasswordHash: string;
  newPasswordHash: string;
  ip: string;
  userAgent: string;
  status: 'success' | 'failed';
  failureReason?: string;
  changedAt: Date;
  requestId: string;
}

// ============================================
// API Response Types
// ============================================

export interface IAPIError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface IAPIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: IAPIError;
  requestId: string;
  timestamp: string;
}

// ============================================
// Rate Limiting Types
// ============================================

export interface IRateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

// ============================================
// Email Types
// ============================================

export interface IEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  fromName: string;
}

export interface IPasswordChangeEmailData {
  username: string;
  changedAt: Date;
  ipAddress: string;
}

// ============================================
// Configuration Types
// ============================================

export interface IAppConfig {
  nodeEnv: string;
  port: number;
  apiVersion: string;
  mongodb: {
    uri: string;
    dbName: string;
  };
  redis: {
    url: string;
    password?: string;
    enabled: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  bcrypt: {
    costFactor: number;
  };
  rateLimit: {
    ip: IRateLimitConfig;
    user: IRateLimitConfig;
  };
  email: IEmailConfig;
  corsOrigins: string[];
  trustProxy: boolean;
}

// ============================================
// Logger Types
// ============================================

export interface ILogContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}
