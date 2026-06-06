/**
 * Application Configuration
 * Centralized configuration with validation and defaults
 */
import { IAppConfig } from '../types';
export declare const config: IAppConfig;
/**
 * Calibrate bcrypt cost factor to achieve ~250ms hash time
 * Run once at startup and cache result
 */
export declare function calibrateBcryptCost(): Promise<number>;
/**
 * Get current bcrypt cost factor (calibrated or fallback)
 */
export declare function getBcryptCostFactor(): number;
export declare function generateBcryptBenchmark(): Promise<string>;
//# sourceMappingURL=index.d.ts.map