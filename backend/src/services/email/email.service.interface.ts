/**
 * Email Service Interface
 *
 * Abstraction layer for email delivery services.
 * Allows swapping email providers (SendGrid, Mailgun, AWS SES, etc.) without changing business logic.
 *
 * All email methods should:
 * - Return Promise<void> and throw errors on failure
 * - Accept user-friendly parameters (email, username, token)
 * - Handle HTML template rendering internally
 * - Log email delivery status
 *
 * Reference: docs/plan/104-phase4-email-testing-completion.md
 */

export interface IEmailService {
  /**
   * Send email verification link to new users
   *
   * @param email - Recipient email address
   * @param token - Verification token (not hashed)
   * @param username - User's display name
   * @throws Error if email delivery fails
   */
  sendVerificationEmail(email: string, token: string, username: string): Promise<void>;

  /**
   * Send password reset link to users who forgot their password
   *
   * @param email - Recipient email address
   * @param token - Password reset token (not hashed)
   * @param username - User's display name
   * @throws Error if email delivery fails
   */
  sendPasswordResetEmail(email: string, token: string, username: string): Promise<void>;

  /**
   * Send confirmation email after password has been changed
   *
   * @param email - Recipient email address
   * @param username - User's display name
   * @throws Error if email delivery fails
   */
  sendPasswordChangedEmail(email: string, username: string): Promise<void>;

  /**
   * Send confirmation email when account is deactivated
   *
   * @param email - Recipient email address
   * @param username - User's display name
   * @throws Error if email delivery fails
   */
  sendAccountDeactivatedEmail(email: string, username: string): Promise<void>;

  /**
   * Send confirmation email when account is deleted
   *
   * @param email - Recipient email address
   * @param username - User's display name
   * @throws Error if email delivery fails
   */
  sendAccountDeletedEmail(email: string, username: string): Promise<void>;

  // ========================================================================
  // Plan 192: Billing & Refund Emails
  // ========================================================================

  /**
   * Send billing reminder 3 days before charge date
   *
   * @param email - Recipient email address
   * @param username - User's display name
   * @param dueDate - Date when billing will occur
   * @param amount - Billing amount in USD
   * @param tier - Subscription tier
   * @throws Error if email delivery fails
   */
  sendBillingReminderEmail(
    email: string,
    username: string,
    dueDate: Date,
    amount: number,
    tier: string
  ): Promise<void>;

  /**
   * Send cancellation confirmation
   *
   * @param email - Recipient email address
   * @param username - User's display name
   * @param cancelAtPeriodEnd - If true, subscription remains active until period end
   * @param periodEndDate - Optional period end date (if cancelAtPeriodEnd is true)
   * @throws Error if email delivery fails
   */
  sendCancellationConfirmationEmail(
    email: string,
    username: string,
    cancelAtPeriodEnd: boolean,
    periodEndDate?: Date
  ): Promise<void>;

  /**
   * Send refund confirmation
   *
   * @param email - Recipient email address
   * @param username - User's display name
   * @param refundAmount - Refund amount in USD
   * @param refundDate - Date when refund was processed
   * @throws Error if email delivery fails
   */
  sendRefundConfirmationEmail(
    email: string,
    username: string,
    refundAmount: number,
    refundDate: Date
  ): Promise<void>;

  /**
   * Send proration charge notification
   *
   * @param email - Recipient email address
   * @param username - User's display name
   * @param fromTier - Original subscription tier
   * @param toTier - New subscription tier
   * @param chargeAmount - Proration charge amount in USD
   * @param invoiceUrl - Stripe invoice URL
   * @throws Error if email delivery fails
   */
  sendProrationChargeEmail(
    email: string,
    username: string,
    fromTier: string,
    toTier: string,
    chargeAmount: number,
    invoiceUrl: string
  ): Promise<void>;
}
