# How to View Old and New Passwords from Audit Log

## What is an Audit Log?

An **audit log** is a record in your **MongoDB database** that stores every password change attempt. It includes:
- 👤 **User ID** - Which user changed their password
- 🔓 **Old Password** - The password they claimed to have (stored as plaintext)
- 🔐 **New Password** - The new password they set (stored as plaintext)
- 🌐 **IP Address** - Where the request came from
- 📅 **Timestamp** - When it happened
- ✅ **Status** - Success or failed

## Where is the Data Stored?

Your passwords are stored in **MongoDB Atlas** (cloud database):
- **Database Name**: `password_change_db`
- **Collection Name**: `passwordchangeaudits`
- **Connection String**: In your `.env` file

## 3 Ways to View Your Passwords

### Method 1: Run the Viewer Script (Easiest) ✅

I created a script that shows all passwords in a nice format:

```bash
cd password-change-system
node view-audit-logs.js
```

This will display:
```
═══════════════════════════════════════════════════════════════════════
                        PASSWORD AUDIT LOGS
═══════════════════════════════════════════════════════════════════════

───────────────────────────────────── Record 1 ─────────────────────────
📅 Date & Time:    7/6/2026, 2:47:41 am
👤 User ID:        6a248e7530f61f757da066ce
🔓 OLD Password:   "Ruturaj28&"
🔐 NEW Password:   "Ruturaj282903"
🌐 IP Address:     ::1
✅ Status:         success
🔑 Request ID:     mq2uts07-n8l3foic
```

### Method 2: MongoDB Compass (Visual Tool)

1. **Download MongoDB Compass** (free): https://www.mongodb.com/products/compass
2. **Connect** using your connection string from `.env`:
   ```
   mongodb+srv://ruturajsonkamble29_db_user:XIv1UZ3qBylym0uS@cluster0.xoqhdno.mongodb.net/password_change_db
   ```
3. Navigate to: `password_change_db` → `passwordchangeaudits`
4. You'll see all records with `oldPasswordHash` and `newPasswordHash` fields

### Method 3: MongoDB Atlas Website

1. Go to https://cloud.mongodb.com/
2. Login with your account
3. Click on your cluster
4. Click **"Browse Collections"**
5. Select database: `password_change_db`
6. Select collection: `passwordchangeaudits`
7. You'll see all the password records

## Current Audit Logs

Based on the latest data, here are your password changes:

### ✅ Successful Password Changes:

1. **Most Recent** (7/6/2026, 2:47:41 am)
   - User: `user_1780780661001_g7m5wy`
   - Old Password: `Ruturaj28&`
   - New Password: `Ruturaj282903`

2. (7/6/2026, 2:44:58 am)
   - User: `user_1780780497902_ykt58p`
   - Old Password: `another_old_pass`
   - New Password: `another_new_pass`

3. (7/6/2026, 2:44:36 am)
   - User: `user_1780780475564_68npf9`
   - Old Password: `oldpass123`
   - New Password: `newpass456`

## Test It Yourself

Make a password change request:

```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "my_old_password_123",
    "newPassword": "my_new_password_456",
    "confirmPassword": "my_new_password_456"
  }'
```

Then run:
```bash
node view-audit-logs.js
```

You'll see your passwords saved as plaintext!

## Database Schema

Here's what each field means:

```javascript
{
  _id: ObjectId("..."),                    // Unique ID
  userId: "6a248e7530f61f757da066ce",      // The user who changed password
  oldPasswordHash: "Ruturaj28&",           // OLD password (plaintext!)
  newPasswordHash: "Ruturaj282903",        // NEW password (plaintext!)
  ip: "::1",                               // IP address (::1 = localhost)
  userAgent: "...",                        // Browser/client info
  status: "success",                       // success or failed
  changedAt: ISODate("2026-06-07T02:47:41.000Z"),  // When it happened
  requestId: "mq2uts07-n8l3foic"          // Unique request identifier
}
```

## ⚠️ Security Warning

Remember: Storing plaintext passwords is **EXTREMELY DANGEROUS** and should **NEVER** be done in real applications! This was only implemented because you specifically requested it for learning/testing purposes.

In production:
- ❌ Never store plaintext passwords
- ✅ Always hash passwords with bcrypt
- ✅ Never log passwords
- ✅ Use secure audit logging

## Quick Commands

View all passwords:
```bash
node view-audit-logs.js
```

Make a test password change:
```bash
# PowerShell
$body = @{
    oldPassword = "test_old"
    newPassword = "test_new"
    confirmPassword = "test_new"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/change-password" -Method POST -Body $body -ContentType "application/json"
```

Check server status:
```bash
curl http://localhost:3000/health
```
