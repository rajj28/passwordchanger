/**
 * Input Validation Middleware
 * express-validator with strict sanitization
 */
import { Request, Response, NextFunction } from 'express';
export declare const changePasswordValidators: import("express-validator").ValidationChain[];
export declare function handleValidationErrors(req: Request, res: Response, next: NextFunction): void;
/**
 * Normalize all string inputs to NFC
 */
export declare function normalizeInputMiddleware(req: Request, _res: Response, next: NextFunction): void;
/**
 * Strip potentially dangerous characters
 * Note: We don't strip too aggressively to support international passwords
 */
export declare function sanitizeInputMiddleware(req: Request, _res: Response, next: NextFunction): void;
//# sourceMappingURL=validation.d.ts.map