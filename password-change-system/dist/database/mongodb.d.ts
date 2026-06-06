/**
 * MongoDB Connection Manager
 * Production-grade connection handling with retry logic
 */
import mongoose from 'mongoose';
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export declare function getDatabaseConnection(): typeof mongoose.connection;
export declare function isDatabaseConnected(): boolean;
/**
 * Execute a function within a MongoDB transaction
 * Automatically commits on success, aborts on error
 */
export declare function withTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T>;
//# sourceMappingURL=mongodb.d.ts.map