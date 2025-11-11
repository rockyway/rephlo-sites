# Enhanced API Endpoints

## Overview

The Enhanced API endpoints provide detailed credit information and user profile data for desktop application integration. These endpoints are designed to minimize round trips and provide all necessary information for displaying user status, credit balances, and subscription information in the desktop application.

**Key Features:**
- Detailed credit breakdown (free vs. pro credits)
- Monthly credit allocation and reset dates
- User profile with subscription tier/status
- Enhanced OAuth token response to reduce initial login round trips
- Comprehensive error handling

**Version:** 1.1.0
**Base URL:** `https://api.textassistant.com`

---

## Authentication

All endpoints require Bearer token authentication using JWT access tokens obtained through the OAuth 2.0 authorization flow.

### Authorization Header

```http
Authorization: Bearer <access_token>
```

### Required Scopes

| Endpoint | Required Scope |
|----------|----------------|
| GET /api/user/credits | `credits.read` |
| GET /api/user/profile | `user.info` |
| POST /oauth/token/enhance | None (uses access_token in body) |

### Obtaining Access Tokens

Access tokens are obtained through the standard OAuth 2.0 authorization code flow with PKCE:

1. **Authorization Request**: `GET /oauth/authorize`
2. **Token Exchange**: `POST /oauth/token`
3. **Token Refresh**: `POST /oauth/token` (with refresh_token)

See [OAuth Integration Guide](../guides/desktop-app-integration.md) for complete flow.

---

## Rate Limiting

Rate limits are enforced per user and per endpoint:

| Endpoint | Rate Limit |
|----------|------------|
| GET /api/user/credits | 60 requests/minute |
| GET /api/user/profile | 30 requests/minute |
| POST /oauth/token/enhance | 30 requests/minute |

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1730899860
```

### Rate Limit Exceeded (429)

When rate limit is exceeded:

```json
{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

**Client Handling:**
- Use cached data when rate limited
- Implement exponential backoff
- Display offline indicator if necessary

---

## Endpoints

### GET /api/user/credits

Get detailed credit usage information for the authenticated user.

**Purpose:** Retrieve separate breakdown of free credits (monthly allocation with reset date) and pro credits (purchased credits with lifetime usage).

#### Request

```http
GET /api/user/credits HTTP/1.1
Host: api.textassistant.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response (200 OK)

**Free Tier User:**
```json
{
  "freeCredits": {
    "remaining": 1500,
    "monthlyAllocation": 2000,
    "used": 500,
    "resetDate": "2025-12-01T00:00:00Z",
    "daysUntilReset": 25
  },
  "proCredits": {
    "remaining": 0,
    "purchasedTotal": 0,
    "lifetimeUsed": 0
  },
  "totalAvailable": 1500,
  "lastUpdated": "2025-11-06T14:30:00Z"
}
```

**Pro Tier User with Purchased Credits:**
```json
{
  "freeCredits": {
    "remaining": 2000,
    "monthlyAllocation": 2000,
    "used": 0,
    "resetDate": "2025-12-01T00:00:00Z",
    "daysUntilReset": 25
  },
  "proCredits": {
    "remaining": 5000,
    "purchasedTotal": 10000,
    "lifetimeUsed": 5000
  },
  "totalAvailable": 7000,
  "lastUpdated": "2025-11-06T14:30:00Z"
}
```

#### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `freeCredits.remaining` | integer | Free credits available this month |
| `freeCredits.monthlyAllocation` | integer | Total free credits allocated per month |
| `freeCredits.used` | integer | Free credits used this month |
| `freeCredits.resetDate` | ISO 8601 | When free credits reset to monthlyAllocation |
| `freeCredits.daysUntilReset` | integer | Days until reset (convenience field) |
| `proCredits.remaining` | integer | Purchased/pro credits remaining |
| `proCredits.purchasedTotal` | integer | Total pro credits ever purchased |
| `proCredits.lifetimeUsed` | integer | Pro credits used across lifetime |
| `totalAvailable` | integer | Sum of free + pro remaining |
| `lastUpdated` | ISO 8601 | When this data was last calculated |

#### Business Logic

- Free credits reset monthly on the 1st of each month at UTC midnight
- Free credits are consumed first, then pro credits
- Pro credits do not expire
- `totalAvailable` = `freeCredits.remaining` + `proCredits.remaining`

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "unauthorized",
  "error_description": "Invalid or expired access token"
}
```

**403 Forbidden (Subscription Expired)**
```json
{
  "error": "subscription_expired",
  "error_description": "Your subscription has expired. Please renew to continue.",
  "renewUrl": "https://textassistant.com/subscribe?plan=pro"
}
```

**429 Too Many Requests**
```json
{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

#### Caching

**Recommendation:**
- Cache for 5 minutes on client side
- Re-fetch after credit-consuming API calls
- Re-fetch on app startup if cached data > 5 minutes old
- Use cached data as fallback when API unavailable

---

### GET /api/user/profile

Get authenticated user's profile and account information.

**Purpose:** Retrieve complete user profile including email, subscription tier/status, preferences, and account timestamps.

#### Request

```http
GET /api/user/profile HTTP/1.1
Host: api.textassistant.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response (200 OK)

**Pro Tier User:**
```json
{
  "userId": "usr_abc123xyz",
  "email": "user@example.com",
  "displayName": "John Doe",
  "subscription": {
    "tier": "pro",
    "status": "active",
    "currentPeriodStart": "2025-11-01T00:00:00Z",
    "currentPeriodEnd": "2025-12-01T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "preferences": {
    "defaultModel": "gpt-5",
    "emailNotifications": true,
    "usageAlerts": true
  },
  "accountCreatedAt": "2024-01-15T10:30:00Z",
  "lastLoginAt": "2025-11-06T08:00:00Z"
}
```

**Free Tier User:**
```json
{
  "userId": "usr_def456uvw",
  "email": "newuser@example.com",
  "displayName": "Jane Smith",
  "subscription": {
    "tier": "free",
    "status": "active",
    "currentPeriodStart": "2025-11-01T00:00:00Z",
    "currentPeriodEnd": "2025-12-01T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "preferences": {
    "defaultModel": "gpt-4",
    "emailNotifications": true,
    "usageAlerts": true
  },
  "accountCreatedAt": "2025-10-15T14:20:00Z",
  "lastLoginAt": "2025-11-06T09:15:00Z"
}
```

#### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Unique user identifier |
| `email` | string | User's email address (verified) |
| `displayName` | string | User's display name |
| `subscription.tier` | enum | Subscription level: `free`, `pro`, `enterprise` |
| `subscription.status` | enum | Status: `active`, `cancelled`, `expired`, `trialing` |
| `subscription.currentPeriodStart` | ISO 8601 | Current billing period start |
| `subscription.currentPeriodEnd` | ISO 8601 | Current billing period end |
| `subscription.cancelAtPeriodEnd` | boolean | Whether subscription cancels at period end |
| `preferences.defaultModel` | string | User's preferred default model |
| `preferences.emailNotifications` | boolean | Email notification preference |
| `preferences.usageAlerts` | boolean | Usage alert preference |
| `accountCreatedAt` | ISO 8601 | When account was created |
| `lastLoginAt` | ISO 8601 | Last successful login timestamp |

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "unauthorized",
  "error_description": "Invalid or expired access token"
}
```

**404 Not Found**
```json
{
  "error": "not_found",
  "error_description": "User profile not found"
}
```

**429 Too Many Requests**
```json
{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

#### Caching

**Recommendation:**
- Cache for 1 hour on client side
- Re-fetch only when profile data needed (e.g., settings page)
- Use cached data as fallback when API unavailable

---

### POST /oauth/token/enhance

Enhance OAuth token response with user data and/or credits.

**Purpose:** Get user profile and credit information immediately after obtaining an access token, reducing round trips during initial login.

#### Request

```http
POST /oauth/token/enhance HTTP/1.1
Host: api.textassistant.com
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "include_user_data": "true",
  "include_credits": "false"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `access_token` | string | Yes | JWT access token from `/oauth/token` |
| `include_user_data` | string | No | "true" or "false" (default: "false") - Include full user profile and credits |
| `include_credits` | string | No | "true" or "false" (default: "false") - Include only credits (without full profile) |

**Note:** At least one of `include_user_data` or `include_credits` must be "true".

#### Response (200 OK)

**With User Data:**
```json
{
  "user": {
    "userId": "usr_abc123xyz",
    "email": "user@example.com",
    "displayName": "John Doe",
    "subscription": {
      "tier": "pro",
      "status": "active"
    },
    "credits": {
      "freeCredits": {
        "remaining": 2000,
        "monthlyAllocation": 2000,
        "resetDate": "2025-12-01T00:00:00Z"
      },
      "proCredits": {
        "remaining": 5000,
        "purchasedTotal": 10000
      },
      "totalAvailable": 7000
    }
  }
}
```

**With Credits Only:**
```json
{
  "credits": {
    "freeCredits": {
      "remaining": 1450,
      "monthlyAllocation": 2000,
      "resetDate": "2025-12-01T00:00:00Z"
    },
    "proCredits": {
      "remaining": 4800,
      "purchasedTotal": 10000
    },
    "totalAvailable": 6250
  }
}
```

#### Benefits

**Before (without enhancement):**
```
1. POST /oauth/token (get tokens)
2. GET /api/user/profile (get email)
3. GET /api/user/credits (get credits)
= 3 sequential API calls
```

**After (with enhancement):**
```
1. POST /oauth/token (get tokens)
2. POST /oauth/token/enhance (get user + credits)
= 2 API calls (33% reduction)
```

#### Error Responses

**400 Bad Request**
```json
{
  "error": "invalid_request",
  "error_description": "At least one of include_user_data or include_credits must be true"
}
```

**401 Unauthorized**
```json
{
  "error": "invalid_token",
  "error_description": "Invalid or malformed access token"
}
```

**404 Not Found**
```json
{
  "error": "user_not_found",
  "error_description": "User profile not found"
}
```

#### Use Cases

**Initial Login:**
```bash
# 1. Get access token
POST /oauth/token
  grant_type=authorization_code
  code=<auth_code>
  ...

# 2. Enhance with user data
POST /oauth/token/enhance
  access_token=<access_token>
  include_user_data=true
```

**Token Refresh:**
```bash
# 1. Refresh access token
POST /oauth/token
  grant_type=refresh_token
  refresh_token=<refresh_token>

# 2. Get updated credits
POST /oauth/token/enhance
  access_token=<new_access_token>
  include_credits=true
```

---

## Error Handling

### Common Error Codes

| Status Code | Error Code | Description | Client Action |
|-------------|-----------|-------------|---------------|
| 400 | `invalid_request` | Bad request parameters | Fix request parameters |
| 401 | `unauthorized` | Invalid/expired token | Trigger token refresh, retry once |
| 401 | `invalid_token` | Malformed token | Re-authenticate user |
| 403 | `subscription_expired` | Subscription expired | Show renewal prompt |
| 404 | `not_found` | Resource not found | Handle gracefully, log error |
| 429 | `rate_limit_exceeded` | Rate limit exceeded | Use cached data, retry after delay |
| 500 | `internal_server_error` | Server error | Retry with exponential backoff |
| 503 | `service_unavailable` | Service unavailable | Show offline indicator, use cache |

### Error Response Format

All error responses follow OAuth 2.0 error format:

```json
{
  "error": "error_code",
  "error_description": "Human-readable error description"
}
```

Some errors include additional fields:

**Subscription Expired (403):**
```json
{
  "error": "subscription_expired",
  "error_description": "Your subscription has expired. Please renew to continue.",
  "renewUrl": "https://textassistant.com/subscribe?plan=pro"
}
```

**Rate Limit Exceeded (429):**
```json
{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

### Client-Side Error Handling Example

```typescript
async function getCredits(): Promise<CreditInfo> {
  try {
    return await fetchFromAPI();
  } catch (error) {
    if (error.status === 401) {
      // Attempt token refresh
      const refreshed = await refreshToken();
      if (refreshed) {
        return await fetchFromAPI(); // Retry once
      }
      throw new Error('Please login again');
    } else if (error.status === 403) {
      // Subscription expired
      showSubscriptionRenewalPrompt(error.renewUrl);
      throw new Error('Subscription expired');
    } else if (error.status === 429) {
      // Rate limited - return cached
      if (cachedCredits) {
        logger.warn('Rate limited, using cached data');
        return cachedCredits;
      }
      throw error;
    } else {
      // Other errors - use cache if available
      if (cachedCredits) {
        logger.error('API error, using cached data', error);
        return cachedCredits;
      }
      throw error;
    }
  }
}
```

---

## Best Practices

### When to Use Each Endpoint

**GET /api/user/credits:**
- On app startup (if cache expired)
- After credit-consuming operations
- When user views dashboard/status bar
- On manual refresh request

**GET /api/user/profile:**
- On app startup (first time or cache expired)
- When user opens settings page
- After subscription changes

**POST /oauth/token/enhance:**
- Immediately after initial login (`include_user_data=true`)
- After token refresh (`include_credits=true`)
- When you need both profile and credits in one call

### Caching Strategy

**Credits (5-minute cache):**
```typescript
class CreditsService {
  private cache: CreditInfo | null = null;
  private cacheExpiry: Date | null = null;

  async getCredits(): Promise<CreditInfo> {
    // Return cache if valid
    if (this.cache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.cache;
    }

    // Fetch from API
    this.cache = await this.fetchCreditsFromAPI();
    this.cacheExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    return this.cache;
  }

  invalidateCache(): void {
    this.cacheExpiry = null;
  }
}
```

**Profile (1-hour cache):**
```typescript
class ProfileService {
  private cache: UserProfile | null = null;
  private cacheExpiry: Date | null = null;

  async getProfile(): Promise<UserProfile> {
    // Return cache if valid
    if (this.cache && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.cache;
    }

    // Fetch from API
    this.cache = await this.fetchProfileFromAPI();
    this.cacheExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return this.cache;
  }
}
```

### Handling Credit Exhaustion

When `totalAvailable` reaches 0:

```typescript
if (credits.totalAvailable === 0) {
  if (credits.freeCredits.daysUntilReset <= 7) {
    // Show "Credits reset in X days" message
    showMessage(`Your free credits reset in ${credits.freeCredits.daysUntilReset} days`);
  } else {
    // Encourage purchasing credits or upgrading
    showUpgradePrompt();
  }
}
```

### Optimizing Initial Login Flow

```typescript
// Step 1: OAuth authorization
const authCode = await startOAuthFlow();

// Step 2: Exchange code for tokens
const tokenResponse = await exchangeCodeForTokens(authCode);

// Step 3: Enhance with user data (single call for profile + credits)
const enhancement = await enhanceToken(tokenResponse.access_token, {
  include_user_data: true,
  include_credits: false
});

// Now you have:
// - tokenResponse.access_token
// - tokenResponse.refresh_token
// - enhancement.user.email
// - enhancement.user.subscription
// - enhancement.user.credits

// Save tokens securely
await secureStorage.saveTokens(tokenResponse);

// Cache user data
creditsService.setCache(enhancement.user.credits);
profileService.setCache(enhancement.user);

// Show dashboard immediately (no additional API calls needed)
showDashboard();
```

---

## Code Examples

### cURL Examples

**Get Credits:**
```bash
curl -X GET https://api.textassistant.com/api/user/credits \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Get Profile:**
```bash
curl -X GET https://api.textassistant.com/api/user/profile \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Enhance Token:**
```bash
curl -X POST https://api.textassistant.com/oauth/token/enhance \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "include_user_data": "true"
  }'
```

### JavaScript/TypeScript Examples

**Get Credits:**
```typescript
async function getCredits(accessToken: string): Promise<CreditInfo> {
  const response = await fetch('https://api.textassistant.com/api/user/credits', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}
```

**Get Profile:**
```typescript
async function getUserProfile(accessToken: string): Promise<UserProfile> {
  const response = await fetch('https://api.textassistant.com/api/user/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}
```

**Enhance Token:**
```typescript
async function enhanceToken(
  accessToken: string,
  includeUserData: boolean = true,
  includeCredits: boolean = false
): Promise<EnhancedResponse> {
  const response = await fetch('https://api.textassistant.com/oauth/token/enhance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: accessToken,
      include_user_data: includeUserData ? 'true' : 'false',
      include_credits: includeCredits ? 'true' : 'false',
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}
```

### Python Examples

**Get Credits:**
```python
import requests

def get_credits(access_token: str) -> dict:
    response = requests.get(
        'https://api.textassistant.com/api/user/credits',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    response.raise_for_status()
    return response.json()
```

**Get Profile:**
```python
def get_user_profile(access_token: str) -> dict:
    response = requests.get(
        'https://api.textassistant.com/api/user/profile',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    response.raise_for_status()
    return response.json()
```

**Enhance Token:**
```python
def enhance_token(access_token: str, include_user_data: bool = True, include_credits: bool = False) -> dict:
    response = requests.post(
        'https://api.textassistant.com/oauth/token/enhance',
        json={
            'access_token': access_token,
            'include_user_data': 'true' if include_user_data else 'false',
            'include_credits': 'true' if include_credits else 'false'
        }
    )
    response.raise_for_status()
    return response.json()
```

---

## Versioning

### Current Version: 1.1.0

All new endpoints use `/api/` prefix:
```
/api/user/credits
/api/user/profile
```

OAuth endpoints remain unversioned (standard OAuth 2.0 spec):
```
/oauth/authorize
/oauth/token
/oauth/token/enhance
/oauth/revoke
```

### Backward Compatibility

- Enhanced token response is opt-in via request parameters
- Existing clients without parameters continue to work
- New fields in responses are always optional on client-side
- No breaking changes to existing endpoints

---

## Support

For API support, please contact:

- **Email**: support@textassistant.com
- **Documentation**: https://docs.textassistant.com
- **Status Page**: https://status.textassistant.com

For bug reports and feature requests, please use our GitHub issue tracker.
