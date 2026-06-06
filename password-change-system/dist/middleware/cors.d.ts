/**
 * CORS Configuration
 * Strict origin checking for production security
 */
import cors from 'cors';
/**
 * CORS middleware with strict origin validation
 */
export declare const corsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Preflight handler for OPTIONS requests
 */
export declare function handlePreflight(req: unknown, res: unknown, next: () => void): void;
//# sourceMappingURL=cors.d.ts.map