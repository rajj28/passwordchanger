"use strict";
/**
 * MongoDB Connection Manager
 * Production-grade connection handling with retry logic
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.getDatabaseConnection = getDatabaseConnection;
exports.isDatabaseConnected = isDatabaseConnected;
exports.withTransaction = withTransaction;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
// ============================================
// Connection State
// ============================================
let isConnected = false;
let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;
// ============================================
// Connection Options
// ============================================
const mongooseOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
};
// ============================================
// Connection Event Handlers
// ============================================
mongoose_1.default.connection.on('connected', () => {
    isConnected = true;
    connectionRetries = 0;
    (0, logger_1.logInfo)('MongoDB connected successfully');
});
mongoose_1.default.connection.on('error', (error) => {
    (0, logger_1.logError)('MongoDB connection error', error);
    isConnected = false;
});
mongoose_1.default.connection.on('disconnected', () => {
    (0, logger_2.logWarn)('MongoDB disconnected');
    isConnected = false;
});
mongoose_1.default.connection.on('reconnected', () => {
    (0, logger_1.logInfo)('MongoDB reconnected');
    isConnected = true;
});
// ============================================
// Connection Functions
// ============================================
async function connectDatabase() {
    if (isConnected) {
        (0, logger_1.logDebug)('Using existing MongoDB connection');
        return;
    }
    if (connectionRetries >= MAX_RETRIES) {
        throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
    }
    try {
        (0, logger_1.logInfo)(`Connecting to MongoDB (attempt ${connectionRetries + 1}/${MAX_RETRIES})...`);
        await mongoose_1.default.connect(config_1.config.mongodb.uri, mongooseOptions);
        // Verify connection by pinging the database
        await mongoose_1.default.connection.db.admin().ping();
        (0, logger_1.logInfo)('MongoDB connection established and verified');
        isConnected = true;
        connectionRetries = 0;
    }
    catch (error) {
        connectionRetries++;
        (0, logger_1.logError)(`MongoDB connection failed (attempt ${connectionRetries}/${MAX_RETRIES})`, error);
        if (connectionRetries < MAX_RETRIES) {
            (0, logger_1.logInfo)(`Retrying in ${RETRY_DELAY_MS}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            return connectDatabase();
        }
        throw error;
    }
}
async function disconnectDatabase() {
    if (!isConnected) {
        return;
    }
    try {
        await mongoose_1.default.disconnect();
        isConnected = false;
        (0, logger_1.logInfo)('MongoDB connection closed');
    }
    catch (error) {
        (0, logger_1.logError)('Error closing MongoDB connection', error);
        throw error;
    }
}
function getDatabaseConnection() {
    if (!isConnected) {
        throw new Error('Database not connected');
    }
    return mongoose_1.default.connection;
}
function isDatabaseConnected() {
    return isConnected && mongoose_1.default.connection.readyState === 1;
}
// ============================================
// Session/Transaction Helpers
// ============================================
/**
 * Execute a function within a MongoDB transaction
 * Automatically commits on success, aborts on error
 */
async function withTransaction(fn) {
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const result = await fn(session);
        await session.commitTransaction();
        return result;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
}
// Import at end to avoid circular dependency issues
const logger_2 = require("../utils/logger");
//# sourceMappingURL=mongodb.js.map