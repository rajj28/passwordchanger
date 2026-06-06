/**
 * User Model
 * Production-grade Mongoose schema with password history and security features
 */
import { Model } from 'mongoose';
import { IUserDocument } from '../types';
interface IUserModel extends Model<IUserDocument> {
    hashPassword(password: string): Promise<string>;
    validatePasswordStrength(password: string): {
        valid: boolean;
        error?: string;
    };
    findByCredentials(username: string, password: string): Promise<IUserDocument | null>;
}
export declare const UserModel: IUserModel;
export default UserModel;
//# sourceMappingURL=User.d.ts.map