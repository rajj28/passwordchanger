/**
 * Email Service
 * Resend integration with Instagram-style HTML template
 */

import { Resend } from 'resend';
import { IPasswordChangeEmailData } from '../types';
import { logInfo, logError } from '../utils/logger';

// ============================================
// Resend Client
// ============================================

let resendClient: Resend | null = null;

export async function initializeEmailService(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logInfo('RESEND_API_KEY not set - email service disabled');
    return;
  }
  resendClient = new Resend(apiKey);
  logInfo('Email service (Resend) initialized successfully');
}

function getClient(): Resend {
  if (!resendClient) throw new Error('Email service not initialized');
  return resendClient;
}

// ============================================
// Instagram-style Email Template
// ============================================

function generatePasswordChangeEmail(data: IPasswordChangeEmailData): string {
  const { username, changedAt, ipAddress } = data;
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(changedAt);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Changed</title>
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #dbdbdb;border-radius:8px;padding:40px;">
          
          <!-- Instagram Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="width:72px;height:72px;background:linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);border-radius:18px;display:inline-flex;align-items:center;justify-content:center;">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom:8px;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#262626;">Your password was changed</h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:16px 0;font-size:14px;color:#262626;line-height:1.6;">
              <p style="margin:0 0 12px 0;">Hi <strong>@${username}</strong>,</p>
              <p style="margin:0;">Your Instagram password was successfully changed on <strong>${formattedDate}</strong>.</p>
            </td>
          </tr>

          <!-- Info box -->
          <tr>
            <td style="padding:16px;background:#fafafa;border:1px solid #dbdbdb;border-radius:4px;margin:16px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px;font-weight:600;color:#8e8e8e;width:110px;">Changed at:</td>
                  <td style="font-size:12px;color:#262626;">${formattedDate}</td>
                </tr>
                <tr><td colspan="2" style="height:8px;"></td></tr>
                <tr>
                  <td style="font-size:12px;font-weight:600;color:#8e8e8e;">IP address:</td>
                  <td style="font-size:12px;color:#262626;font-family:monospace;">${ipAddress}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding:16px;background:#fffbe6;border:1px solid #ffe58f;border-radius:4px;font-size:13px;color:#ad6800;margin:16px 0;">
              <strong>Didn't do this?</strong><br/>
              If you didn't change your password, 
              <a href="https://www.instagram.com/accounts/password/reset/" style="color:#d48806;">reset it immediately</a>.
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:24px 0 0 0;">
              <a href="https://www.instagram.com" style="display:inline-block;background:#0095f6;color:#fff;text-decoration:none;padding:12px 32px;border-radius:4px;font-size:14px;font-weight:600;">Go to Instagram</a>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="height:1px;background:#dbdbdb;margin:24px 0;"></td></tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;font-size:12px;color:#8e8e8e;line-height:1.6;">
              <p style="margin:0;">© ${new Date().getFullYear()} Instagram from Meta</p>
              <p style="margin:0;">1601 Willow Road, Menlo Park, CA 94025</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generatePasswordChangeText(data: IPasswordChangeEmailData): string {
  const { username, changedAt, ipAddress } = data;
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(changedAt);

  return `Hi @${username},

Your Instagram password was changed on ${formattedDate}.

Details:
- Changed at: ${formattedDate}
- IP address: ${ipAddress}

Didn't do this? Reset your password immediately:
https://www.instagram.com/accounts/password/reset/

© ${new Date().getFullYear()} Instagram from Meta`.trim();
}

// ============================================
// Send Email
// ============================================

export async function sendPasswordChangeEmail(
  to: string,
  data: IPasswordChangeEmailData
): Promise<void> {
  if (!resendClient) {
    logInfo('Email service not configured, skipping email');
    return;
  }

  const client = getClient();

  try {
    const { error } = await client.emails.send({
      from: process.env.EMAIL_FROM || 'Instagram <noreply@dripbazaar.studio>',
      to,
      subject: 'Your Instagram password was changed',
      html: generatePasswordChangeEmail(data),
      text: generatePasswordChangeText(data),
    });

    if (error) throw new Error(error.message);

    logInfo('Password change email sent via Resend', {
      to: to.replace(/(?<=.{3}).*?(?=@)/, '***'),
      username: data.username,
    });
  } catch (error) {
    logError('Failed to send password change email', error as Error);
    throw error;
  }
}

// ============================================
// Health Check
// ============================================

export async function isEmailServiceHealthy(): Promise<boolean> {
  return resendClient !== null;
}
