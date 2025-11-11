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
}
