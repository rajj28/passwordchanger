"use strict";
/**
 * User Model
 * Production-grade Mongoose schema with password history and security features
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
// ============================================
// Constants
// ============================================
const PASSWORD_HISTORY_LIMIT = 5; // Keep last 5 password hashes
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 64;
const MAX_PASSWORD_BYTES = 72; // bcrypt limitation
// ============================================
// Sub-schema for Password History
// ============================================
const PasswordHistorySchema = new mongoose_1.Schema({
    hash: {
        type: String,
        required: true,
    },
    changedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
}, { _id: false });
// ============================================
// User Schema Definition
// ============================================
const UserSchema = new mongoose_1.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username must be at most 30 characters'],
        match: [
            /^[a-z0-9_]+$/,
            'Username can only contain lowercase letters, numbers, and underscores',
        ],
        index: true,
    },
    passwordHash: {
        type: String,
        required: [true, 'Password hash is required'],
        select: false, // Don't include in queries by default
    },
    passwordHistory: {
        type: [PasswordHistorySchema],
        default: [],
        validate: {
            validator: function (history) {
                return history.length <= PASSWORD_HISTORY_LIMIT;
            },
            message: `Password history cannot exceed ${PASSWORD_HISTORY_LIMIT} entries`,
        },
    },
    sessionVersion: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
        transform: function (_doc, ret) {
            delete ret.passwordHash;
            delete ret.passwordHistory;
            delete ret.__v;
            return ret;
        },
    },
    toObject: {
        transform: function (_doc, ret) {
            delete ret.passwordHash;
            delete ret.passwordHistory;
            delete ret.__v;
            return ret;
        },
    },
});
// ============================================
// Indexes (with cardinality reasoning)
// ============================================
/*
 * Index Strategy:
 *
 * 1. username (unique, indexed by default from unique: true)
 *    - Cardinality: HIGH (unique per user)
 *    - Use case: Login lookups, username validation
 *    - Reasoning: Most common lookup field, must be unique
 *
 * 2. _id (default MongoDB index)
 *    - Cardinality: HIGH (unique per document)
 *    - Use case: Primary key, foreign key references
 *    - Reasoning: Standard MongoDB primary index
 *
 * 3. sessionVersion (not indexed)
 *    - Cardinality: LOW (small integer, changes frequently)
 *    - Use case: Read on every auth check, but always with _id
 *    - Reasoning: Low cardinality + high write frequency = bad index candidate
 *    - We always query by _id first, so no compound index needed
 *
 * 4. isActive (not indexed)
 *    - Cardinality: VERY LOW (boolean)
 *    - Use case: Filtering active users
 *    - Reasoning: Boolean index has terrible selectivity
 *    - If we need to query active users frequently, use partial index instead
 *
 * 5. createdAt (not indexed by default)
 *    - Cardinality: HIGH
 *    - Use case: Sorting users by registration date
 *    - Reasoning: Add only if needed for admin queries
 */
// Partial index for active users (if we need to filter by active status frequently)
UserSchema.index({ isActive: 1 }, {
    partialFilterExpression: { isActive: true },
    name: 'active_users_partial',
});
// ============================================
// Virtual Fields
// ============================================
UserSchema.virtual('passwordHistoryCount').get(function () {
    return this.passwordHistory.length;
});
// ============================================
// Pre-save Middleware
// ============================================
UserSchema.pre('save', function (next) {
    // Normalize username to lowercase (redundant with schema option but double-safe)
    if (this.isModified('username')) {
        this.username = this.username.toLowerCase().trim();
    }
    // Ensure passwordHistory doesn't exceed limit
    if (this.passwordHistory.length > PASSWORD_HISTORY_LIMIT) {
        this.passwordHistory = this.passwordHistory.slice(-PASSWORD_HISTORY_LIMIT);
    }
    next();
});
// ============================================
// Instance Methods
// ============================================
/**
 * Compare candidate password with stored hash
 * Uses constant-time comparison to prevent timing attacks
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        if (!this.passwordHash) {
            // Handle case where passwordHash wasn't selected in query
            const userWithPassword = await exports.UserModel.findById(this._id).select('+passwordHash');
            if (!userWithPassword) {
                return false;
            }
            return bcrypt_1.default.compare(candidatePassword, userWithPassword.passwordHash);
        }
        return bcrypt_1.default.compare(candidatePassword, this.passwordHash);
    }
    catch (error) {
        (0, logger_1.logError)('Password comparison error', error, { userId: this._id });
        return false;
    }
};
/**
 * Check if password exists in history
 * Uses constant-time comparison for each entry
 */
UserSchema.methods.isPasswordInHistory = async function (candidatePassword) {
    try {
        // Check against all history entries in parallel
        const checks = this.passwordHistory.map(async (entry) => {
            return bcrypt_1.default.compare(candidatePassword, entry.hash);
        });
        const results = await Promise.all(checks);
        return results.some(result => result === true);
    }
    catch (error) {
        (0, logger_1.logError)('Password history check error', error, { userId: this._id });
        return false;
    }
};
// ============================================
// Static Methods
// ============================================
/**
 * Hash password with calibrated bcrypt cost
 */
UserSchema.statics.hashPassword = async function (password) {
    const costFactor = (0, config_1.getBcryptCostFactor)();
    return bcrypt_1.default.hash(password, costFactor);
};
/**
 * Validate password strength
 * Returns validation result with optional error message
 */
UserSchema.statics.validatePasswordStrength = function (password) {
    // Check length
    if (password.length < MIN_PASSWORD_LENGTH) {
        return {
            valid: false,
            error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        };
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
        return {
            valid: false,
            error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
        };
    }
    // Check byte length (bcrypt limitation: only first 72 bytes are used)
    const byteLength = Buffer.byteLength(password, 'utf8');
    if (byteLength > MAX_PASSWORD_BYTES) {
        return {
            valid: false,
            error: `Password exceeds maximum byte length (${MAX_PASSWORD_BYTES} bytes). Use shorter characters or simplify.`,
        };
    }
    // Check for null bytes (potential injection attack)
    if (password.includes('\0')) {
        return {
            valid: false,
            error: 'Password contains invalid characters',
        };
    }
    return { valid: true };
};
/**
 * Find user by credentials (for login)
 */
UserSchema.statics.findByCredentials = async function (username, password) {
    const user = await this.findOne({ username, isActive: true }).select('+passwordHash');
    if (!user) {
        return null;
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return null;
    }
    return user;
};
exports.UserModel = mongoose_1.default.model('User', UserSchema);
exports.default = exports.UserModel;
//# sourceMappingURL=User.js.map