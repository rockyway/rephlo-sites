/**
 * Account Deactivated Email Template
 *
 * Sent to users when they deactivate their account.
 * Provides information about reactivation and data retention.
 */

export interface AccountDeactivatedEmailParams {
  username: string;
}

export function generateAccountDeactivatedEmailTemplate(params: AccountDeactivatedEmailParams): string {
  const { username } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deactivated - Rephlo</title>
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
      background: linear-gradient(135deg, #FFA500 0%, #FF6347 100%);
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
    .info-box {
      margin: 30px 0;
      padding: 20px;
      background-color: #d1ecf1;
      border-left: 4px solid #17a2b8;
      border-radius: 4px;
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      color: #0c5460;
      font-size: 16px;
    }
    .info-box p {
      margin: 0;
      font-size: 14px;
      color: #0c5460;
      line-height: 1.6;
    }
    .info-box ul {
      margin: 10px 0 0 0;
      padding-left: 20px;
      color: #0c5460;
    }
    .info-box li {
      font-size: 14px;
      margin-bottom: 8px;
    }
    .reactivation-box {
      margin-top: 30px;
      padding: 20px;
      background-color: #d4edda;
      border-left: 4px solid #28a745;
      border-radius: 4px;
    }
    .reactivation-box h3 {
      margin: 0 0 10px 0;
      color: #155724;
      font-size: 16px;
    }
    .reactivation-box p {
      margin: 0;
      font-size: 14px;
      color: #155724;
    }
    .reactivation-box a {
      color: #155724;
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
      color: #FFA500;
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
      <h1>👋 Account Deactivated</h1>
    </div>

    <div class="content">
      <p>Hi <strong>${username}</strong>,</p>

      <p>
        Your Rephlo account has been successfully deactivated as requested.
        We're sorry to see you go!
      </p>

      <div class="info-box">
        <h3>📋 What Happens Now?</h3>
        <ul>
          <li>You will no longer be able to log in to your account</li>
          <li>Your data is securely stored and not accessible to others</li>
          <li>Active subscriptions will be canceled (no further charges)</li>
          <li>Your account can be reactivated at any time</li>
        </ul>
      </div>

      <div class="reactivation-box">
        <h3>🔄 Want to Reactivate?</h3>
        <p>
          Changed your mind? You can reactivate your account at any time by contacting our support team at
          <a href="mailto:support@rephlo.com">support@rephlo.com</a>.
          All your data will be restored.
        </p>
      </div>

      <p style="margin-top: 30px;">
        <strong>We'd love your feedback!</strong> If you have a moment, please let us know why you decided to deactivate your account.
        Your input helps us improve Rephlo for everyone.
      </p>

      <p>
        Thank you for being part of the Rephlo community. We hope to see you again in the future!
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
