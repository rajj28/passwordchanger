/**
 * Type definitions for Password Change System
 * Production-grade TypeScript interfaces and types
 */
import { Request } from 'express';
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}
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
export interface IJWTPayload {
    sub: string;
    username: string;
    sv: number;
    iat: number;
    exp: number;
}
export interface IAuthenticatedRequest extends Request {
    user?: IJWTPayload;
    requestId: string;
}
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
export interface IRateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyPrefix: string;
}
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
export interface ILogContext {
    requestId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: unknown;
}
//# sourceMappingURL=index.d.ts.map