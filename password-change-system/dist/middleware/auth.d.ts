/**
 * Authentication Middleware
 * JWT validation with session version checking
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Generate new JWT token
 */
export declare function generateToken(userId: string, username: string, sessionVersion: number): string;
/**
 * Authentication middleware
 * Validates JWT and checks session version
 */
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Optional authentication middleware
 * Attaches user if token valid, but doesn't require it
 */
export declare function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map