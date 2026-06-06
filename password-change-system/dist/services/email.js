"use strict";
/**
 * Email Service
 * Nodemailer integration with HTML templates
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEmailService = initializeEmailService;
exports.sendPasswordChangeEmail = sendPasswordChangeEmail;
exports.isEmailServiceHealthy = isEmailServiceHealthy;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
// ============================================
// Transporter Setup
// ============================================
let transporter = null;
/**
 * Initialize email transporter
 */
async function initializeEmailService() {
    try {
        transporter = nodemailer_1.default.createTransport({
            host: config_1.config.email.host,
            port: config_1.config.email.port,
            secure: config_1.config.email.secure,
            auth: config_1.config.email.auth,
            pool: true, // Use connection pooling
            maxConnections: 5,
            maxMessages: 100,
            rateDelta: 1000,
            rateLimit: 5,
        });
        // Verify connection
        if (transporter) {
            await transporter.verify();
        }
        (0, logger_1.logInfo)('Email service initialized successfully');
    }
    catch (error) {
        (0, logger_1.logError)('Failed to initialize email service', error);
        throw error;
    }
}
/**
 * Get email transporter (ensure initialized)
 */
function getTransporter() {
    if (!transporter) {
        throw new Error('Email service not initialized');
    }
    return transporter;
}
// ============================================
// Email Templates
// ============================================
/**
 * Generate password change notification email HTML
 * Instagram-style transactional email
 */
function generatePasswordChangeEmail(data) {
    const { username, changedAt, ipAddress } = data;
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
    }).format(changedAt);
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 20px !important; }
      .content { padding: 20px !important; }
      .logo { width: 60px !important; height: 60px !important; }
    }
    
    body {
      margin: 0;
      padding: 0;
      background-color: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .content {
      background: #ffffff;
      border: 1px solid #dbdbdb;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 24px;
      background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .logo svg {
      width: 50px;
      height: 50px;
      fill: white;
    }
    
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #262626;
      margin: 0 0 16px 0;
    }
    
    p {
      font-size: 14px;
      line-height: 1.5;
      color: #262626;
      margin: 0 0 16px 0;
    }
    
    .info-box {
      background: #fafafa;
      border: 1px solid #dbdbdb;
      border-radius: 4px;
      padding: 16px;
      margin: 24px 0;
      text-align: left;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    
    .info-row:last-child {
      margin-bottom: 0;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #8e8e8e;
      width: 100px;
      flex-shrink: 0;
    }
    
    .info-value {
      font-size: 12px;
      color: #262626;
      font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
    }
    
    .button {
      display: inline-block;
      background: #0095f6;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      margin: 16px 0;
    }
    
    .button:hover {
      background: #0081d6;
    }
    
    .divider {
      height: 1px;
      background: #dbdbdb;
      margin: 24px 0;
    }
    
    .footer {
      font-size: 12px;
      color: #8e8e8e;
      margin-top: 24px;
    }
    
    .footer p {
      font-size: 12px;
      color: #8e8e8e;
      margin: 4px 0;
    }
    
    .warning {
      background: #fffbe6;
      border: 1px solid #ffe58f;
      border-radius: 4px;
      padding: 12px;
      margin: 16px 0;
      font-size: 13px;
      color: #ad6800;
    }
    
    .warning strong {
      color: #d48806;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <div class="logo">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      </div>
      
      <h1>Your password was changed</h1>
      
      <p>Hi @${username},</p>
      
      <p>The password for your Instagram account was changed on <strong>${formattedDate}</strong>.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Changed at:</span>
          <span class="info-value">${formattedDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">IP address:</span>
          <span class="info-value">${ipAddress}</span>
        </div>
      </div>
      
      <div class="warning">
        <strong>Didn't do this?</strong><br>
        If you didn't change your password, <a href="https://www.instagram.com/accounts/password/reset/" style="color: #d48806; text-decoration: underline;">reset it now</a> or contact us immediately.
      </div>
      
      <a href="https://www.instagram.com/accounts/login/" class="button">Go to Instagram</a>
      
      <div class="divider"></div>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} Instagram from Meta</p>
        <p>Menlo Park, CA 94025</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
/**
 * Generate plain text version for email clients that don't support HTML
 */
function generatePasswordChangeText(data) {
    const { username, changedAt, ipAddress } = data;
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
    }).format(changedAt);
    return `
Your Instagram password was changed

Hi @${username},

The password for your Instagram account was changed on ${formattedDate}.

Details:
- Changed at: ${formattedDate}
- IP address: ${ipAddress}

Didn't do this?
If you didn't change your password, reset it now at https://www.instagram.com/accounts/password/reset/ or contact us immediately.

Go to Instagram: https://www.instagram.com/accounts/login/

© ${new Date().getFullYear()} Instagram from Meta
Menlo Park, CA 94025
  `.trim();
}
// ============================================
// Email Sending Functions
// ============================================
/**
 * Send password change notification email
 */
async function sendPasswordChangeEmail(to, data) {
    const transport = getTransporter();
    const html = generatePasswordChangeEmail(data);
    const text = generatePasswordChangeText(data);
    const mailOptions = {
        from: `"${config_1.config.email.fromName}" <${config_1.config.email.from}>`,
        to,
        subject: 'Your Instagram password was changed',
        text,
        html,
        headers: {
            'X-Priority': '1',
            'X-Mailer': 'Instagram Password Change System',
        },
    };
    try {
        const info = await transport.sendMail(mailOptions);
        (0, logger_1.logInfo)('Password change email sent', {
            messageId: info.messageId,
            to: to.replace(/(?<=.{3}).*?(?=@)/, '***'), // Mask email for logging
            username: data.username,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to send password change email', error, {
            to: to.replace(/(?<=.{3}).*?(?=@)/, '***'),
            username: data.username,
        });
        // Re-throw to allow caller to handle (password change succeeds even if email fails)
        throw error;
    }
}
// ============================================
// Health Check
// ============================================
/**
 * Check if email service is healthy
 */
async function isEmailServiceHealthy() {
    if (!transporter) {
        return false;
    }
    try {
        await transporter.verify();
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=email.js.map