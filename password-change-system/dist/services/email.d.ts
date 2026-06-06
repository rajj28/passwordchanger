/**
 * Email Service
 * Nodemailer integration with HTML templates
 */
import { IPasswordChangeEmailData } from '../types';
/**
 * Initialize email transporter
 */
export declare function initializeEmailService(): Promise<void>;
/**
 * Send password change notification email
 */
export declare function sendPasswordChangeEmail(to: string, data: IPasswordChangeEmailData): Promise<void>;
/**
 * Check if email service is healthy
 */
export declare function isEmailServiceHealthy(): Promise<boolean>;
//# sourceMappingURL=email.d.ts.map