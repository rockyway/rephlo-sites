/**
 * Account Deleted Email Template
 *
 * Sent to users when they permanently delete their account.
 * Provides information about data retention policy and final confirmation.
 */

export interface AccountDeletedEmailParams {
  username: string;
}

export function generateAccountDeletedEmailTemplate(params: AccountDeletedEmailParams): string {
  const { username } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deletion Scheduled - Rephlo</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #f85032 0%, #e73827 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content p {
      margin: 0 0 20px 0;
      font-size: 16px;
      color: #555555;
    }
    .warning-box {
      margin: 30px 0;
      padding: 20px;
      background-color: #f8d7da;
      border-left: 4px solid #dc3545;
      border-radius: 4px;
    }
    .warning-box h3 {
      margin: 0 0 10px 0;
      color: #721c24;
      font-size: 16px;
    }
    .warning-box p {
      margin: 0;
      font-size: 14px;
      color: #721c24;
      line-height: 1.6;
    }
    .warning-box ul {
      margin: 10px 0 0 0;
      padding-left: 20px;
      color: #721c24;
    }
    .warning-box li {
      font-size: 14px;
      margin-bottom: 8px;
    }
    .timeline-box {
      margin-top: 30px;
      padding: 20px;
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    .timeline-box h3 {
      margin: 0 0 15px 0;
      color: #856404;
      font-size: 16px;
    }
    .timeline-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    .timeline-item:last-child {
      margin-bottom: 0;
    }
    .timeline-icon {
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      background-color: #ffc107;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      font-weight: 600;
      color: #856404;
    }
    .timeline-content {
      flex: 1;
    }
    .timeline-content p {
      margin: 0;
      font-size: 14px;
      color: #856404;
    }
    .recovery-box {
      margin-top: 30px;
      padding: 20px;
      background-color: #d1ecf1;
      border-left: 4px solid #17a2b8;
      border-radius: 4px;
    }
    .recovery-box h3 {
      margin: 0 0 10px 0;
      color: #0c5460;
      font-size: 16px;
    }
    .recovery-box p {
      margin: 0;
      font-size: 14px;
      color: #0c5460;
    }
    .recovery-box a {
      color: #0c5460;
      font-weight: 600;
      text-decoration: underline;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background-color: #f8f9fa;
      border-top: 1px solid #e0e0e0;
    }
    .footer p {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #999999;
    }
    .footer a {
      color: #f85032;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 20px 10px;
      }
      .content {
        padding: 30px 20px;
      }
      .header h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗑️ Account Deletion Scheduled</h1>
    </div>

    <div class="content">
      <p>Hi <strong>${username}</strong>,</p>

      <p>
        This email confirms that your Rephlo account deletion request has been received and scheduled for processing.
      </p>

      <div class="warning-box">
        <h3>⚠️ Important: What Will Be Deleted</h3>
        <ul>
          <li>Your profile information and account data</li>
          <li>All saved preferences and settings</li>
          <li>Usage history and analytics</li>
          <li>API keys and access tokens</li>
          <li>All associated content and files</li>
        </ul>
        <p style="margin-top: 15px;">
          <strong>This action cannot be undone after the 30-day grace period.</strong>
        </p>
      </div>

      <div class="timeline-box">
        <h3>⏱️ Deletion Timeline</h3>

        <div class="timeline-item">
          <div class="timeline-icon">1</div>
          <div class="timeline-content">
            <p><strong>Today:</strong> Your account is immediately deactivated. You can no longer log in.</p>
          </div>
        </div>

        <div class="timeline-item">
          <div class="timeline-icon">2</div>
          <div class="timeline-content">
            <p><strong>Next 30 days:</strong> Your data is retained in our secure backup systems. You can still recover your account.</p>
          </div>
        </div>

        <div class="timeline-item">
          <div class="timeline-icon">3</div>
          <div class="timeline-content">
            <p><strong>After 30 days:</strong> All your data is permanently deleted from our systems and cannot be recovered.</p>
          </div>
        </div>
      </div>

      <div class="recovery-box">
        <h3>🔄 Changed Your Mind?</h3>
        <p>
          You have <strong>30 days</strong> to cancel the deletion and recover your account.
          Contact our support team at <a href="mailto:support@rephlo.com">support@rephlo.com</a> within this period to restore your account with all your data intact.
        </p>
      </div>

      <p style="margin-top: 30px;">
        <strong>We're sad to see you go.</strong> If you'd like to share why you decided to leave, we'd greatly appreciate your feedback.
        It helps us improve Rephlo for our community.
      </p>

      <p>
        Thank you for being part of Rephlo. We wish you all the best!
      </p>
    </div>

    <div class="footer">
      <p><strong>Rephlo</strong> - Advanced AI-Powered Text Processing</p>
      <p>
        Questions? Contact us at <a href="mailto:support@rephlo.com">support@rephlo.com</a>
      </p>
      <p style="margin-top: 20px; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Rephlo. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
