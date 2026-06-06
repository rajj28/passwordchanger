/**
 * View Audit Logs - See all password changes with plaintext passwords
 * Run this script to see old and new passwords from the database
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

async function viewAuditLogs() {
  try {
    console.log('Connecting to MongoDB...\n');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Define the audit schema (simplified)
    const auditSchema = new mongoose.Schema({
      userId: String,
      oldPasswordHash: String,  // Contains plaintext old password
      newPasswordHash: String,  // Contains plaintext new password
      ip: String,
      userAgent: String,
      status: String,
      changedAt: Date,
      requestId: String,
    }, { collection: 'passwordchangeaudits' });
    
    const AuditModel = mongoose.model('PasswordChangeAudit', auditSchema);
    
    // Get all audit logs
    const logs = await AuditModel.find().sort({ changedAt: -1 }).limit(50);
    
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('                        PASSWORD AUDIT LOGS                            ');
    console.log('═══════════════════════════════════════════════════════════════════════\n');
    console.log(`Total Records: ${logs.length}\n`);
    
    if (logs.length === 0) {
      console.log('❌ No audit logs found. Make some password change requests first.\n');
    } else {
      logs.forEach((log, index) => {
        console.log(`───────────────────────────────────── Record ${index + 1} ─────────────────────────────────────`);
        console.log(`📅 Date & Time:    ${log.changedAt.toLocaleString()}`);
        console.log(`👤 User ID:        ${log.userId}`);
        console.log(`🔓 OLD Password:   "${log.oldPasswordHash}"`);
        console.log(`🔐 NEW Password:   "${log.newPasswordHash}"`);
        console.log(`🌐 IP Address:     ${log.ip}`);
        console.log(`✅ Status:         ${log.status}`);
        console.log(`🔑 Request ID:     ${log.requestId}`);
        console.log('');
      });
    }
    
    console.log('═══════════════════════════════════════════════════════════════════════\n');
    
    // Also show the users created
    const userSchema = new mongoose.Schema({
      username: String,
      passwordHash: String,
      isActive: Boolean,
      createdAt: Date,
    }, { collection: 'users' });
    
    const UserModel = mongoose.model('User', userSchema);
    const users = await UserModel.find().sort({ createdAt: -1 }).limit(20);
    
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('                        CREATED USERS                                  ');
    console.log('═══════════════════════════════════════════════════════════════════════\n');
    console.log(`Total Users: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Username: ${user.username} | Created: ${user.createdAt.toLocaleString()}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════════════\n');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

viewAuditLogs();
