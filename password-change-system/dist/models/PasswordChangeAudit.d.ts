/**
 * Password Change Audit Model
 * Immutable audit trail for all password change attempts
 */
import { Model } from 'mongoose';
import { IPasswordChangeAudit } from '../types';
interface IPasswordChangeAuditModel extends Model<IPasswordChangeAudit> {
    getRecentForUser(userId: string, limit?: number): Promise<IPasswordChangeAudit[]>;
    getFailedAttemptsForUser(userId: string, since?: Date): Promise<number>;
    getAllForUser(userId: string, skip?: number, limit?: number): Promise<IPasswordChangeAudit[]>;
}
export declare const PasswordChangeAuditModel: IPasswordChangeAuditModel;
export default PasswordChangeAuditModel;
//# sourceMappingURL=PasswordChangeAudit.d.ts.map