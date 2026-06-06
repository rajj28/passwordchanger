/**
 * Authentication Middleware
 * JWT validation with session version checking
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { IJWTPayload, IAuthenticatedRequest } from '../types';
import { UserModel } from '../models';
import { logSecurity, logError } from '../utils/logger';

// ============================================
// JWT Verification
// ============================================

/**
 * Extract JWT from Authorization header
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}

/**
 * Verify JWT token
 */
function verifyToken(token: string): IJWTPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as IJWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return null;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return null;
    }
    return null;
  }
}

/**
 * Generate new JWT token
 */
export function generateToken(
  userId: string,
  username: string,
  sessionVersion: number
): string {
  const payload: Omit<IJWTPayload, 'iat' | 'exp'> = {
    sub: userId,
    username,
    sv: sessionVersion,
  };

  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
  
  return token;
}

// ============================================
// Authentication Middleware
// ============================================

/**
 * Authentication middleware
 * Validates JWT and checks session version
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authReq = req as IAuthenticatedRequest;
  const requestId = authReq.requestId || 'unknown';

  try {
    // Extract token
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      logSecurity('Authentication failed: No token provided', {
        requestId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      logSecurity('Authentication failed: Invalid or expired token', {
        requestId,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Fetch user and verify session version
    const user = await UserModel.findById(decoded.sub).select('+passwordHash');

    if (!user) {
      logSecurity('Authentication failed: User not found', {
        requestId,
        userId: decoded.sub,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!user.isActive) {
      logSecurity('Authentication failed: Account deactivated', {
        requestId,
        userId: decoded.sub,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Account deactivated',
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check session version (token invalidation mechanism)
    if (decoded.sv !== user.sessionVersion) {
      logSecurity('Authentication failed: Session version mismatch (token invalidated)', {
        requestId,
        userId: decoded.sub,
        tokenSessionVersion: decoded.sv,
        currentSessionVersion: user.sessionVersion,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_INVALIDATED',
          message: 'Session invalidated due to password change',
        },
        requestId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Attach user to request
    authReq.user = decoded;

    logSecurity('Authentication successful', {
      requestId,
      userId: decoded.sub,
      username: decoded.username,
    });

    next();
  } catch (error) {
    logError('Authentication error', error as Error, { requestId });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication service error',
      },
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token valid, but doesn't require it
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authReq = req as IAuthenticatedRequest;
  
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      
      if (decoded) {
        // Verify user exists and is active
        const user = await UserModel.findById(decoded.sub);
        
        if (user && user.isActive && decoded.sv === user.sessionVersion) {
          authReq.user = decoded;
        }
      }
    }

    next();
  } catch {
    // Silently continue without auth
    next();
  }
}
