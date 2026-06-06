/**
 * Password Change Audit Model
 * Immutable audit trail for all password change attempts
 */

import mongoose, { Schema, Model } from 'mongoose';
import { IPasswordChangeAudit } from '../types';

// ============================================
// Schema Definition
// ============================================

const PasswordChangeAuditSchema = new Schema<IPasswordChangeAudit>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },
    
    oldPasswordHash: {
      type: String,
      required: [true, 'Old password is required'],
      // WARNING: Storing plaintext passwords (as requested)
    },
    
    newPasswordHash: {
      type: String,
      required: [true, 'New password is required'],
      // WARNING: Storing plaintext passwords (as requested)
    },
    
    ip: {
      type: String,
      required: [true, 'IP address is required'],
      maxlength: 45, // IPv6 max length
    },
    
    userAgent: {
      type: String,
      required: [true, 'User agent is required'],
      maxlength: 500, // Prevent abuse with extremely long UAs
    },
    
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ['success', 'failed'],
        message: 'Status must be either "success" or "failed"',
      },
    },
    
    failureReason: {
      type: String,
      required: function (this: IPasswordChangeAudit): boolean {
        return this.status === 'failed';
      },
      maxlength: 200,
    },
    
    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    
    requestId: {
      type: String,
      required: [true, 'Request ID is required'],
      unique: true,
      index: true,
    },
  },
  {
    // Disable _id since we don't need it for audit logs
    // Actually, keep it for internal MongoDB operations
    
    // Disable version key (not needed for audit logs)
    versionKey: false,
    
    // Disable automatic id virtual
    id: false,
    
    // Timestamps disabled - we use explicit changedAt
    timestamps: false,
  }
);

// ============================================
// Indexes (with cardinality reasoning)
// ============================================

/*
 * Index Strategy:
 * 
 * 1. requestId (unique, indexed by default from unique: true)
 *    - Cardinality: HIGH (UUID v4, unique per request)
 *    - Use case: Idempotency checks, exact request lookup
 *    - Reasoning: Must be unique for idempotency, high cardinality makes efficient index
 * 
 * 2. userId + changedAt (compound index)
 *    - Cardinality: HIGH (userId) + HIGH (timestamp)
 *    - Use case: Query password history for a user, sorted by date
 *    - Use case: "Show me my last 10 password changes"
 *    - Reasoning: Supports efficient range queries with sorting
 *    - Ordering: userId first for equality match, changedAt desc for sorting
 * 
 * 3. changedAt (single index)
 *    - Cardinality: HIGH (timestamp)
 *    - Use case: Time-based queries, data retention policies
 *    - Reasoning: Supports range scans for cleanup jobs
 *    - Note: Could be sparse if we don't query time ranges often
 * 
 * 4. status (partial index for failed attempts)
 *    - Cardinality: VERY LOW (2 values)
 *    - Use case: Security monitoring - "show all failed attempts"
 *    - Reasoning: Full index would be useless (low cardinality), partial index efficient
 */

// Compound index for user queries with time sorting
PasswordChangeAuditSchema.index(
  { userId: 1, changedAt: -1 },
  {
    name: 'user_time_compound',
    background: true,
  }
);

// Time-based index for retention and time-range queries
PasswordChangeAuditSchema.index(
  { changedAt: -1 },
  {
    name: 'changed_at_desc',
    background: true,
  }
);

// Partial index for failed attempts (security monitoring)
PasswordChangeAuditSchema.index(
  { status: 1, changedAt: -1 },
  {
    name: 'failed_attempts_partial',
    partialFilterExpression: { status: 'failed' },
    background: true,
  }
);

// ============================================
// Pre-save Middleware
// ============================================

PasswordChangeAuditSchema.pre('save', function (next) {
  // Ensure changedAt is set
  if (!this.changedAt) {
    this.changedAt = new Date();
  }
  
  // Truncate user agent if too long (shouldn't happen due to maxlength, but safety first)
  if (this.userAgent && this.userAgent.length > 500) {
    this.userAgent = this.userAgent.substring(0, 500);
  }
  
  // Sanitize failure reason
  if (this.failureReason && this.failureReason.length > 200) {
    this.failureReason = this.failureReason.substring(0, 200);
  }
  
  next();
});

// ============================================
// Static Methods
// ============================================

interface IPasswordChangeAuditModel extends Model<IPasswordChangeAudit> {
  getRecentForUser(userId: string, limit?: number): Promise<IPasswordChangeAudit[]>;
  getFailedAttemptsForUser(userId: string, since?: Date): Promise<number>;
  getAllForUser(userId: string, skip?: number, limit?: number): Promise<IPasswordChangeAudit[]>;
}

/**
 * Get recent password changes for a user
 */
PasswordChangeAuditSchema.statics.getRecentForUser = async function (
  userId: string,
  limit: number = 10
): Promise<IPasswordChangeAudit[]> {
  return this.find({ userId })
    .sort({ changedAt: -1 })
    .limit(limit)
    .lean()
    .exec();
};

/**
 * Count failed attempts for a user since a specific date
 */
PasswordChangeAuditSchema.statics.getFailedAttemptsForUser = async function (
  userId: string,
  since?: Date
): Promise<number> {
  const query: Record<string, unknown> = {
    userId,
    status: 'failed',
  };
  
  if (since) {
    query.changedAt = { $gte: since };
  }
  
  return this.countDocuments(query);
};

/**
 * Get all audit entries for a user with pagination
 */
PasswordChangeAuditSchema.statics.getAllForUser = async function (
  userId: string,
  skip: number = 0,
  limit: number = 50
): Promise<IPasswordChangeAudit[]> {
  return this.find({ userId })
    .sort({ changedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();
};

// ============================================
// Model Export
// ============================================

export const PasswordChangeAuditModel = mongoose.model<
  IPasswordChangeAudit,
  IPasswordChangeAuditModel
>('PasswordChangeAudit', PasswordChangeAuditSchema);

export default PasswordChangeAuditModel;
