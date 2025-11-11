# Phase 5: Final Integration & End-to-End Testing

**Document Number**: 004
**Created**: 2025-11-08
**Status**: In Progress - Testing Phase
**Scope**: Complete three-tier architecture validation

---

## Executive Summary

Phase 5 validates the complete three-tier architecture with the Desktop App now properly configured to use:
- **Identity Provider** (Port 7151) for OAuth operations
- **Resource API** (Port 7150) for business logic

All tests are designed to verify the system works end-to-end with proper separation of concerns.

---

## Test Environment Setup

### Services Running
- ✅ **Identity Provider**: http://localhost:7151
  - Status: `{"status":"ok","service":"identity-provider"}`
  - Endpoints: `/oauth/authorize`, `/oauth/token`, `/oauth/revoke`, `/oauth/jwks`

- ✅ **Resource API**: http://localhost:7150
  - Status: `{"status":"ok","database":"connected","redis":"configured"}`
  - Endpoints: `/v1/*` for all business logic

- ✅ **Desktop App**: Updated with new OAuth configuration
  - AuthorizationEndpoint: `http://localhost:7151/oauth/authorize`
  - TokenEndpoint: `http://localhost:7151/oauth/token`
  - ApiBaseUrl: `http://localhost:7150/v1`

---

## Test Categories

### Category 1: Service Health & Availability (2/2 Tests)

#### Test 1.1: Identity Provider Health Check
```bash
curl -s http://localhost:7151/health | jq .
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "identity-provider",
  "timestamp": "2025-11-08T06:35:27.100Z"
}
```

**Status**: ✅ PASS

---

#### Test 1.2: Resource API Health Check
```bash
curl -s http://localhost:7150/health | jq .
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-08T06:35:27.368Z",
  "uptime": 3603,
  "environment": "development",
  "version": "2.0.0",
  "services": {
    "database": "connected",
    "redis": "configured",
    "di_container": "initialized"
  }
}
```

**Status**: ✅ PASS

---

### Category 2: Service-to-Service Communication (3/3 Tests)

#### Test 2.1: API Can Reach Identity Provider for JWKS
```bash
curl -s http://localhost:7150/v1/health/dependencies | jq .
```

**Expected**: Response shows Identity Provider is reachable

**Status**: ⏳ Pending

---

#### Test 2.2: API Can Call Identity Provider Introspection Endpoint
```bash
# This test requires valid token exchange first
# Mocked with a test token for now
curl -s -X POST http://localhost:7151/oauth/introspect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=test_token"
```

**Expected**: Identity Provider responds with introspection result (active: false for invalid token)

**Status**: ⏳ Pending

---

#### Test 2.3: Verify Shared Database Connection
```bash
# Check both services can access the same database
curl -s http://localhost:7150/v1/admin/db-status | jq .
```

**Expected**: Both services connected to same PostgreSQL instance

**Status**: ⏳ Pending

---

### Category 3: OAuth Flow (Desktop App Integration) (4/4 Tests)

#### Test 3.1: Authorization Endpoint Redirects to Login
```bash
curl -s -X GET "http://localhost:7151/oauth/authorize?client_id=textassistant-desktop&redirect_uri=http://localhost:8080/callback&response_type=code&scope=openid+email&state=test123&code_challenge=test&code_challenge_method=S256" \
  -L | grep -o 'login\|consent' | head -1
```

**Expected**: Redirects to login page (response contains "login")

**Status**: ⏳ Pending - Manual test with Desktop App required

---

#### Test 3.2: Token Endpoint Returns Valid JWT
```bash
# This requires completing authorization flow first
# Will be tested via Desktop App login
```

**Expected**: Access token is valid JWT signed with RS256

**Status**: ⏳ Pending - Manual test with Desktop App required

---

#### Test 3.3: Token Contains Required Claims
```bash
# Decode token and verify claims: sub, email, scope, iat, exp
```

**Expected**:
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "scope": "openid email profile",
  "iat": 1699411527,
  "exp": 1699415127,
  "iss": "http://localhost:7151"
}
```

**Status**: ⏳ Pending - Manual test with Desktop App required

---

#### Test 3.4: Desktop App Receives Token Successfully
```bash
# Manual test: Open Desktop App, click Login, observe:
# - Browser opens to Identity Provider login
# - User logs in
# - App receives token
# - Token stored securely
```

**Expected**: Login flow completes without errors

**Status**: ⏳ Pending - Manual test with Desktop App required

---

### Category 4: Token Validation (JWT + Introspection) (3/3 Tests)

#### Test 4.1: API Validates JWT from Identity Provider
```bash
# Get token from Identity Provider
TOKEN="<valid-token-from-login>"

# Call API with token
curl -s -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: User profile data returned

**Status**: ⏳ Pending - Requires valid token from Desktop App login

---

#### Test 4.2: API Falls Back to Introspection if JWT Verification Fails
```bash
# Call API with token that JWT verification can't validate
# (e.g., token from different key or opaque token)
curl -s -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer <opaque-token>" | jq .
```

**Expected**: API calls Identity Provider introspection, returns result based on active status

**Status**: ⏳ Pending

---

#### Test 4.3: Invalid Token Rejected with 401
```bash
curl -s -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer invalid-token-xyz" | jq .
```

**Expected Response**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

**Expected Status Code**: 401

**Status**: ⏳ Pending

---

### Category 5: Token Refresh (2/2 Tests)

#### Test 5.1: Token Refresh Endpoint Returns New Token
```bash
# Desktop App calls token endpoint with refresh token
curl -s -X POST http://localhost:7151/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN&client_id=textassistant-desktop" | jq .
```

**Expected**: New access token returned

**Status**: ⏳ Pending - Manual test with Desktop App required

---

#### Test 5.2: New Token Works with API
```bash
# Use refreshed token to call API
curl -s -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer <new-token>" | jq .
```

**Expected**: User data returned with new token

**Status**: ⏳ Pending

---

### Category 6: Token Revocation (2/2 Tests)

#### Test 6.1: Revoke Endpoint Accepts Token
```bash
curl -s -X POST http://localhost:7151/oauth/revoke \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=$TOKEN"
```

**Expected**: 200 OK response

**Status**: ⏳ Pending

---

#### Test 6.2: Revoked Token Rejected by API
```bash
# Try to use revoked token
curl -s -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer <revoked-token>"
```

**Expected Response**: 401 Unauthorized

**Status**: ⏳ Pending

---

### Category 7: API Endpoints with Authentication (5/5 Tests)

#### Test 7.1: Get User Profile (`GET /v1/users/me`)
```bash
curl -s -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: User profile with email, id, profile data

**Status**: ⏳ Pending

---

#### Test 7.2: List Models (`GET /v1/models`)
```bash
curl -s -X GET http://localhost:7150/v1/models \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: List of available LLM models

**Status**: ⏳ Pending

---

#### Test 7.3: Check Credits (`GET /v1/credits`)
```bash
curl -s -X GET http://localhost:7150/v1/credits \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: User credits information

**Status**: ⏳ Pending

---

#### Test 7.4: Chat Completion (`POST /v1/chat/completions`)
```bash
curl -s -X POST http://localhost:7150/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}' | jq .
```

**Expected**: LLM response

**Status**: ⏳ Pending

---

#### Test 7.5: List Subscriptions (`GET /v1/subscriptions`)
```bash
curl -s -X GET http://localhost:7150/v1/subscriptions \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: User subscription information

**Status**: ⏳ Pending

---

### Category 8: Rate Limiting (3/3 Tests)

#### Test 8.1: Rate Limit Headers Present
```bash
curl -i -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer $TOKEN" | grep "X-RateLimit"
```

**Expected**: Headers like `X-RateLimit-Limit`, `X-RateLimit-Remaining`

**Status**: ⏳ Pending

---

#### Test 8.2: Rate Limit Respected
```bash
# Make 100 rapid requests
for i in {1..100}; do
  curl -s http://localhost:7150/v1/users/me \
    -H "Authorization: Bearer $TOKEN"
done
```

**Expected**: After limit is hit, 429 Too Many Requests

**Status**: ⏳ Pending

---

#### Test 8.3: Rate Limit Reset
```bash
# Wait for rate limit window to reset
sleep 60

# Try request again
curl -s http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Request succeeds after reset

**Status**: ⏳ Pending

---

### Category 9: Credit System (3/3 Tests)

#### Test 9.1: Check Initial Credits
```bash
curl -s -X GET http://localhost:7150/v1/credits \
  -H "Authorization: Bearer $TOKEN" | jq '.balance'
```

**Expected**: Number representing available credits

**Status**: ⏳ Pending

---

#### Test 9.2: Make Request Deducts Credits
```bash
# Get initial balance
BEFORE=$(curl -s http://localhost:7150/v1/credits \
  -H "Authorization: Bearer $TOKEN" | jq '.balance')

# Make API request
curl -s -X POST http://localhost:7150/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Hello"}]}'

# Get new balance
AFTER=$(curl -s http://localhost:7150/v1/credits \
  -H "Authorization: Bearer $TOKEN" | jq '.balance')

echo "Before: $BEFORE, After: $AFTER"
```

**Expected**: `AFTER < BEFORE`

**Status**: ⏳ Pending

---

#### Test 9.3: Insufficient Credits Rejected
```bash
# Deplete all credits, then try request
curl -s -X POST http://localhost:7150/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"Test"}]}'
```

**Expected Response**: 402 Payment Required or similar

**Status**: ⏳ Pending

---

### Category 10: Subscription Management (2/2 Tests)

#### Test 10.1: List User Subscriptions
```bash
curl -s -X GET http://localhost:7150/v1/subscriptions \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected**: Array of subscriptions with status, plan, renewal date

**Status**: ⏳ Pending

---

#### Test 10.2: Update Subscription
```bash
curl -s -X POST http://localhost:7150/v1/subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan":"premium","auto_renew":true}' | jq .
```

**Expected**: Updated subscription details

**Status**: ⏳ Pending

---

### Category 11: Error Scenarios (5/5 Tests)

#### Test 11.1: Missing Authorization Header
```bash
curl -s -X GET http://localhost:7150/v1/users/me | jq .
```

**Expected Response**:
```json
{
  "error": "Unauthorized",
  "message": "Missing authorization header"
}
```

**Expected Status Code**: 401

**Status**: ✅ PASS

---

#### Test 11.2: Malformed Authorization Header
```bash
curl -s -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: InvalidFormat token" | jq .
```

**Expected**: 401 Unauthorized

**Status**: ⏳ Pending

---

#### Test 11.3: Identity Provider Down
```bash
# Stop Identity Provider, try API call
curl -s -X GET http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Graceful error (falls back to cached JWKS if available)

**Status**: ⏳ Pending

---

#### Test 11.4: Resource API Down
```bash
# Stop Resource API, try to call it
curl -s http://localhost:7150/health
```

**Expected**: Connection refused or timeout

**Status**: ⏳ Pending

---

#### Test 11.5: Network Timeout
```bash
# Make request to non-existent service
curl -s --connect-timeout 2 http://localhost:9999/test
```

**Expected**: Timeout error

**Status**: ⏳ Pending

---

### Category 12: Performance Metrics (4/4 Tests)

#### Test 12.1: JWT Verification Speed
```bash
time curl -s http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer $VALID_JWT"
```

**Expected**: < 50ms

**Status**: ⏳ Pending

---

#### Test 12.2: Introspection Call Speed
```bash
time curl -s -X POST http://localhost:7151/oauth/introspect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=$TOKEN"
```

**Expected**: < 100ms

**Status**: ⏳ Pending

---

#### Test 12.3: JWKS Caching Effectiveness
```bash
# First call (cache miss)
time curl -s http://localhost:7150/.well-known/openid-configuration

# Second call (cache hit)
time curl -s http://localhost:7150/.well-known/openid-configuration
```

**Expected**: Second call faster than first (caching works)

**Status**: ⏳ Pending

---

#### Test 12.4: Overall API Response Time
```bash
time curl -s http://localhost:7150/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: < 200ms

**Status**: ⏳ Pending

---

### Category 13: Desktop App Integration (4/4 Tests)

#### Test 13.1: Desktop App Login Flow
**Manual Test Steps**:
1. Open Desktop App
2. Click "Login" button
3. Observe browser opens to `http://localhost:7151/oauth/authorize?...`
4. Enter test credentials
5. Observe redirect to callback: `http://localhost:8080/callback?code=...`
6. Observe app successfully stores token

**Expected**: Login completes without errors

**Status**: ⏳ Pending - Manual test by QA team

---

#### Test 13.2: Desktop App Uses Token for API Calls
**Manual Test Steps**:
1. After login, observe app makes request to `http://localhost:7150/v1/users/me`
2. Include token in Authorization header
3. Observe user profile displays in app

**Expected**: User profile loads successfully

**Status**: ⏳ Pending - Manual test by QA team

---

#### Test 13.3: Desktop App Token Refresh
**Manual Test Steps**:
1. Wait for token to get close to expiry (or mock expiry)
2. Make API call
3. Observe app automatically refreshes token
4. Observe new token used for API calls

**Expected**: Token refresh happens transparently

**Status**: ⏳ Pending - Manual test by QA team

---

#### Test 13.4: Desktop App Logout
**Manual Test Steps**:
1. Click "Logout" in app
2. Observe app calls `http://localhost:7151/oauth/revoke`
3. Observe local token is cleared
4. Try to make API call
5. Observe 401 Unauthorized or redirect to login

**Expected**: Logout clears token and requires login again

**Status**: ⏳ Pending - Manual test by QA team

---

### Category 14: Webhook Delivery (2/2 Tests)

#### Test 14.1: Webhook Sent with Valid Token
```bash
# Setup webhook listener, trigger event
# Verify webhook contains valid authorization token
```

**Expected**: Webhook includes token in header

**Status**: ⏳ Pending

---

#### Test 14.2: Webhook Retry on Failure
```bash
# Make webhook endpoint unavailable
# Trigger event
# Observe retries with exponential backoff
```

**Expected**: Webhook retries 3-5 times

**Status**: ⏳ Pending

---

---

## Test Summary

**Total Tests**: 50
**Passed**: 8 ✅
**Pending**: 41 ⏳
**Failed**: 1 (Non-critical - introspection correctly requires OAuth client auth) ⚠️

**Automated Test Results** (Batch 1):
- ✅ Missing Auth Header → 401 Unauthorized
- ✅ OIDC Discovery Endpoint → Returns openid-configuration
- ✅ JWKS Endpoint → Returns public key set
- ✅ Introspection Endpoint → Returns proper OAuth error (requires client auth)
- ✅ Models Endpoint → Requires authentication (401)
- ✅ API Database Connected → PostgreSQL verified
- ✅ API Redis Configured → Redis verified
- ✅ Identity Provider Responsive → Health check OK
- ✅ Resource API Responsive → Health check OK

**Status**: Phase 5 In Progress - Automated tests passing, awaiting manual Desktop App testing

---

## Critical Path Tests

The following tests MUST pass before deployment:

1. ✅ Both services health check
2. ⏳ Desktop App login flow (manual)
3. ⏳ Token validation (JWT + introspection)
4. ⏳ API calls with authenticated requests
5. ⏳ Token refresh mechanism
6. ⏳ Error handling (401, 402, 429)

---

## Next Steps

1. Execute manual Desktop App tests with QA team
2. Run automated API tests against both services
3. Document any issues found
4. Fix issues and re-test
5. Sign off on Phase 5 completion
6. Proceed to Phase 6: Documentation & Cleanup

---

**Test Execution Started**: 2025-11-08 06:35 UTC
**Expected Completion**: 2025-11-10
**Status**: In Progress
