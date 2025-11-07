/**
 * Password Changed Confirmation Email Template
 *
 * Sent to users after their password has been successfully changed.
 * Security notification to alert users of account changes.
 */

export interface PasswordChangedEmailParams {
  username: string;
}

export function generatePasswordChangedEmailTemplate(params: PasswordChangedEmailParams): string {
  const { username } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed - Rephlo</title>
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
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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
    .success-badge {
      display: inline-block;
      margin: 20px 0;
      padding: 12px 24px;
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 6px;
      color: #155724;
      font-weight: 600;
      font-size: 16px;
    }
    .security-notice {
      margin-top: 30px;
      padding: 20px;
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    .security-notice p {
      margin: 0 0 15px 0;
      font-size: 14px;
      color: #856404;
    }
    .security-notice p:last-child {
      margin-bottom: 0;
    }
    .security-notice a {
      color: #856404;
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
      color: #11998e;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .info-box {
      margin-top: 20px;
      padding: 15px;
      background-color: #d1ecf1;
      border-left: 4px solid #17a2b8;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0;
      font-size: 14px;
      color: #0c5460;
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
      <h1>✅ Password Changed Successfully</h1>
    </div>

    <div class="content">
      <p>Hi <strong>${username}</strong>,</p>

      <p>
        This email confirms that your Rephlo account password has been successfully changed.
      </p>

      <center>
        <div class="success-badge">
          🔒 Your account is secure
        </div>
      </center>

      <div class="info-box">
        <p>
          <strong>🕒 Changed on:</strong> ${new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          })}
        </p>
      </div>

      <div class="security-notice">
        <p>
          <strong>⚠️ Didn't change your password?</strong>
        </p>
        <p>
          If you did not make this change, your account may have been compromised.
          Please contact our support team immediately at
          <a href="mailto:support@rephlo.com">support@rephlo.com</a> to secure your account.
        </p>
      </div>

      <p style="margin-top: 30px;">
        For your security, we recommend:
      </p>
      <ul style="color: #555555; font-size: 14px; line-height: 1.8;">
        <li>Using a strong, unique password for your Rephlo account</li>
        <li>Enabling two-factor authentication (if available)</li>
        <li>Never sharing your password with anyone</li>
        <li>Regularly updating your password every 3-6 months</li>
      </ul>
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
