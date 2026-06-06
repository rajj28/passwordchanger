/**
 * Production-grade Logger
 * Structured JSON logging with request correlation
 */
import winston from 'winston';
import { ILogContext } from '../types';
declare const logger: winston.Logger;
export declare function logInfo(message: string, context?: ILogContext): void;
export declare function logWarn(message: string, context?: ILogContext): void;
export declare function logError(message: string, error?: Error, context?: ILogContext): void;
export declare function logDebug(message: string, context?: ILogContext): void;
export declare function logSecurity(event: string, context?: ILogContext): void;
export declare function logAudit(event: string, context?: ILogContext): void;
export declare class RequestLogger {
    private context;
    constructor(context: ILogContext);
    info(message: string, additionalContext?: Partial<ILogContext>): void;
    warn(message: string, additionalContext?: Partial<ILogContext>): void;
    error(message: string, error?: Error, additionalContext?: Partial<ILogContext>): void;
    debug(message: string, additionalContext?: Partial<ILogContext>): void;
    security(event: string, additionalContext?: Partial<ILogContext>): void;
    audit(event: string, additionalContext?: Partial<ILogContext>): void;
}
/**
 * Sanitize sensitive data from log context
 * Never log passwords, tokens, or PII
 */
export declare function sanitizeContext(context: Record<string, unknown>): ILogContext;
export { logger };
//# sourceMappingURL=logger.d.ts.map