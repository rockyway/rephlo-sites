# Perpetual License API Test Guide (Plan 203)

This guide provides simple curl commands to test the perpetual license API endpoints for auto-activation functionality.

## Prerequisites

1. **Backend server** running on `http://localhost:7150`
2. **Identity Provider** running on `http://localhost:7151`
3. **Database seeded** with test data: `cd backend && npm run seed`

## Test User Credentials

- **Email:** `perpetual.user@example.com`
- **Password:** `TestPassword123!`
- **License Key:** `REPHLO-V1-TEST-AUTO-ACT1`
- **Active Devices:** 2/3 slots used

---

## Quick Test Scripts

### Option 1: Automated Test Scripts

**Linux/Mac:**
```bash
cd backend
chmod +x test-perpetual-license-api.sh
./test-perpetual-license-api.sh
```

**Windows PowerShell:**
```powershell
cd backend
.\test-perpetual-license-api.ps1
```

---

## Manual API Testing (curl commands)

### Step 1: Obtain Access Token

**Important:** You need to complete the full OAuth 2.0 PKCE flow to get an access token. The Identity Provider will automatically include license claims in the JWT.

#### 1.1 Generate PKCE Code Verifier and Challenge

```bash
# Generate code_verifier
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d '=' | tr '+/' '-_')
echo "Code Verifier: $CODE_VERIFIER"

# Generate code_challenge
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | base64 | tr -d '=' | tr '+/' '-_')
echo "Code Challenge: $CODE_CHALLENGE"
```

#### 1.2 Authorization Request (Open in Browser)

```
http://localhost:7151/oauth/authorize?response_type=code&client_id=rephlo-desktop-app&redirect_uri=http://localhost:7152/callback&scope=openid%20email%20profile&code_challenge={CODE_CHALLENGE}&code_challenge_method=S256&state=random_state
```

**Replace `{CODE_CHALLENGE}` with the value from Step 1.1**

- Login with: `perpetual.user@example.com` / `TestPassword123!`
- Copy the authorization code from the redirect URL

#### 1.3 Exchange Authorization Code for Access Token

```bash
# Set your authorization code
AUTH_CODE="paste_your_auth_code_here"

# Exchange for access token
curl -X POST 'http://localhost:7151/oauth/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "grant_type=authorization_code" \
  -d "code=$AUTH_CODE" \
  -d "redirect_uri=http://localhost:7152/callback" \
  -d "client_id=rephlo-desktop-app" \
  -d "code_verifier=$CODE_VERIFIER" | jq '.'
```

**Save the `access_token` from the response:**
```bash
ACCESS_TOKEN="paste_your_access_token_here"

# Save to file for reuse
echo "$ACCESS_TOKEN" > temp_token.txt
```

---

### Step 2: Inspect JWT Claims

The access token is a JWT that contains license claims. Decode it to verify:

```bash
# Decode JWT payload (second part)
echo "$ACCESS_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.'
```

**Expected License Claims:**
```json
{
  "licenseStatus": "active",
  "licenseKey": "REPHLO-V1-****-****-ACT1",
  "licenseTier": "perpetual",
  "licenseVersion": "1.0.0",
  ...
}
```

---

### Step 3: Test GET /api/licenses/me (Authenticated)

Retrieve the authenticated user's active perpetual license:

```bash
curl -X GET 'http://localhost:7150/api/licenses/me' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' | jq '.'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "licenseKey": "REPHLO-V1-TEST-AUTO-ACT1",
    "status": "active",
    "purchasedVersion": "1.0.0",
    "eligibleUntilVersion": "1.99.99",
    "maxActivations": 3,
    "activeDeviceCount": 2,
    "purchasedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### Step 4: Test POST /api/licenses/activate (Manual Activation)

Activate a new device using license key:

```bash
# Generate unique device fingerprint
DEVICE_FP="test$(openssl rand -hex 32)"

curl -X POST 'http://localhost:7150/api/licenses/activate' \
  -H 'Content-Type: application/json' \
  -d "{
    \"licenseKey\": \"REPHLO-V1-TEST-AUTO-ACT1\",
    \"deviceFingerprint\": \"$DEVICE_FP\",
    \"deviceName\": \"Test-Manual-Device\",
    \"osInfo\": \"Windows 11 Pro\"
  }" | jq '.'
```

**Expected Response (Success):**
```json
{
  "status": "success",
  "data": {
    "id": "activation-uuid",
    "licenseId": "license-uuid",
    "deviceName": "Test-Manual-Device",
    "status": "active",
    "activatedAt": "2025-01-19T12:00:00.000Z"
  }
}
```

**Expected Response (Max Activations Reached):**
```json
{
  "error": {
    "code": "max_activations_reached",
    "message": "Maximum device activations reached",
    "details": {
      "maxActivations": 3,
      "currentActivations": 3
    }
  }
}
```

---

### Step 5: Test GET /api/licenses/:licenseKey (Public - No Auth)

Get license details without authentication (proof of ownership via license key):

```bash
curl -X GET 'http://localhost:7150/api/licenses/REPHLO-V1-TEST-AUTO-ACT1' | jq '.'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "licenseKey": "REPHLO-V1-TEST-AUTO-ACT1",
    "status": "active",
    "purchasedVersion": "1.0.0",
    "eligibleUntilVersion": "1.99.99",
    "maxActivations": 3,
    "purchasedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### Step 6: Test GET /api/licenses/:licenseKey/devices (Public - No Auth)

List active devices for a license:

```bash
curl -X GET 'http://localhost:7150/api/licenses/REPHLO-V1-TEST-AUTO-ACT1/devices' | jq '.'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "activation-uuid-1",
      "deviceName": "Test-Desktop-PC",
      "osInfo": "Windows 11 Pro",
      "activatedAt": "2025-01-15T11:30:00.000Z",
      "lastSeenAt": "2025-01-19T10:00:00.000Z",
      "status": "active"
    },
    {
      "id": "activation-uuid-2",
      "deviceName": "Test-Laptop",
      "osInfo": "Windows 10 Pro",
      "activatedAt": "2025-01-16T09:15:00.000Z",
      "lastSeenAt": "2025-01-19T10:00:00.000Z",
      "status": "active"
    }
  ]
}
```

---

## Auto-Activation Flow (Desktop App Implementation)

### Overview

The desktop app should implement the following auto-activation flow:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Login with Rephlo Account"                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Desktop app opens browser for OAuth login (PKCE)            │
│    - User authenticates with email/password                    │
│    - IDP joins perpetual_license table in findAccount()        │
│    - IDP adds license claims to JWT payload                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Desktop app receives authorization code & exchanges for JWT │
│    - Extract access_token from response                        │
│    - Decode JWT to inspect license claims                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Check JWT for license claims                                │
│    - licenseStatus: "active" | null                            │
│    - licenseKey: "REPHLO-V1-****-****-XXXX" (masked)           │
│    - licenseTier: "perpetual"                                  │
│    - licenseVersion: "1.0.0"                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────┴──────────┐
                    │                    │
              licenseStatus           licenseStatus
                = "active"               = null
                    │                    │
                    ▼                    ▼
         ┌────────────────────┐   ┌─────────────────┐
         │ Auto-Activation    │   │ Manual Entry    │
         │ Flow               │   │ Flow            │
         └────────────────────┘   └─────────────────┘
                    │                    │
                    ▼                    │
   ┌────────────────────────────────┐   │
   │ 5. Call GET /api/licenses/me   │   │
   │    to get full license details │   │
   │    - licenseKey (full)         │   │
   │    - maxActivations            │   │
   │    - activeDeviceCount         │   │
   └────────────────────────────────┘   │
                    │                    │
                    ▼                    │
   ┌────────────────────────────────┐   │
   │ 6. Check if device already     │   │
   │    activated (query local DB)  │   │
   └────────────────────────────────┘   │
                    │                    │
         ┌──────────┴──────────┐         │
         │                     │         │
      Already            Not Activated   │
     Activated                │          │
         │                    ▼          │
         │    ┌───────────────────────┐  │
         │    │ 7. Generate device    │  │
         │    │    fingerprint        │  │
         │    │    (CPU+Disk+OS)      │  │
         │    └───────────────────────┘  │
         │                    │          │
         │                    ▼          │
         │    ┌───────────────────────┐  │
         │    │ 8. Call POST          │  │
         │    │    /api/licenses/     │  │
         │    │    activate           │  │
         │    └───────────────────────┘  │
         │                    │          │
         └────────────────────┼──────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │ 9. Store encrypted data:  │
              │    - License details      │
              │    - JWT (for offline)    │
              │    - Device fingerprint   │
              │    - Activation ID        │
              └───────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │ 10. Enable app features   │
              │     based on license tier │
              └───────────────────────────┘
```

### Offline Validation (30-Day Grace Period)

The desktop app should cache the JWT and license data locally in encrypted storage:

1. **JWT Caching:**
   - Store JWT in encrypted local storage (use CrossPlatformEncryptionService)
   - JWT contains license claims for offline validation
   - JWT expires after 1 hour (but can be used offline for 30 days)

2. **Offline Validation:**
   - Check JWT expiry date (ignore if < 30 days old)
   - Verify JWT signature using cached JWKS public key
   - Extract license claims from JWT
   - Check license version eligibility

3. **Re-validation:**
   - Every app launch, check if JWT is > 1 hour old
   - If online, refresh JWT via OAuth refresh token
   - If offline and JWT < 30 days old, use cached JWT
   - If offline and JWT > 30 days old, require online re-authentication

---

## Alternative: Using Refresh Token Endpoint

If you have a session ID from a previous OAuth login, you can use the refresh token endpoint mentioned by the user:

```bash
# Using session ID to obtain fresh access token
curl -X POST 'http://localhost:8080/api/refresh-token' \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"12c6bc119d3147b1a31003f8452968d5"}' | jq '.'
```

**Note:** This endpoint appears to be from a different context (port 8080). Verify the correct endpoint URL for your environment.

---

## Troubleshooting

### Issue: "Unauthorized" when calling /api/licenses/me

**Solution:** Ensure the access token is valid and included in the Authorization header:
```bash
curl -X GET 'http://localhost:7150/api/licenses/me' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -v
```

### Issue: "Max activations reached"

**Solution:** This is expected for the test license (2/3 slots used). To test activation:
1. Deactivate a device first using DELETE /api/licenses/activations/:id
2. Or create a new test license with available slots

### Issue: JWT does not contain license claims

**Solution:** Verify that:
1. User `perpetual.user@example.com` has an active perpetual license
2. Identity Provider's `findAccount()` includes perpetual_license join
3. Database seed script has run successfully

---

## Next Steps

1. **Run the seed script:** `cd backend && npm run seed`
2. **Start both servers:**
   - Backend: `cd backend && npm run dev`
   - Identity Provider: `cd identity-provider && npm run dev`
3. **Run test script:** `./test-perpetual-license-api.sh` or `.\test-perpetual-license-api.ps1`
4. **Verify all endpoints return expected responses**
5. **Implement auto-activation flow in Text Assistant WPF app**

---

## Reference Documents

- **Plan 203:** `docs/plan/203-perpetual-license-auto-activation-coordination-plan.md`
- **Plan 110:** `docs/plan/110-perpetual-plan-and-proration-strategy.md`
- **Desktop Client:** `D:\sources\demo\text-assistant\PROJECT_STRUCTURE.md`
