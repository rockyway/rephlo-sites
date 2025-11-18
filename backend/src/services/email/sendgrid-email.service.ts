/**
 * SendGrid Email Service Implementation
 *
 * Production-ready email service using SendGrid API.
 * Implements IEmailService interface for dependency injection.
 *
 * Features:
 * - Professional HTML email templates with branding
 * - Error handling with detailed logging
 * - Graceful fallback (logs errors but doesn't throw to prevent blocking user operations)
 * - Environment variable configuration
 *
 * Environment Variables Required:
 * - SENDGRID_API_KEY: SendGrid API key from dashboard
 * - EMAIL_FROM: Sender email address (verified in SendGrid)
 * - EMAIL_FROM_NAME: Sender display name
 * - FRONTEND_URL: Frontend URL for generating verification/reset links
 *
 * Reference: docs/plan/104-phase4-email-testing-completion.md
 */

import { injectable } from 'tsyringe';
import sgMail from '@sendgrid/mail';
import logger from '../../utils/logger';
import { IEmailService } from './email.service.interface';
import {
  generateVerificationEmailTemplate,
  VerificationEmailParams,
} from './templates/verification-email.template';
import {
  generatePasswordResetEmailTemplate,
  PasswordResetEmailParams,
} from './templates/password-reset-email.template';
import {
  generatePasswordChangedEmailTemplate,
  PasswordChangedEmailParams,
} from './templates/password-changed-email.template';
import {
  generateAccountDeactivatedEmailTemplate,
  AccountDeactivatedEmailParams,
} from './templates/account-deactivated-email.template';
import {
  generateAccountDeletedEmailTemplate,
  AccountDeletedEmailParams,
} from './templates/account-deleted-email.template';

@injectable()
export class SendGridEmailService implements IEmailService {
  private readonly isConfigured: boolean;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly frontendUrl: string;

  constructor() {
    // Initialize SendGrid API key
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      logger.warn('SendGridEmailService: SENDGRID_API_KEY not set. Email sending will be disabled.');
      this.isConfigured = false;
    } else {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
      logger.info('SendGridEmailService: Initialized successfully');
    }

    // Load email configuration from environment
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@rephlo.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Rephlo';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:7151';

    logger.debug('SendGridEmailService: Configuration loaded', {
      fromEmail: this.fromEmail,
      fromName: this.fromName,
      frontendUrl: this.frontendUrl,
      configured: this.isConfigured,
    });
  }

  /**
   * Send email verification link to new users
   */
  async sendVerificationEmail(email: string, token: string, username: string): Promise<void> {
    try {
      if (!this.isConfigured) {
        logger.warn('SendGridEmailService: Email not sent (not configured)', {
          to: email,
          type: 'verification',
        });
        return;
      }

      // Generate verification link
      const verificationLink = `${this.frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

      // Generate HTML email from template
      const htmlContent = generateVerificationEmailTemplate({
        username,
        verificationLink,
      } as VerificationEmailParams);

      // Prepare email message
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: 'Verify Your Email Address - Rephlo',
        html: htmlContent,
        text: this.generatePlainTextVerificationEmail(username, verificationLink),
      };

      // Send email via SendGrid
      await sgMail.send(msg);

      logger.info('SendGridEmailService: Verification email sent successfully', {
        to: email,
        username,
      });
    } catch (error) {
      // Log error but don't throw - email failures should not block user registration
      logger.error('SendGridEmailService: Failed to send verification email', {
        to: email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Send password reset link to users who forgot their password
   */
  async sendPasswordResetEmail(email: string, token: string, username: string): Promise<void> {
    try {
      if (!this.isConfigured) {
        logger.warn('SendGridEmailService: Email not sent (not configured)', {
          to: email,
          type: 'password_reset',
        });
        return;
      }

      // Generate password reset link
      const resetLink = `${this.frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

      // Generate HTML email from template
      const htmlContent = generatePasswordResetEmailTemplate({
        username,
        resetLink,
      } as PasswordResetEmailParams);

      // Prepare email message
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: 'Reset Your Password - Rephlo',
        html: htmlContent,
        text: this.generatePlainTextPasswordResetEmail(username, resetLink),
      };

      // Send email via SendGrid
      await sgMail.send(msg);

      logger.info('SendGridEmailService: Password reset email sent successfully', {
        to: email,
        username,
      });
    } catch (error) {
      // Log error but don't throw - email failures should not block password reset flow
      logger.error('SendGridEmailService: Failed to send password reset email', {
        to: email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Send confirmation email after password has been changed
   */
  async sendPasswordChangedEmail(email: string, username: string): Promise<void> {
    try {
      if (!this.isConfigured) {
        logger.warn('SendGridEmailService: Email not sent (not configured)', {
          to: email,
          type: 'password_changed',
        });
        return;
      }

      // Generate HTML email from template
      const htmlContent = generatePasswordChangedEmailTemplate({
        username,
      } as PasswordChangedEmailParams);

      // Prepare email message
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: 'Password Changed Successfully - Rephlo',
        html: htmlContent,
        text: this.generatePlainTextPasswordChangedEmail(username),
      };

      // Send email via SendGrid
      await sgMail.send(msg);

      logger.info('SendGridEmailService: Password changed email sent successfully', {
        to: email,
        username,
      });
    } catch (error) {
      // Log error but don't throw - email failures should not block password change
      logger.error('SendGridEmailService: Failed to send password changed email', {
        to: email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Send confirmation email when account is deactivated
   */
  async sendAccountDeactivatedEmail(email: string, username: string): Promise<void> {
    try {
      if (!this.isConfigured) {
        logger.warn('SendGridEmailService: Email not sent (not configured)', {
          to: email,
          type: 'account_deactivated',
        });
        return;
      }

      // Generate HTML email from template
      const htmlContent = generateAccountDeactivatedEmailTemplate({
        username,
      } as AccountDeactivatedEmailParams);

      // Prepare email message
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: 'Account Deactivated - Rephlo',
        html: htmlContent,
        text: this.generatePlainTextAccountDeactivatedEmail(username),
      };

      // Send email via SendGrid
      await sgMail.send(msg);

      logger.info('SendGridEmailService: Account deactivated email sent successfully', {
        to: email,
        username,
      });
    } catch (error) {
      // Log error but don't throw - email failures should not block account deactivation
      logger.error('SendGridEmailService: Failed to send account deactivated email', {
        to: email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Send confirmation email when account is deleted
   */
  async sendAccountDeletedEmail(email: string, username: string): Promise<void> {
    try {
      if (!this.isConfigured) {
        logger.warn('SendGridEmailService: Email not sent (not configured)', {
          to: email,
          type: 'account_deleted',
        });
        return;
      }

      // Generate HTML email from template
      const htmlContent = generateAccountDeletedEmailTemplate({
        username,
      } as AccountDeletedEmailParams);

      // Prepare email message
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: 'Account Deletion Scheduled - Rephlo',
        html: htmlContent,
        text: this.generatePlainTextAccountDeletedEmail(username),
      };

      // Send email via SendGrid
      await sgMail.send(msg);

      logger.info('SendGridEmailService: Account deleted email sent successfully', {
        to: email,
        username,
      });
    } catch (error) {
      // Log error but don't throw - email failures should not block account deletion
      logger.error('SendGridEmailService: Failed to send account deleted email', {
        to: email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  // =============================================================================
  // Plain Text Email Generation (Fallback for email clients without HTML support)
  // =============================================================================

  private generatePlainTextVerificationEmail(username: string, verificationLink: string): string {
    return `
Hi ${username},

Thank you for signing up for Rephlo! We're excited to have you on board.

To complete your registration and start using our platform, please verify your email address by clicking the link below:

${verificationLink}

This verification link will expire in 24 hours for security reasons.

If you didn't create an account with Rephlo, you can safely ignore this email.

---
Rephlo - Advanced AI-Powered Text Processing
Questions? Contact us at support@rephlo.com
    `.trim();
  }

  private generatePlainTextPasswordResetEmail(username: string, resetLink: string): string {
    return `
Hi ${username},

We received a request to reset your password for your Rephlo account.

Click the link below to create a new password:

${resetLink}

This password reset link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

---
Rephlo - Advanced AI-Powered Text Processing
Questions? Contact us at support@rephlo.com
    `.trim();
  }

  private generatePlainTextPasswordChangedEmail(username: string): string {
    return `
Hi ${username},

This email confirms that your Rephlo account password has been successfully changed.

If you did not make this change, your account may have been compromised. Please contact our support team immediately at support@rephlo.com to secure your account.

---
Rephlo - Advanced AI-Powered Text Processing
Questions? Contact us at support@rephlo.com
    `.trim();
  }

  private generatePlainTextAccountDeactivatedEmail(username: string): string {
    return `
Hi ${username},

Your Rephlo account has been successfully deactivated as requested. We're sorry to see you go!

What happens now:
- You will no longer be able to log in to your account
- Your data is securely stored and not accessible to others
- Active subscriptions will be canceled (no further charges)
- Your account can be reactivated at any time

Want to reactivate? Contact our support team at support@rephlo.com and we'll restore your account with all your data intact.

Thank you for being part of the Rephlo community. We hope to see you again in the future!

---
Rephlo - Advanced AI-Powered Text Processing
Questions? Contact us at support@rephlo.com
    `.trim();
  }

  private generatePlainTextAccountDeletedEmail(username: string): string {
    return `
Hi ${username},

This email confirms that your Rephlo account deletion request has been received and scheduled for processing.

IMPORTANT: What will be deleted:
- Your profile information and account data
- All saved preferences and settings
- Usage history and analytics
- API keys and access tokens
- All associated content and files

Deletion Timeline:
1. Today: Your account is immediately deactivated. You can no longer log in.
2. Next 30 days: Your data is retained in our secure backup systems. You can still recover your account.
3. After 30 days: All your data is permanently deleted from our systems and cannot be recovered.

Changed your mind? You have 30 days to cancel the deletion and recover your account. Contact our support team at support@rephlo.com within this period to restore your account with all your data intact.

Thank you for being part of Rephlo. We wish you all the best!

---
Rephlo - Advanced AI-Powered Text Processing
Questions? Contact us at support@rephlo.com
    `.trim();
  }

  // =============================================================================
  // Plan 192: Billing & Refund Email Methods
  // =============================================================================

  /**
   * Send billing reminder 3 days before charge date
   */
  async sendBillingReminderEmail(
    email: string,
    username: string,
    dueDate: Date,
    amount: number,
    tier: string
  ): Promise<void> {
    try {
      if (!this.isConfigured) {
        logger.warn('SendGridEmailService: Email not sent (not configured)', {
          to: email,
          type: 'billing_reminder',
        });
        return;
      }

      const subject = `Billing Reminder: Your ${tier} subscription renews on ${dueDate.toLocaleDateString()}`;
      const text = `Hi ${username},\n\nYour ${tier} subscription will renew on ${dueDate.toLocaleDateString()} for $${amount.toFixed(2)}.\n\nIf you have any questions or want to make changes to your subscription, please visit your account dashboard.\n\nThank you for using Rephlo!\n\n---\nRephlo Team\nsupport@rephlo.com`;

      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        text,
        html: `<p>Hi ${username},</p><p>Your <strong>${tier}</strong> subscription will renew on <strong>${dueDate.toLocaleDateString()}</strong> for <strong>$${amount.toFixed(2)}</strong>.</p><p>If you have any questions or want to make changes to your subscription, please visit your account dashboard.</p><p>Thank you for using Rephlo!</p>`,
      };

      await sgMail.send(msg);

      logger.info('SendGridEmailService: Billing reminder email sent successfully', {
        to: email,
        username,
        tier,
        amount,
      });
    } catch (error) {
      logger.error('SendGridEmailService: Failed to send billing reminder email', {
        to: email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send cancellation confirmation
   */
  async sendCancellationConfirmationEmail(
    email: string,
    username: string,
    cancelAtPeriodEnd: boolean,
    periodEndDate?: Date
  ): Promise<void> {
    try {
      if (!this.isConfigured) {
        logger.warn('SendGridEmailService: Email not sent (not configured)', {
          to: email,
          type: 'cancellation_confirmation',
        });
        return;
      }

      const subject = 'Subscription Cancellation Confirmed - Rephlo';
      let text: string;
      let html: string;

      if (cancelAtPeriodEnd && periodEndDate) {
        text = `Hi ${username},\n\nYour subscription cancellation has been confirmed. Your subscription will remain active until ${periodEndDate.toLocaleDateString()}, after which it will be cancelled.\n\nYou can reactivate your subscription at any time before this date.\n\nThank you for using Rephlo!\n\n---\nRephlo Team\nsupport@rephlo.com`;
        html = `<p>Hi ${username},</p><p>Your subscription cancellation has been confirmed. Your subscription will remain active until <strong>${periodEndDate.toLocaleDateString()}</strong>, after which it will be cancelled.</p><p>You can reactivate your subscription at any time before this date.</p><p>Thank you for using Rephlo!</p>`;
      } else {
        text = `Hi ${username},\n\nYour subscription has been cancelled immediately and is no longer active.\n\nThank you for using Rephlo. We hope to see you again in the future!\n\n---\nRephlo Team\nsupport@rephlo.com`;
        html = `<p>Hi ${username},</p><p>Your subscription has been cancelled immediately and is no longer active.</p><p>Thank you for using Rephlo. We hope to see you again in the future!</p>`;
      }

      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        text,
        html,
      };

      await sgMail.send(msg);

      logger.info('SendGridEmailService: Cancellation confirmation email sent successfully', {
        to: email,
        username,
        cancelAtPeriodEnd,
      });
    } catch (error) {
      logger.error('SendGridEmailService: Failed to send cancellation confirmation email', {
        to: email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send refund confirmation
   */
  async sendRefundConfirmationEmail(
    email: string,
    username: string,
    refundAmount: number,
    refundDate: Date
  ): Promise<void> {
    try {
      if (!this.isConfigured) {
        logger.warn('SendGridEmailService: Email not sent (not configured)', {
          to: email,
          type: 'refund_confirmation',
        });
        return;
      }

      const subject = 'Refund Processed - Rephlo';
      const text = `Hi ${username},\n\nYour refund of $${refundAmount.toFixed(2)} has been processed on ${refundDate.toLocaleDateString()}.\n\nPlease allow 5-10 business days for the refund to appear in your account, depending on your bank or card issuer.\n\nIf you have any questions, please contact our support team.\n\nThank you for using Rephlo!\n\n---\nRephlo Team\nsupport@rephlo.com`;
      const html = `<p>Hi ${username},</p><p>Your refund of <strong>$${refundAmount.toFixed(2)}</strong> has been processed on <strong>${refundDate.toLocaleDateString()}</strong>.</p><p>Please allow 5-10 business days for the refund to appear in your account, depending on your bank or card issuer.</p><p>If you have any questions, please contact our support team.</p><p>Thank you for using Rephlo!</p>`;

      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        text,
        html,
      };

      await sgMail.send(msg);

      logger.info('SendGridEmailService: Refund confirmation email sent successfully', {
        to: email,
        username,
        refundAmount,
      });
    } catch (error) {
      logger.error('SendGridEmailService: Failed to send refund confirmation email', {
        to: email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send proration charge notification
   */
  async sendProrationChargeEmail(
    email: string,
    username: string,
    fromTier: string,
    toTier: string,
    chargeAmount: number,
    invoiceUrl: string
  ): Promise<void> {
    try {
      if (!this.isConfigured) {
        logger.warn('SendGridEmailService: Email not sent (not configured)', {
          to: email,
          type: 'proration_charge',
        });
        return;
      }

      const subject = `Tier Change Invoice: ${fromTier} → ${toTier} - Rephlo`;
      const text = `Hi ${username},\n\nYour subscription tier has been changed from ${fromTier} to ${toTier}.\n\nA prorated charge of $${chargeAmount.toFixed(2)} has been applied to your account for the remaining billing period.\n\nView your invoice: ${invoiceUrl}\n\nThank you for using Rephlo!\n\n---\nRephlo Team\nsupport@rephlo.com`;
      const html = `<p>Hi ${username},</p><p>Your subscription tier has been changed from <strong>${fromTier}</strong> to <strong>${toTier}</strong>.</p><p>A prorated charge of <strong>$${chargeAmount.toFixed(2)}</strong> has been applied to your account for the remaining billing period.</p><p><a href="${invoiceUrl}" style="color: #2563EB; text-decoration: underline;">View your invoice</a></p><p>Thank you for using Rephlo!</p>`;

      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject,
        text,
        html,
      };

      await sgMail.send(msg);

      logger.info('SendGridEmailService: Proration charge email sent successfully', {
        to: email,
        username,
        fromTier,
        toTier,
        chargeAmount,
      });
    } catch (error) {
      logger.error('SendGridEmailService: Failed to send proration charge email', {
        to: email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
