/**
 * Email Verification Template
 *
 * Sent to new users after registration to verify their email address.
 * Includes verification link with token that expires in 24 hours.
 */

export interface VerificationEmailParams {
  username: string;
  verificationLink: string;
}

export function generateVerificationEmailTemplate(params: VerificationEmailParams): string {
  const { username, verificationLink } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Rephlo</title>
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    .cta-button {
      display: inline-block;
      margin: 30px 0;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      transition: transform 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .alternative-link {
      margin-top: 30px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .alternative-link p {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666666;
    }
    .alternative-link code {
      display: block;
      padding: 10px;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 12px;
      color: #333333;
      word-break: break-all;
      font-family: 'Courier New', monospace;
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
      color: #667eea;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .expiry-notice {
      margin-top: 20px;
      padding: 15px;
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    .expiry-notice p {
      margin: 0;
      font-size: 14px;
      color: #856404;
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
      .cta-button {
        display: block;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Rephlo!</h1>
    </div>

    <div class="content">
      <p>Hi <strong>${username}</strong>,</p>

      <p>
        Thank you for signing up for Rephlo! We're excited to have you on board.
        To complete your registration and start using our platform, please verify your email address.
      </p>

      <center>
        <a href="${verificationLink}" class="cta-button">Verify Email Address</a>
      </center>

      <div class="expiry-notice">
        <p>
          <strong>⏰ Note:</strong> This verification link will expire in 24 hours for security reasons.
        </p>
      </div>

      <div class="alternative-link">
        <p><strong>Can't click the button?</strong> Copy and paste this link into your browser:</p>
        <code>${verificationLink}</code>
      </div>

      <p style="margin-top: 30px;">
        If you didn't create an account with Rephlo, you can safely ignore this email.
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
