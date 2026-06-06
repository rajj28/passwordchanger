/**
 * MongoDB Connection Manager
 * Production-grade connection handling with retry logic
 */

import mongoose from 'mongoose';
import { config } from '../config';
import { logInfo, logError, logDebug } from '../utils/logger';

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

const mongooseOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
};

// ============================================
// Connection Event Handlers
// ============================================

mongoose.connection.on('connected', () => {
  isConnected = true;
  connectionRetries = 0;
  logInfo('MongoDB connected successfully');
});

mongoose.connection.on('error', (error) => {
  logError('MongoDB connection error', error);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  logWarn('MongoDB disconnected');
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  logInfo('MongoDB reconnected');
  isConnected = true;
});

// ============================================
// Connection Functions
// ============================================

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logDebug('Using existing MongoDB connection');
    return;
  }

  if (connectionRetries >= MAX_RETRIES) {
    throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
  }

  try {
    logInfo(`Connecting to MongoDB (attempt ${connectionRetries + 1}/${MAX_RETRIES})...`);
    
    await mongoose.connect(config.mongodb.uri, mongooseOptions);
    
    // Verify connection by pinging the database
    await mongoose.connection.db!.admin().ping();
    
    logInfo('MongoDB connection established and verified');
    isConnected = true;
    connectionRetries = 0;
  } catch (error) {
    connectionRetries++;
    logError(`MongoDB connection failed (attempt ${connectionRetries}/${MAX_RETRIES})`, error as Error);
    
    if (connectionRetries < MAX_RETRIES) {
      logInfo(`Retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDatabase();
    }
    
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logInfo('MongoDB connection closed');
  } catch (error) {
    logError('Error closing MongoDB connection', error as Error);
    throw error;
  }
}

export function getDatabaseConnection(): typeof mongoose.connection {
  if (!isConnected) {
    throw new Error('Database not connected');
  }
  return mongoose.connection;
}

export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

// ============================================
// Session/Transaction Helpers
// ============================================

/**
 * Execute a function within a MongoDB transaction
 * Automatically commits on success, aborts on error
 */
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const result = await fn(session);
    
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Import at end to avoid circular dependency issues
import { logWarn } from '../utils/logger';
