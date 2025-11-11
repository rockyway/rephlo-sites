# POC Client Setup and Testing Guide

**Date:** November 9, 2025
**Version:** 1.0
**Status:** Ready for Team Use

---

## Quick Start

### Prerequisites
- Node.js 16+ installed
- PostgreSQL database running with seeded data (see Migration Resolution report)
- Identity Provider running on port 7151
- Backend API running on port 7150

### Installation & Startup

```bash
# 1. Navigate to POC Client directory
cd poc-client

# 2. Install dependencies
npm install

# 3. Build TypeScript
npm run build

# 4. Start the POC Client
npm start
# or for development with auto-reload:
npm run dev
```

**Expected Output:**
```
✅ POC Client running on http://localhost:8080

OAuth Flow:
  1. Click "Login" button to start OAuth flow
  2. You will be redirected to Identity Provider (http://localhost:7151)
  3. Login with test account
  4. You will be redirected back with an auth code
  5. Token will be exchanged automatically
  6. Use the token to call API endpoints

Identity Provider: http://localhost:7151
Resource API: http://localhost:7150
```

---

## Configuration

### OAuth Client Details
The POC Client is configured with the following seeded OAuth credentials:

```yaml
Client ID: poc-client-test
Client Secret: test-secret-poc-client-67890
Redirect URI: http://localhost:8080/oauth/callback
Grant Types: authorization_code, refresh_token
Scopes: openid, email, profile, llm.inference, models.read, user.info, credits.read
```

### Service URLs
```yaml
Identity Provider (OAuth/OIDC): http://localhost:7151
Resource API (Backend): http://localhost:7150
POC Client: http://localhost:8080
```

### Configuration File
**Location:** `poc-client/src/server.ts`

**Key Variables:**
```typescript
const IDENTITY_PROVIDER_URL = 'http://localhost:7151';
const RESOURCE_API_URL = 'http://localhost:7150';
const CLIENT_ID = 'poc-client-test';
const CLIENT_SECRET = 'test-secret-poc-client-67890';
const CLIENT_REDIRECT_URI = 'http://localhost:8080/oauth/callback';
```

To modify configuration, edit `src/server.ts` and rebuild:
```bash
npm run build
npm start
```

---

## Test User Accounts

Use these credentials to test the OAuth flow:

### Account 1: Free Tier User
```
Email: free.user@example.com
Password: TestPassword123!
Tier: free
Monthly Credits: 100
```

### Account 2: Pro Tier User
```
Email: pro.user@example.com
Password: TestPassword123!
Tier: pro
Monthly Credits: 10,000 + 5,000 bonus = 15,000
```

### Account 3: Admin User (with MFA enabled)
```
Email: admin.test@rephlo.ai
Password: AdminPassword123!
Role: admin
Tier: pro
Monthly Credits: 15,000
MFA: Enabled (TOTP)
```

### Account 4: OAuth Test User
```
Email: google.user@example.com
Auth Method: Google OAuth
Tier: pro
Monthly Credits: 15,000
```

---

## Testing Workflow

### Step 1: Start All Services

**Terminal 1 - Backend API:**
```bash
cd backend
npm start
# Should output: "🚀 Rephlo Backend API running on http://0.0.0.0:7150"
```

**Terminal 2 - Identity Provider:**
```bash
cd identity-provider
npm start
# Should output: "Identity Provider running on port 7151"
```

**Terminal 3 - POC Client:**
```bash
cd poc-client
npm start
# Should output: "✅ POC Client running on http://localhost:8080"
```

### Step 2: Test OAuth Flow

1. Open browser to: `http://localhost:8080`
2. Click "Login" or navigate to `http://localhost:8080/oauth/login`
3. You'll be redirected to Identity Provider
4. Login with one of the test accounts (e.g., `free.user@example.com` / `TestPassword123!`)
5. Click "Authorize" to grant permissions
6. You'll be redirected back to POC Client with an access token

**Expected Result:**
- Token displayed in browser
- Session established successfully
- Ready to test API endpoints

### Step 3: Test API Endpoints

Once authenticated, test each endpoint using curl or a REST client:

#### 3.1 Get User Profile
```bash
curl -X GET http://localhost:8080/api/test/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response Format:**
```json
{
  "success": true,
  "endpoint": "/v1/users/me",
  "statusCode": 200,
  "data": {
    "id": "user-id",
    "email": "free.user@example.com",
    "firstName": "Free",
    "lastName": "User",
    "role": "user",
    "emailVerified": true,
    "isActive": true,
    "createdAt": "2025-11-09T...",
    "updatedAt": "2025-11-09T..."
  }
}
```

#### 3.2 Get User Credits
```bash
curl -X GET http://localhost:8080/api/test/credits \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response Format:**
```json
{
  "success": true,
  "endpoint": "/v1/credits/me",
  "statusCode": 200,
  "data": {
    "userId": "user-id",
    "totalCredits": 100,
    "usedCredits": 0,
    "creditType": "free",
    "monthlyAllocation": 100,
    "billingPeriodStart": "2025-11-01T...",
    "billingPeriodEnd": "2025-11-30T...",
    "isCurrent": true
  }
}
```

#### 3.3 Get Available Models
```bash
curl -X GET http://localhost:8080/api/test/models \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response Format:**
```json
{
  "success": true,
  "endpoint": "/v1/models",
  "statusCode": 200,
  "data": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "creditsPerRequest": 10,
      "creditsPerMinute": 100,
      "maxRequestsPerDay": 100,
      "isAvailable": true
    },
    {
      "id": "gpt-35-turbo",
      "name": "GPT-3.5 Turbo",
      "creditsPerRequest": 2,
      "creditsPerMinute": 50,
      "maxRequestsPerDay": 1000,
      "isAvailable": true
    }
  ]
}
```

#### 3.4 Get Subscription Info
```bash
curl -X GET http://localhost:8080/api/test/subscriptions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response Format:**
```json
{
  "success": true,
  "endpoint": "/v1/subscriptions/current",
  "statusCode": 200,
  "data": {
    "id": "sub-id",
    "userId": "user-id",
    "tier": "free",
    "status": "active",
    "creditsPerMonth": 100,
    "currentPeriodStart": "2025-11-01T...",
    "currentPeriodEnd": "2025-11-30T...",
    "createdAt": "2025-11-09T..."
  }
}
```

#### 3.5 Get MFA Status
```bash
curl -X GET http://localhost:8080/api/test/mfa/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response Format:**
```json
{
  "success": true,
  "endpoint": "/v1/auth/mfa/status",
  "statusCode": 200,
  "data": {
    "mfaEnabled": false,
    "backupCodesRemaining": 0
  }
}
```

**Note:** MFA status varies by user:
- `free.user@example.com`: MFA disabled (0 backup codes)
- `pro.user@example.com`: MFA disabled (0 backup codes)
- `admin.test@rephlo.ai`: MFA enabled (10 backup codes)
- `google.user@example.com`: MFA disabled (0 backup codes)

#### 3.6 Test Inference (LLM Call)
```bash
curl -X POST http://localhost:8080/api/test/inference \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the capital of France?",
    "model": "gpt-4"
  }'
```

**Response Format:**
```json
{
  "success": true,
  "endpoint": "/v1/inference/generate",
  "statusCode": 200,
  "data": {
    "result": "The capital of France is Paris.",
    "model": "gpt-4",
    "creditsUsed": 10,
    "remainingCredits": 90,
    "duration_ms": 1234
  }
}
```

#### 3.7 Check Health
```bash
curl -X GET http://localhost:8080/api/test/health
```

**Response Format:**
```json
{
  "success": true,
  "endpoint": "/health",
  "statusCode": 200,
  "data": {
    "status": "healthy",
    "database": "connected",
    "redis": "connected",
    "timestamp": "2025-11-09T..."
  }
}
```

### Step 4: Test Logout

```bash
curl -X POST http://localhost:8080/api/logout
```

**Response Format:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Complete Test Scenario

### Scenario: Free User Workflow

1. **Login as free user**
   ```
   Email: free.user@example.com
   Password: TestPassword123!
   ```

2. **Check profile**
   ```
   GET /api/test/users/me
   Expect: Email verified, role=user, tier=free
   ```

3. **Check credits**
   ```
   GET /api/test/credits
   Expect: 100 monthly credits, 0 used
   ```

4. **Check subscription**
   ```
   GET /api/test/subscriptions
   Expect: Tier=free, Status=active
   ```

5. **View available models**
   ```
   GET /api/test/models
   Expect: List of available models (3+)
   ```

6. **Test inference**
   ```
   POST /api/test/inference
   Prompt: "2+2=?"
   Model: gpt-4
   Expect: Success, credits reduced from 100 to 90
   ```

7. **Verify credits updated**
   ```
   GET /api/test/credits
   Expect: 10 used, 90 remaining
   ```

8. **Logout**
   ```
   POST /api/logout
   Expect: Session cleared
   ```

### Scenario: Admin User Workflow

1. **Login as admin**
   ```
   Email: admin.test@rephlo.ai
   Password: AdminPassword123!
   ```

2. **Check MFA status**
   ```
   GET /api/test/mfa/status
   Expect: mfaEnabled=true, backupCodesRemaining=10
   ```

3. **Check pro tier credits**
   ```
   GET /api/test/credits
   Expect: 15,000 monthly credits
   ```

4. **Perform multiple inferences**
   ```
   POST /api/test/inference (5 times)
   Model: gpt-4 (10 credits each)
   Expect: 15,000 → 14,950 credits
   ```

---

## Troubleshooting

### Issue: Cannot Connect to Identity Provider

**Symptoms:**
- "Failed to connect to http://localhost:7151"
- OAuth flow redirects to error page

**Solutions:**
1. Verify Identity Provider is running
   ```bash
   curl http://localhost:7151/.well-known/openid-configuration
   ```
2. Check port 7151 is available
   ```bash
   lsof -i :7151  # macOS/Linux
   netstat -ano | findstr :7151  # Windows
   ```
3. Restart Identity Provider
   ```bash
   cd identity-provider
   npm start
   ```

### Issue: Cannot Connect to Resource API

**Symptoms:**
- API endpoints return 503 or connection refused
- Credits/subscription calls fail

**Solutions:**
1. Verify Backend is running
   ```bash
   curl http://localhost:7150/health
   ```
2. Check port 7150 is available
3. Restart Backend
   ```bash
   cd backend
   npm start
   ```

### Issue: Invalid Token/Unauthorized

**Symptoms:**
- API endpoints return 401 Unauthorized
- "Invalid or expired token" messages

**Solutions:**
1. Verify token is being sent correctly
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/api/test/users/me
   ```
2. Check token hasn't expired (typically 1 hour)
3. Login again to get fresh token
4. Verify token payload
   ```javascript
   // In browser console:
   atob(token.split('.')[1])  // Decode JWT
   ```

### Issue: Wrong Redirect URI Error

**Symptoms:**
- OAuth error: "Invalid redirect_uri"
- Cannot complete authorization

**Solution:**
- Verify POC Client redirect URI matches configuration
- Must be exactly: `http://localhost:8080/oauth/callback`
- If changed, update `CLIENT_REDIRECT_URI` in `src/server.ts`
- Rebuild and restart POC Client

### Issue: Credits Not Deducting After Inference

**Symptoms:**
- API call succeeds but credits unchanged
- Response shows `creditsUsed: 0`

**Solutions:**
1. Verify user has sufficient credits
   ```bash
   GET /api/test/credits  # Check balance
   ```
2. Verify model exists and is available
   ```bash
   GET /api/test/models
   ```
3. Check backend logs for errors
4. Ensure token has `llm.inference` scope

### Issue: MFA Status Endpoint Returns 403

**Symptoms:**
- GET /api/test/mfa/status returns "MFA not enabled for this account"
- Expected for non-admin users

**This is expected behavior:**
- Only admin users have MFA enabled by default
- Test with `admin.test@rephlo.ai`
- Non-admin users will return `mfaEnabled: false`

---

## API Endpoint Summary

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| /oauth/login | GET | No | Start OAuth flow |
| /callback | GET | No | OAuth callback (automatic) |
| /api/session/:sessionId | GET | No | Check session status |
| /api/logout | POST | No | Logout and clear session |
| /api/test/health | GET | No | Check system health |
| /api/test/users/me | GET | Yes | Get user profile |
| /api/test/models | GET | Yes | List available models |
| /api/test/credits | GET | Yes | Get credit balance |
| /api/test/subscriptions | GET | Yes | Get subscription info |
| /api/test/mfa/status | GET | Yes | Get MFA status |
| /api/test/inference | POST | Yes | Execute inference |

---

## Performance Expectations

| Operation | Expected Time | Max Time |
|-----------|---------------|----------|
| OAuth Flow (login to token) | 2-3 sec | 10 sec |
| Get User Profile | 50-100 ms | 500 ms |
| Get Credits | 50-100 ms | 500 ms |
| Get Subscription | 50-100 ms | 500 ms |
| List Models | 100-200 ms | 1 sec |
| Inference Call (depends on model) | 1-10 sec | 30 sec |
| MFA Status Check | 50-100 ms | 500 ms |

---

## Common Test Cases

### Test Case 1: Complete OAuth Flow
**Objective:** Verify OAuth authorization code flow works

**Steps:**
1. Navigate to `http://localhost:8080/oauth/login`
2. Login with test credentials
3. Grant permissions
4. Receive access token

**Pass Criteria:**
- Redirected back to POC Client
- Token displayed and valid
- Can call protected endpoints

### Test Case 2: Credit Deduction
**Objective:** Verify credits are deducted after inference

**Steps:**
1. Login as `free.user@example.com`
2. Check credits (should be 100)
3. Call inference endpoint
4. Check credits again

**Pass Criteria:**
- Credits reduced by 10 (for gpt-4)
- Response shows `creditsUsed: 10`

### Test Case 3: Tier-Based Limits
**Objective:** Verify different users have appropriate credit limits

**Steps:**
1. Login as `free.user@example.com` - Check credits (100)
2. Logout
3. Login as `pro.user@example.com` - Check credits (15,000)

**Pass Criteria:**
- Free user: 100 monthly credits
- Pro user: 15,000 monthly credits

### Test Case 4: Admin MFA Check
**Objective:** Verify admin user has MFA enabled

**Steps:**
1. Login as `admin.test@rephlo.ai`
2. Call `/api/test/mfa/status`

**Pass Criteria:**
- `mfaEnabled: true`
- `backupCodesRemaining: 10`

### Test Case 5: Token Expiration
**Objective:** Verify expired token is rejected

**Steps:**
1. Get valid token (expires in ~1 hour)
2. Wait for expiration (or manually modify token)
3. Call protected endpoint with expired token

**Pass Criteria:**
- API returns 401 Unauthorized
- Error message indicates token expired

---

## Development Tips

### Viewing Token Payload
```javascript
// In browser console or Node.js
const token = "your_access_token";
const payload = JSON.parse(
  atob(token.split('.')[1])
);
console.log(payload);
```

### Monitoring Backend Logs
```bash
# Terminal with backend running
# Look for entries like:
# [info]: GET /v1/users/me
# [info]: POST /v1/inference/generate
# [error]: Any errors in API calls
```

### Testing with Different Models
```bash
# Try different models in inference endpoint
curl -X POST http://localhost:8080/api/test/inference \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test","model":"gpt-35-turbo"}'
```

### Resetting Seed Data
```bash
cd backend
npm run db:reset  # Resets database and reseeds
# POC Client can then be tested again with fresh data
```

---

## Additional Resources

- **OAuth/OIDC Spec:** https://openid.net/specs/openid-connect-core-1_0.html
- **PKCE RFC:** https://tools.ietf.org/html/rfc7636
- **JWT Tokens:** https://jwt.io/
- **Project Documentation:** See `docs/` directory

---

## Support & Issues

### Reporting Issues
If you encounter problems:

1. Check this guide's Troubleshooting section
2. Review backend logs for error messages
3. Verify all services are running and healthy
4. Check the project's progress reports in `docs/progress/`

### Common Questions

**Q: How do I change the test user?**
A: Use the test account credentials from the "Test User Accounts" section above.

**Q: What if I don't have PostgreSQL?**
A: The system requires PostgreSQL. Set it up using the database migration guide.

**Q: Can I test with real OAuth providers (Google)?**
A: Yes, but requires additional configuration. Contact the project maintainer.

**Q: How do I monitor credit usage?**
A: Call `/api/test/credits` before and after inference to see the difference.

---

## Next Steps

After testing the POC Client:

1. **Create Integration Tests** - Automate the test scenarios
2. **Build Dashboard UI** - Create a web interface for easier testing
3. **Add More Endpoints** - Support additional API operations
4. **Performance Testing** - Load test the system
5. **Documentation** - Create API reference docs

---

**Last Updated:** November 9, 2025
**Author:** Claude Code
**Status:** Ready for Team Testing

---
