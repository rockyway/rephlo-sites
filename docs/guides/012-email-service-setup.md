# Email Service Setup Guide

**Document Number**: 012
**Created**: 2025-11-07
**Status**: Active
**Category**: Configuration Guide

## Overview

This guide explains how to set up and configure the SendGrid email service for the Rephlo authentication system. The email service is used to send transactional emails including:

- Email verification links (after registration)
- Password reset links
- Password change confirmations
- Account deactivation confirmations
- Account deletion confirmations

## Prerequisites

- SendGrid account (free tier is sufficient for development)
- Verified sender email address in SendGrid
- Backend application running

## Setup Steps

### 1. Create SendGrid Account

1. Visit [SendGrid](https://sendgrid.com/) and create a free account
2. Complete email verification for your account
3. Log in to the [SendGrid Dashboard](https://app.sendgrid.com/)

### 2. Verify Sender Email Address

Before you can send emails, you must verify your sender email address:

#### Option A: Single Sender Verification (Recommended for Development)

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Name**: `Rephlo`
   - **From Email Address**: `noreply@rephlo.com` (or your domain)
   - **Reply To**: Your support email
   - Company information (required)
4. Click **Create**
5. Check your email inbox and verify the sender address

#### Option B: Domain Authentication (Recommended for Production)

1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Follow the wizard to add DNS records to your domain
4. Wait for DNS propagation (can take up to 48 hours)
5. Verify domain authentication is successful

### 3. Generate API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Configure the key:
   - **API Key Name**: `Rephlo Backend - Development` (or similar)
   - **API Key Permissions**: Select **Restricted Access**
   - Enable only: **Mail Send** → **Full Access**
4. Click **Create & View**
5. **IMPORTANT**: Copy the API key immediately (it will only be shown once)
6. Store it securely (you'll add it to `.env` in the next step)

### 4. Configure Environment Variables

1. Open your backend `.env` file (create from `.env.example` if needed):

```bash
cd backend
cp .env.example .env
```

2. Add your SendGrid configuration:

```env
# SendGrid Email Service Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@rephlo.com
EMAIL_FROM_NAME=Rephlo
FRONTEND_URL=http://localhost:5173
```

**Configuration Details**:

- `SENDGRID_API_KEY`: Your SendGrid API key from step 3
- `EMAIL_FROM`: Must match the verified sender email from step 2
- `EMAIL_FROM_NAME`: Display name shown in email clients
- `FRONTEND_URL`: Your frontend URL for verification/reset links

### 5. Restart Backend Server

After updating environment variables, restart your backend server:

```bash
cd backend
npm run dev
```

Check the logs for successful email service initialization:

```
[INFO] SendGridEmailService: Initialized successfully
[INFO] DI Container: Core services registered
```

## Testing Email Delivery

### Test Registration Email

1. Register a new user via API:

```bash
curl -X POST http://localhost:7150/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "username": "testuser",
    "firstName": "Test",
    "lastName": "User",
    "acceptedTerms": true
  }'
```

2. Check your email inbox for the verification email
3. Check backend logs for email delivery confirmation:

```
[INFO] SendGridEmailService: Verification email sent successfully
```

### Test Password Reset Email

1. Request password reset:

```bash
curl -X POST http://localhost:7150/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

2. Check email inbox for reset link
3. Check logs for confirmation

### View Sent Emails in SendGrid

1. Go to **Activity** in SendGrid Dashboard
2. View email delivery status, opens, clicks, etc.
3. Debug any delivery issues

## Email Templates

The system includes 5 professionally designed HTML email templates:

1. **Verification Email** (`verification-email.template.ts`)
   - Sent after user registration
   - Contains email verification link
   - Expires in 24 hours

2. **Password Reset Email** (`password-reset-email.template.ts`)
   - Sent when user requests password reset
   - Contains password reset link
   - Expires in 1 hour

3. **Password Changed Email** (`password-changed-email.template.ts`)
   - Sent after successful password change
   - Security notification
   - No action required

4. **Account Deactivated Email** (`account-deactivated-email.template.ts`)
   - Sent when user deactivates account
   - Includes reactivation instructions
   - Data retained for reactivation

5. **Account Deleted Email** (`account-deleted-email.template.ts`)
   - Sent when user deletes account
   - 30-day grace period information
   - Permanent deletion warning

## Customizing Email Templates

Email templates are located in: `backend/src/services/email/templates/`

To customize a template:

1. Open the template file (e.g., `verification-email.template.ts`)
2. Modify the HTML content in the function return value
3. Keep the template variables (e.g., `${username}`, `${verificationLink}`)
4. Test the changes by triggering the email flow
5. Restart the backend server for changes to take effect

**Best Practices**:
- Keep designs mobile-responsive
- Use inline CSS (email clients strip `<style>` tags)
- Test across multiple email clients (Gmail, Outlook, Apple Mail)
- Provide plain-text fallback for accessibility

## Troubleshooting

### Email Not Sending

**Check 1: API Key Configuration**
```bash
# Verify SENDGRID_API_KEY is set in .env
grep SENDGRID_API_KEY backend/.env
```

**Check 2: Sender Email Verified**
- Go to SendGrid Dashboard → Sender Authentication
- Ensure your `EMAIL_FROM` address is verified
- If using domain authentication, verify DNS records

**Check 3: Check Backend Logs**
```bash
# Look for error messages
tail -f backend/logs/combined.log
```

Common errors:
- `403 Forbidden`: API key doesn't have Mail Send permission
- `400 Bad Request`: Invalid sender email (not verified)
- `401 Unauthorized`: Invalid or expired API key

### Emails Going to Spam

**Solutions**:
1. **Authenticate your domain** (not just single sender)
2. **Add SPF, DKIM, DMARC records** to your DNS
3. **Warm up your sending** (start with low volume)
4. **Avoid spam trigger words** in subject/content
5. **Include unsubscribe link** (required by law in many regions)

### Rate Limits

SendGrid free tier limits:
- **100 emails per day**
- **Unlimited contacts**

For production:
- Upgrade to paid plan for higher limits
- Monitor usage in SendGrid Dashboard
- Implement email queuing if needed

### Email Service Not Initialized

If you see this log warning:
```
[WARN] SendGridEmailService: SENDGRID_API_KEY not set. Email sending will be disabled.
```

**Fix**:
1. Ensure `SENDGRID_API_KEY` is in your `.env` file
2. Restart backend server
3. Check for initialization success log

## Production Deployment

### Security Checklist

- [ ] Use environment variables (never commit API keys)
- [ ] Verify domain authentication (not single sender)
- [ ] Configure SPF/DKIM/DMARC records
- [ ] Set up email monitoring/alerts
- [ ] Test all email flows in staging environment
- [ ] Update `FRONTEND_URL` to production URL
- [ ] Update `EMAIL_FROM` to production domain
- [ ] Implement email rate limiting if needed
- [ ] Set up unsubscribe management (if required)

### Environment-Specific Configuration

**Development** (`.env.development`):
```env
SENDGRID_API_KEY=SG.dev_key_here
EMAIL_FROM=noreply-dev@rephlo.com
EMAIL_FROM_NAME=Rephlo (Dev)
FRONTEND_URL=http://localhost:5173
```

**Staging** (`.env.staging`):
```env
SENDGRID_API_KEY=SG.staging_key_here
EMAIL_FROM=noreply-staging@rephlo.com
EMAIL_FROM_NAME=Rephlo (Staging)
FRONTEND_URL=https://staging.rephlo.com
```

**Production** (`.env.production`):
```env
SENDGRID_API_KEY=SG.prod_key_here
EMAIL_FROM=noreply@rephlo.com
EMAIL_FROM_NAME=Rephlo
FRONTEND_URL=https://rephlo.com
```

## Monitoring & Analytics

### SendGrid Dashboard Metrics

1. Go to **Email Activity** to view:
   - Delivery rate
   - Bounce rate
   - Open rate (if tracking enabled)
   - Click rate (if tracking enabled)

2. Go to **Stats** to view:
   - Volume over time
   - Delivery status breakdown
   - Engagement metrics

3. Set up **Alerts** for:
   - Failed deliveries
   - API key usage
   - Rate limit warnings

### Backend Logging

Email delivery is logged with the following events:

**Success**:
```
[INFO] SendGridEmailService: Verification email sent successfully
[INFO] SendGridEmailService: Password reset email sent successfully
```

**Failure** (doesn't block user operations):
```
[ERROR] SendGridEmailService: Failed to send verification email
```

Review logs regularly to identify delivery issues.

## Adding New Email Templates

To add a new email type:

1. **Create template file**:
   ```bash
   touch backend/src/services/email/templates/welcome-email.template.ts
   ```

2. **Define template function**:
   ```typescript
   export interface WelcomeEmailParams {
     username: string;
   }

   export function generateWelcomeEmailTemplate(params: WelcomeEmailParams): string {
     // HTML content here
   }
   ```

3. **Add method to IEmailService**:
   ```typescript
   // backend/src/services/email/email.service.interface.ts
   sendWelcomeEmail(email: string, username: string): Promise<void>;
   ```

4. **Implement in SendGridEmailService**:
   ```typescript
   async sendWelcomeEmail(email: string, username: string): Promise<void> {
     // Implementation here
   }
   ```

5. **Call from controller**:
   ```typescript
   await this.emailService.sendWelcomeEmail(user.email, user.username);
   ```

## Alternative Email Providers

The email service uses the `IEmailService` interface, making it easy to swap providers:

### Switching to Mailgun

1. Install Mailgun SDK: `npm install mailgun-js`
2. Create `mailgun-email.service.ts` implementing `IEmailService`
3. Update DI container registration in `container.ts`:
   ```typescript
   container.register<IEmailService>('IEmailService', {
     useClass: MailgunEmailService
   });
   ```

### Switching to AWS SES

1. Install AWS SDK: `npm install @aws-sdk/client-ses`
2. Create `ses-email.service.ts` implementing `IEmailService`
3. Update DI container registration

The rest of the application remains unchanged due to dependency injection.

## Support & Resources

- **SendGrid Documentation**: https://docs.sendgrid.com/
- **SendGrid API Reference**: https://docs.sendgrid.com/api-reference/
- **Email Best Practices**: https://sendgrid.com/resource/email-deliverability-guide/
- **Rephlo Support**: support@rephlo.com

## Related Documentation

- [Phase 4 Implementation Plan](../plan/104-phase4-email-testing-completion.md)
- [Authentication Endpoints](../plan/103-auth-endpoints-implementation.md)
- [Google OAuth Setup](010-google-oauth-setup.md)
- [Rate Limiting Configuration](011-rate-limiting-configuration.md)

---

**Last Updated**: 2025-11-07
**Maintainer**: Backend Team
**Version**: 1.0.0
