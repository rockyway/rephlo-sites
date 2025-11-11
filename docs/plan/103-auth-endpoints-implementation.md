# Authentication Endpoints Implementation Plan

**Document Number**: 103
**Created**: 2025-11-06
**Status**: Planning
**Priority**: P0 (Critical)

## Executive Summary

This plan implements the missing authentication endpoints to provide a complete, self-service user authentication system. Currently, the system has a production-ready OAuth 2.0/OIDC implementation but lacks user registration, password reset, and account management endpoints.

## Current State

### What Exists ✅
- **OAuth 2.0/OIDC Core**: Authorization code flow with PKCE, token management
- **Login Flow**: Email/password authentication via OIDC interactions
- **Services**: All backend logic exists in `AuthService`
- **Database Schema**: User, OAuth tables ready
- **Security**: Bcrypt password hashing, JWT tokens, scope validation

### What's Missing ❌
1. User registration (self-signup)
2. Password reset flow (forgot password)
3. Email verification
4. Account management (deactivate, delete)
5. Explicit logout endpoint
6. Social login (Google OAuth)

## Implementation Strategy

### Phase 1: Core Authentication Endpoints (P0)
**Priority**: High - Essential for user onboarding
**Estimated Duration**: 4-6 hours

#### 1.1 User Registration
**Endpoint**: `POST /auth/register`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "john_doe",
  "firstName": "John",
  "lastName": "Doe",
  "acceptedTerms": true
}
```

**Implementation**:
```typescript
// In AuthController
async register(req: Request, res: Response): Promise<void> {
  // 1. Validate input (Zod schema)
  // 2. Check if email already exists
  // 3. Check if username already taken
  // 4. Validate password strength
  // 5. Call AuthService.createUser()
  // 6. Generate email verification token
  // 7. Send verification email (if email service configured)
  // 8. Return 201 with user ID (not auto-login for security)
}
```

**Validation Requirements**:
- Email: Valid format, unique in database
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- Username: 3-30 chars, alphanumeric + underscore, unique
- Terms: Must be `true`

**Response**:
```json
{
  "id": "clx...",
  "email": "user@example.com",
  "emailVerified": false,
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Error Responses**:
- 400: Validation errors
- 409: Email/username already exists
- 500: Server error

#### 1.2 Email Verification
**Endpoint**: `POST /auth/verify-email`

**Request**:
```json
{
  "token": "abc123...",
  "email": "user@example.com"
}
```

**Implementation**:
```typescript
async verifyEmail(req: Request, res: Response): Promise<void> {
  // 1. Validate token format
  // 2. Find user by email
  // 3. Check token expiration (24 hours)
  // 4. Verify token matches stored hash
  // 5. Call AuthService.verifyEmail()
  // 6. Return success
}
```

**Token Storage**:
- Add `emailVerificationToken` field to User model (hashed)
- Add `emailVerificationTokenExpiry` field
- Generate with crypto.randomBytes(32)

**Response**:
```json
{
  "success": true,
  "message": "Email verified successfully. You can now log in."
}
```

#### 1.3 Forgot Password (Request Reset)
**Endpoint**: `POST /auth/forgot-password`

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Implementation**:
```typescript
async forgotPassword(req: Request, res: Response): Promise<void> {
  // 1. Validate email format
  // 2. Find user by email (always return success even if not found - security)
  // 3. Generate password reset token
  // 4. Store token hash and expiry in database
  // 5. Send reset email with token link
  // 6. Return generic success message
}
```

**Security Considerations**:
- Always return success to prevent email enumeration
- Token valid for 1 hour
- Rate limit to 3 requests per hour per email
- Invalidate old tokens when new one requested

**Response**:
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

#### 1.4 Reset Password (Complete Reset)
**Endpoint**: `POST /auth/reset-password`

**Request**:
```json
{
  "token": "abc123...",
  "email": "user@example.com",
  "newPassword": "NewSecurePass123!"
}
```

**Implementation**:
```typescript
async resetPassword(req: Request, res: Response): Promise<void> {
  // 1. Validate token and new password
  // 2. Find user by email
  // 3. Verify token matches and not expired
  // 4. Validate password strength
  // 5. Call AuthService.updatePassword()
  // 6. Invalidate all existing tokens/sessions
  // 7. Clear reset token
  // 8. Send confirmation email
  // 9. Return success
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully. Please log in with your new password."
}
```

#### 1.5 Explicit Logout
**Endpoint**: `POST /auth/logout`

**Request**:
```json
{
  "token": "access_token",
  "refreshToken": "refresh_token"
}
```

**Implementation**:
```typescript
async logout(req: Request, res: Response): Promise<void> {
  // 1. Get tokens from request body or headers
  // 2. Call /oauth/revoke for access token
  // 3. Call /oauth/revoke for refresh token (if provided)
  // 4. Clear any session data
  // 5. Return success
}
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

### Phase 2: Account Management (P1)
**Priority**: Medium - User self-service
**Estimated Duration**: 2-3 hours

#### 2.1 Account Deactivation
**Endpoint**: `POST /auth/deactivate`

**Request**:
```json
{
  "password": "current_password",
  "reason": "Taking a break"
}
```

**Implementation**:
```typescript
async deactivateAccount(req: Request, res: Response): Promise<void> {
  // 1. Require authentication (Bearer token)
  // 2. Verify password
  // 3. Call AuthService.deactivateAccount()
  // 4. Revoke all tokens
  // 5. Send confirmation email
  // 6. Return success
}
```

**Database Update**:
- Add `isActive` field to User model (default: true)
- Deactivated users cannot log in
- Data retained for reactivation

**Response**:
```json
{
  "success": true,
  "message": "Account deactivated. Contact support to reactivate."
}
```

#### 2.2 Account Deletion
**Endpoint**: `DELETE /auth/account`

**Request**:
```json
{
  "password": "current_password",
  "confirmation": "DELETE"
}
```

**Implementation**:
```typescript
async deleteAccount(req: Request, res: Response): Promise<void> {
  // 1. Require authentication
  // 2. Verify password
  // 3. Check confirmation matches "DELETE"
  // 4. Call AuthService.deleteAccount()
  // 5. Revoke all tokens
  // 6. Send goodbye email
  // 7. Return success
}
```

**Data Handling**:
- Soft delete: Set `deletedAt` timestamp
- Retain data for 30 days (legal/recovery)
- Anonymize PII after 30 days
- Hard delete via background job

**Response**:
```json
{
  "success": true,
  "message": "Account deletion scheduled. Data will be permanently removed in 30 days."
}
```

### Phase 3: Social Login - Google (P1)
**Priority**: Medium - Alternative authentication
**Estimated Duration**: 4-5 hours

#### 3.1 Google OAuth Integration

**Architecture**:
```
User → Click "Login with Google"
     → GET /oauth/google/authorize (redirect to Google)
     → User authenticates with Google
     → Google redirects to /oauth/google/callback
     → Exchange code for Google tokens
     → Fetch user profile from Google
     → Find or create user in database
     → Create OIDC session
     → Redirect to /oauth/authorize (continue OIDC flow)
     → User gets JWT tokens
```

**Endpoints**:
1. `GET /oauth/google/authorize` - Initiate Google OAuth
2. `GET /oauth/google/callback` - Handle Google redirect

**Implementation**:

```typescript
// SocialAuthController
class SocialAuthController {
  async googleAuthorize(req: Request, res: Response): Promise<void> {
    // 1. Generate state parameter (CSRF protection)
    // 2. Store state in session
    // 3. Build Google OAuth URL
    // 4. Redirect to Google

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${qs.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      state: randomState,
      access_type: 'offline'
    })}`;

    res.redirect(googleAuthUrl);
  }

  async googleCallback(req: Request, res: Response): Promise<void> {
    // 1. Verify state parameter
    // 2. Exchange code for access token
    // 3. Fetch user profile from Google
    // 4. Find user by email or create new user
    // 5. Mark email as verified (trusted from Google)
    // 6. Create OIDC session
    // 7. Redirect to client app with authorization code
  }
}
```

**Database Changes**:
```typescript
// Add to User model
model User {
  // ... existing fields
  googleId         String?  @unique
  googleProfileUrl String?
  authProvider     String   @default("local") // "local" | "google"
}
```

**Environment Variables**:
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:7150/oauth/google/callback
```

**Google Cloud Console Setup**:
1. Create OAuth 2.0 credentials
2. Add authorized redirect URIs
3. Configure consent screen
4. Enable Google+ API

**Response** (on success):
- Redirects to client app with authorization code
- Client exchanges code for JWT tokens (standard OIDC flow)

### Phase 4: Email Service Integration (P2)
**Priority**: Low - Required for production
**Estimated Duration**: 2-3 hours

#### 4.1 Email Service Setup

**Options**:
1. **SendGrid** (recommended)
2. Mailgun
3. AWS SES
4. Nodemailer (SMTP)

**Implementation**:
```typescript
// EmailService
class EmailService {
  async sendVerificationEmail(email: string, token: string): Promise<void>
  async sendPasswordResetEmail(email: string, token: string): Promise<void>
  async sendPasswordChangedEmail(email: string): Promise<void>
  async sendWelcomeEmail(email: string, username: string): Promise<void>
  async sendGoodbyeEmail(email: string): Promise<void>
}
```

**Templates**:
- Email verification
- Password reset
- Password changed notification
- Welcome email
- Account deactivation
- Account deletion

**Configuration**:
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_api_key
FROM_EMAIL=noreply@textassistant.com
FROM_NAME=Rephlo
```

## Database Schema Changes

### Required Migrations

```prisma
model User {
  // Existing fields...

  // Email Verification
  emailVerificationToken       String?
  emailVerificationTokenExpiry DateTime?

  // Password Reset
  passwordResetToken           String?
  passwordResetTokenExpiry     DateTime?

  // Account Management
  isActive                     Boolean   @default(true)
  deactivatedAt                DateTime?
  deletedAt                    DateTime?

  // Social Auth
  googleId                     String?   @unique
  googleProfileUrl             String?
  authProvider                 String    @default("local")

  // Security
  lastPasswordChange           DateTime?
  passwordResetCount           Int       @default(0)
}
```

## Testing Strategy

### Unit Tests
- [ ] Registration validation
- [ ] Password strength validation
- [ ] Email verification token generation/validation
- [ ] Password reset token generation/validation
- [ ] Account deactivation logic
- [ ] Account deletion logic
- [ ] Google OAuth profile mapping

### Integration Tests
- [ ] POST /auth/register → Creates user
- [ ] POST /auth/verify-email → Verifies email
- [ ] POST /auth/forgot-password → Sends reset email
- [ ] POST /auth/reset-password → Updates password
- [ ] POST /auth/logout → Revokes tokens
- [ ] POST /auth/deactivate → Deactivates account
- [ ] DELETE /auth/account → Soft deletes account
- [ ] GET /oauth/google/authorize → Redirects to Google
- [ ] GET /oauth/google/callback → Creates user and returns tokens

### E2E Tests
- [ ] Complete registration → verification → login flow
- [ ] Forgot password → reset → login flow
- [ ] Google OAuth → first-time user → registration flow
- [ ] Google OAuth → existing user → login flow
- [ ] Account deactivation → cannot login → reactivation flow
- [ ] Account deletion → data removal verification

## Security Considerations

### Input Validation
- Email: RFC 5322 compliant
- Password: Min 8 chars, complexity requirements
- Username: 3-30 chars, alphanumeric + underscore
- Tokens: Cryptographically secure random bytes

### Rate Limiting
- Registration: 5 per hour per IP
- Forgot password: 3 per hour per email
- Email verification: 10 per hour per email
- Login attempts: 5 per 15 minutes per email
- Account deletion: 1 per day per user

### Token Security
- Email verification: 24-hour expiry
- Password reset: 1-hour expiry
- Tokens hashed in database (SHA-256)
- Single-use tokens (invalidated after use)

### OWASP Compliance
- Prevent email enumeration (generic messages)
- CSRF protection (state parameter for OAuth)
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (no HTML in responses)
- Password hashing (bcrypt, 12 rounds)

## API Routes Organization

### Current Structure
```
/oauth/*          - OIDC provider endpoints
/interaction/*    - OIDC interaction (login UI)
/v1/*             - REST API v1
/api/*            - Enhanced endpoints
/admin/*          - Admin endpoints
```

### New Routes (Phase 1-3)
```
/auth/register              - User registration
/auth/verify-email          - Email verification
/auth/forgot-password       - Request password reset
/auth/reset-password        - Complete password reset
/auth/logout                - Explicit logout
/auth/deactivate            - Deactivate account
/auth/account               - Delete account
/oauth/google/authorize     - Google OAuth initiation
/oauth/google/callback      - Google OAuth callback
```

## File Structure

### New Files to Create
```
backend/src/controllers/
  auth-management.controller.ts   - Registration, password reset, etc.
  social-auth.controller.ts       - Google OAuth handlers

backend/src/routes/
  auth.routes.ts                  - Auth management routes
  social-auth.routes.ts           - Social login routes

backend/src/services/
  email.service.ts                - Email sending
  token.service.ts                - Token generation/validation

backend/src/validators/
  auth.validator.ts               - Zod schemas for auth

backend/src/utils/
  password-strength.ts            - Password validation
  token-generator.ts              - Secure token generation
```

### Files to Modify
```
backend/src/routes/index.ts      - Mount new routes
backend/src/services/auth.service.ts  - Add token methods
backend/prisma/schema.prisma     - Add new fields
backend/src/container.ts         - Register new services
backend/docs/openapi/enhanced-api.yaml  - Document new endpoints
```

## Swagger Documentation

All new endpoints must be fully documented:
- Request/response schemas
- Error responses (400, 401, 403, 404, 409, 429, 500)
- Examples for all scenarios
- Authentication requirements
- Rate limiting information

## Success Criteria

### Phase 1 (Core Auth)
- [ ] Users can self-register
- [ ] Email verification works
- [ ] Password reset flow complete
- [ ] Explicit logout functional
- [ ] All endpoints documented in Swagger
- [ ] Unit tests passing
- [ ] Integration tests passing

### Phase 2 (Account Management)
- [ ] Users can deactivate account
- [ ] Users can delete account
- [ ] Soft delete with 30-day retention
- [ ] Confirmation emails sent
- [ ] Tests passing

### Phase 3 (Google OAuth)
- [ ] Google login works for new users
- [ ] Google login works for existing users
- [ ] Email auto-verified from Google
- [ ] Profile data synced
- [ ] Tests passing

### Phase 4 (Email Service)
- [ ] Email service configured
- [ ] All email templates created
- [ ] Emails sending in production
- [ ] Monitoring/logging in place

## Timeline Estimates

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Core Auth | 4-6 hours | P0 |
| Phase 2: Account Mgmt | 2-3 hours | P1 |
| Phase 3: Google OAuth | 4-5 hours | P1 |
| Phase 4: Email Service | 2-3 hours | P2 |
| **Total** | **12-17 hours** | |

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Email service not configured | High | Medium | Use console logging fallback for dev |
| Google OAuth misconfiguration | High | Medium | Thorough testing with Google dev console |
| Token security vulnerabilities | High | Low | Use crypto.randomBytes, proper hashing |
| Rate limiting bypass | Medium | Medium | Test rate limits thoroughly |
| Database migration issues | High | Low | Test migrations on dev database first |

## Dependencies

### External Services
- Google Cloud Console (OAuth credentials)
- Email service (SendGrid/Mailgun/SES)

### NPM Packages
- Already installed: `bcrypt`, `jsonwebtoken`, `@prisma/client`
- New packages needed:
  - `@sendgrid/mail` (if using SendGrid)
  - `googleapis` (for Google OAuth)
  - `crypto` (built-in Node.js)

### Environment Variables
```env
# Email Service
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_key
FROM_EMAIL=noreply@textassistant.com

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT_URI=http://localhost:7150/oauth/google/callback

# Token Expiry
EMAIL_VERIFICATION_EXPIRY=24h
PASSWORD_RESET_EXPIRY=1h

# Rate Limiting
REGISTRATION_RATE_LIMIT=5
PASSWORD_RESET_RATE_LIMIT=3
```

## Next Steps

1. ✅ Review and approve this plan
2. Create database migration for new fields
3. Implement Phase 1 (Core Auth) endpoints
4. Write unit and integration tests
5. Update Swagger documentation
6. Implement Phase 2 (Account Management)
7. Implement Phase 3 (Google OAuth)
8. Configure email service (Phase 4)
9. Deploy and monitor

---

**Document Status**: Ready for Implementation
**Approved By**: Pending
**Implementation Start Date**: 2025-11-06
