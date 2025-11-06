# Dedicated API - Credits & User Information Endpoints

**Document:** docs/plan/080-dedicated-api-credits-user-endpoints.md
**Created:** 2025-11-06
**Status:** API Specification
**Priority:** P0 (Required for 079 - Enhanced Welcome Experience)
**Related:**
- docs/plan/077-dedicated-api-oauth-integration.md (OAuth foundation)
- docs/plan/079-enhanced-welcome-first-time-engagement.md (client requirements)

## Executive Summary

This document specifies the backend API enhancements required to support the Enhanced Welcome Experience implementation (079). The primary additions are:

1. **Enhanced Credits Endpoint** - Returns detailed credit information including monthly allocation, reset date, and breakdown by credit type (free vs. pro)
2. **Enhanced Token Response** - OAuth token endpoint returns initial user data including credits to reduce round trips
3. **User Profile Endpoint** - Returns user account information (email, subscription tier, preferences)

These endpoints enable the client to display credit usage, monthly reset dates, and user account information in the dashboard and status bar.

---

## Current State Analysis

### From 077 - Existing OAuth Endpoints

**Currently Defined:**
```
Authorization: https://api.textassistant.com/oauth/authorize
Token:         https://api.textassistant.com/oauth/token
Refresh:       https://api.textassistant.com/oauth/refresh
Revoke:        https://api.textassistant.com/oauth/revoke
Models:        https://api.textassistant.com/v1/models
```

**Currently Missing (Required for 079):**
- Credits endpoint with detailed breakdown
- User profile endpoint
- Enhanced token response with initial user data

### Gap Analysis

| Requirement (from 079) | Current State | Required Change |
|------------------------|---------------|-----------------|
| Free credits remaining | ❌ Not available | New credits endpoint |
| Monthly credit allocation | ❌ Not available | Credits endpoint field |
| Credit reset date | ❌ Not available | Credits endpoint field |
| Pro/purchased credits | ❌ Not available | Credits endpoint breakdown |
| User email | ❌ Not available | Token response or user endpoint |
| Subscription tier | ❌ Not available | User profile endpoint |
| Initial data on login | ❌ Requires 2+ API calls | Enhanced token response |

---

## New API Endpoints Specification

### 1. GET /api/user/credits

**Purpose:** Retrieve detailed credit usage information for the authenticated user

**Authentication:** Required (Bearer token)

**Request:**
```http
GET /api/user/credits HTTP/1.1
Host: api.textassistant.com
Authorization: Bearer eyJhbGc...
```

**Response (Success - Free Tier User):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

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

**Response (Success - Pro Tier User):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

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

**Response (Error - Unauthenticated):**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "unauthorized",
  "error_description": "Invalid or expired access token"
}
```

**Response (Error - Subscription Expired):**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": "subscription_expired",
  "error_description": "Your subscription has expired. Please renew to continue.",
  "renewUrl": "https://textassistant.com/subscribe?plan=pro"
}
```

**Field Definitions:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `freeCredits.remaining` | integer | Free credits available this month | 1500 |
| `freeCredits.monthlyAllocation` | integer | Total free credits allocated per month | 2000 |
| `freeCredits.used` | integer | Free credits used this month | 500 |
| `freeCredits.resetDate` | ISO 8601 datetime | When free credits reset to monthlyAllocation | 2025-12-01T00:00:00Z |
| `freeCredits.daysUntilReset` | integer | Days until reset (convenience field) | 25 |
| `proCredits.remaining` | integer | Purchased/pro credits remaining | 5000 |
| `proCredits.purchasedTotal` | integer | Total pro credits ever purchased | 10000 |
| `proCredits.lifetimeUsed` | integer | Pro credits used across lifetime | 5000 |
| `totalAvailable` | integer | Sum of free + pro remaining | 7000 |
| `lastUpdated` | ISO 8601 datetime | When this data was last calculated | 2025-11-06T14:30:00Z |

**Business Logic:**
- Free credits reset monthly on the user's billing cycle date
- Free credits are consumed first, then pro credits
- Pro credits do not expire
- `totalAvailable` = `freeCredits.remaining` + `proCredits.remaining`

**Rate Limiting:**
- 60 requests per minute per user
- 429 Too Many Requests if exceeded

**Caching:**
- Client should cache this response for 5 minutes
- Re-fetch after credit-consuming API calls
- Re-fetch on app startup if cached data > 5 minutes old

---

### 2. GET /api/user/profile

**Purpose:** Retrieve authenticated user's profile and account information

**Authentication:** Required (Bearer token)

**Request:**
```http
GET /api/user/profile HTTP/1.1
Host: api.textassistant.com
Authorization: Bearer eyJhbGc...
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

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

**Response (Error - Unauthenticated):**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "unauthorized",
  "error_description": "Invalid or expired access token"
}
```

**Field Definitions:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `userId` | string | Unique user identifier | usr_abc123xyz |
| `email` | string | User's email address (verified) | user@example.com |
| `displayName` | string | User's display name | John Doe |
| `subscription.tier` | enum | Subscription level: free, pro, enterprise | pro |
| `subscription.status` | enum | active, cancelled, expired, trialing | active |
| `subscription.currentPeriodStart` | ISO 8601 | Current billing period start | 2025-11-01T00:00:00Z |
| `subscription.currentPeriodEnd` | ISO 8601 | Current billing period end | 2025-12-01T00:00:00Z |
| `subscription.cancelAtPeriodEnd` | boolean | Whether subscription cancels at period end | false |
| `preferences.defaultModel` | string | User's preferred default model | gpt-5 |
| `preferences.emailNotifications` | boolean | Email notification preference | true |
| `preferences.usageAlerts` | boolean | Usage alert preference | true |
| `accountCreatedAt` | ISO 8601 | When account was created | 2024-01-15T10:30:00Z |
| `lastLoginAt` | ISO 8601 | Last successful login timestamp | 2025-11-06T08:00:00Z |

**Rate Limiting:**
- 30 requests per minute per user

**Caching:**
- Client should cache for 1 hour
- Re-fetch only when profile data needed (settings page)

---

### 3. POST /oauth/token (Enhanced Response)

**Purpose:** Exchange authorization code for tokens AND initial user data (reduces round trips)

**Changes from 077:** Add optional `include_user_data` parameter to return user profile and credits in token response

**Request:**
```http
POST /oauth/token HTTP/1.1
Host: api.textassistant.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=auth_code_here&
redirect_uri=http://localhost:8080/callback&
client_id=textassistant-desktop&
code_verifier=pkce_verifier_here&
include_user_data=true
```

**Response (Success - Enhanced with User Data):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGc...",
  "refresh_token": "def50200...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "llm.inference models.read user.info",

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

**Response (Success - Standard, No User Data):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGc...",
  "refresh_token": "def50200...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "llm.inference models.read user.info"
}
```

**Benefits of Enhanced Response:**
- Reduces client round trips from 3 (token + profile + credits) to 1
- Faster initial load after OAuth login
- Better user experience (see credits immediately)

**Backward Compatibility:**
- `include_user_data` parameter is optional (defaults to `false`)
- Existing clients (without parameter) continue to work
- New clients can opt-in to enhanced response

---

### 4. POST /oauth/token (Refresh Token - Enhanced)

**Purpose:** Refresh access token AND optionally get updated credits

**Request:**
```http
POST /oauth/token HTTP/1.1
Host: api.textassistant.com
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=def50200...&
client_id=textassistant-desktop&
include_credits=true
```

**Response (Success - With Credits):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGc...",
  "refresh_token": "def50200...",
  "token_type": "Bearer",
  "expires_in": 3600,

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

**Use Case:**
- Background token refresh can also update credits count
- Reduces need for separate credits API call
- Keeps UI credit display current

---

## Data Models

### CreditsResponse

```typescript
interface CreditsResponse {
  freeCredits: FreeCreditsInfo;
  proCredits: ProCreditsInfo;
  totalAvailable: number;
  lastUpdated: string; // ISO 8601
}

interface FreeCreditsInfo {
  remaining: number;
  monthlyAllocation: number;
  used: number;
  resetDate: string; // ISO 8601
  daysUntilReset: number;
}

interface ProCreditsInfo {
  remaining: number;
  purchasedTotal: number;
  lifetimeUsed: number;
}
```

### UserProfileResponse

```typescript
interface UserProfileResponse {
  userId: string;
  email: string;
  displayName: string;
  subscription: SubscriptionInfo;
  preferences: UserPreferences;
  accountCreatedAt: string; // ISO 8601
  lastLoginAt: string; // ISO 8601
}

interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  currentPeriodStart: string; // ISO 8601
  currentPeriodEnd: string; // ISO 8601
  cancelAtPeriodEnd: boolean;
}

interface UserPreferences {
  defaultModel: string;
  emailNotifications: boolean;
  usageAlerts: boolean;
}
```

### EnhancedTokenResponse

```typescript
interface EnhancedTokenResponse extends TokenResponse {
  user?: {
    userId: string;
    email: string;
    displayName: string;
    subscription: {
      tier: string;
      status: string;
    };
    credits: CreditsResponse;
  };
}
```

---

## Client Implementation Changes

### Service Layer Updates

**New Service: `DedicatedAPICreditsService`**

```csharp
// TextAssistant.Core/Services/Credits/IDedicatedAPICreditsService.cs
public interface IDedicatedAPICreditsService
{
    Task<CreditInfo> GetCreditsAsync();
    Task RefreshCreditsAsync();
    CreditInfo? GetCachedCredits();
    event EventHandler<CreditInfo> CreditsUpdated;
}

// TextAssistant.Core/Models/CreditInfo.cs
public class CreditInfo
{
    public FreeCreditInfo FreeCredits { get; set; }
    public ProCreditInfo ProCredits { get; set; }
    public int TotalAvailable { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class FreeCreditInfo
{
    public int Remaining { get; set; }
    public int MonthlyAllocation { get; set; }
    public int Used { get; set; }
    public DateTime ResetDate { get; set; }
    public int DaysUntilReset { get; set; }

    // Computed property
    public double UsagePercentage =>
        MonthlyAllocation > 0
            ? (double)Used / MonthlyAllocation * 100
            : 0;
}

public class ProCreditInfo
{
    public int Remaining { get; set; }
    public int PurchasedTotal { get; set; }
    public int LifetimeUsed { get; set; }
}
```

**Updated Service: `IDedicatedAPIOAuthService`**

```csharp
// TextAssistant.Core/Services/OAuth/IDedicatedAPIOAuthService.cs
public interface IDedicatedAPIOAuthService
{
    // Existing methods
    Task<OAuthResult> StartLoginFlowAsync();
    Task<OAuthResult> HandleCallbackAsync(string authorizationCode, string state);
    Task<bool> RefreshTokenAsync();
    Task RevokeTokenAsync();
    Task<DedicatedAPIToken?> GetCurrentTokenAsync();
    bool IsAuthenticated();

    // NEW: Enhanced login with user data
    Task<EnhancedOAuthResult> StartLoginFlowWithUserDataAsync();

    // NEW: Get user profile
    Task<UserProfile> GetUserProfileAsync();
}

public class EnhancedOAuthResult : OAuthResult
{
    public UserProfile? User { get; set; }
    public CreditInfo? Credits { get; set; }
}

public class UserProfile
{
    public string UserId { get; set; }
    public string Email { get; set; }
    public string DisplayName { get; set; }
    public SubscriptionInfo Subscription { get; set; }
    public DateTime AccountCreatedAt { get; set; }
    public DateTime LastLoginAt { get; set; }
}
```

### API Client Implementation

```csharp
// TextAssistant.Core/Services/Credits/DedicatedAPICreditsService.cs
public class DedicatedAPICreditsService : IDedicatedAPICreditsService
{
    private readonly HttpClient _httpClient;
    private readonly IDedicatedAPITokenManager _tokenManager;
    private readonly ILogger<DedicatedAPICreditsService> _logger;

    private CreditInfo? _cachedCredits;
    private DateTime _cacheExpiry;
    private readonly TimeSpan _cacheLifetime = TimeSpan.FromMinutes(5);

    public event EventHandler<CreditInfo>? CreditsUpdated;

    public async Task<CreditInfo> GetCreditsAsync()
    {
        // Return cached if valid
        if (_cachedCredits != null && DateTime.UtcNow < _cacheExpiry)
        {
            return _cachedCredits;
        }

        // Fetch from API
        var token = await _tokenManager.GetTokenAsync();
        if (token == null)
            throw new UnauthorizedException("Not authenticated");

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/user/credits");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);

        var response = await _httpClient.SendAsync(request);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            // Token expired, trigger refresh
            await _tokenManager.RefreshTokenIfNeededAsync();
            // Retry
            return await GetCreditsAsync();
        }

        response.EnsureSuccessStatusCode();

        var creditsResponse = await response.Content.ReadFromJsonAsync<CreditsApiResponse>();

        _cachedCredits = MapToCredits(creditsResponse);
        _cacheExpiry = DateTime.UtcNow.Add(_cacheLifetime);

        CreditsUpdated?.Invoke(this, _cachedCredits);

        return _cachedCredits;
    }

    public CreditInfo? GetCachedCredits() => _cachedCredits;

    public async Task RefreshCreditsAsync()
    {
        _cacheExpiry = DateTime.MinValue; // Invalidate cache
        await GetCreditsAsync();
    }
}
```

---

## Integration with 079 - Enhanced Welcome Flow

### Initial Login Flow

```
1. User clicks "Login" on Welcome Screen
   ↓
2. OAuth flow with include_user_data=true
   ↓
3. Token response includes user profile + credits
   ↓
4. Client stores:
   - Access token (encrypted)
   - Refresh token (encrypted)
   - User email
   - Credits info (cached)
   ↓
5. Welcome screen shows success
   ↓
6. Dashboard displays credits without additional API call
```

**Code Example:**

```csharp
// WelcomeScreenViewModel.cs
private async Task LoginAsync()
{
    IsLoading = true;
    StatusMessage = "Opening login page...";

    // Use enhanced login flow
    var result = await _oauthService.StartLoginFlowWithUserDataAsync();

    if (result.Success)
    {
        StatusMessage = "Login successful!";

        // User data already available from token response
        var userEmail = result.User?.Email;
        var credits = result.Credits;

        // Create/update Dedicated provider
        var provider = await _providerRepository.GetOrCreateDedicatedProviderAsync(
            defaultModel: result.User?.Subscription?.DefaultModel ?? "gpt-5"
        );
        provider.IsActive = true;
        provider.IsHidden = true;
        await _providerRepository.UpdateAsync(provider);

        // Close welcome screen
        _window.DialogResult = true;
        _window.Close();
    }
    else
    {
        StatusMessage = $"Login failed: {result.Error}";
    }

    IsLoading = false;
}
```

### Dashboard Credits Display

```csharp
// DashboardViewModel.cs
public class DashboardViewModel : ObservableObject
{
    private readonly IDedicatedAPICreditsService _creditsService;

    public int FreeCreditsRemaining => _creditsService.GetCachedCredits()?.FreeCredits.Remaining ?? 0;
    public int FreeCreditsMonthlyAllocation => _creditsService.GetCachedCredits()?.FreeCredits.MonthlyAllocation ?? 0;
    public string FreeCreditsResetText => FormatResetDate(_creditsService.GetCachedCredits()?.FreeCredits.ResetDate);
    public double FreeCreditsPercentage => _creditsService.GetCachedCredits()?.FreeCredits.UsagePercentage ?? 0;

    public int ProCreditsRemaining => _creditsService.GetCachedCredits()?.ProCredits.Remaining ?? 0;
    public bool HasProCredits => ProCreditsRemaining > 0;

    public async Task InitializeAsync()
    {
        if (_oauthService.IsAuthenticated())
        {
            // Load credits (uses cache if available)
            await _creditsService.GetCreditsAsync();
        }

        // Subscribe to credit updates
        _creditsService.CreditsUpdated += OnCreditsUpdated;
    }

    private void OnCreditsUpdated(object? sender, CreditInfo credits)
    {
        OnPropertyChanged(nameof(FreeCreditsRemaining));
        OnPropertyChanged(nameof(FreeCreditsMonthlyAllocation));
        OnPropertyChanged(nameof(FreeCreditsResetText));
        OnPropertyChanged(nameof(FreeCreditsPercentage));
        OnPropertyChanged(nameof(ProCreditsRemaining));
        OnPropertyChanged(nameof(HasProCredits));
    }

    private string FormatResetDate(DateTime? resetDate)
    {
        if (!resetDate.HasValue) return "";

        var days = (resetDate.Value - DateTime.UtcNow).Days;

        if (days == 0) return "Resets today";
        if (days == 1) return "Resets tomorrow";
        return $"Resets in {days} days ({resetDate.Value:MMM d})";
    }
}
```

---

## Error Handling

### Credits API Errors

| Status Code | Error Code | Client Handling |
|-------------|-----------|-----------------|
| 401 | `unauthorized` | Trigger token refresh, retry once |
| 403 | `subscription_expired` | Show subscription renewal prompt |
| 429 | `rate_limit_exceeded` | Use cached credits, retry after 60s |
| 500 | `internal_server_error` | Log error, show cached credits, retry with exponential backoff |
| 503 | `service_unavailable` | Show offline indicator, use cached data |

**Client-side Error Recovery:**

```csharp
public async Task<CreditInfo> GetCreditsAsync()
{
    try
    {
        return await FetchFromApiAsync();
    }
    catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.Unauthorized)
    {
        // Attempt token refresh
        var refreshed = await _tokenManager.RefreshTokenIfNeededAsync();
        if (refreshed)
        {
            return await FetchFromApiAsync(); // Retry once
        }
        throw new UnauthorizedException("Please login again");
    }
    catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.Forbidden)
    {
        // Subscription expired
        throw new SubscriptionExpiredException("Please renew your subscription");
    }
    catch (HttpRequestException ex) when (ex.StatusCode == (HttpStatusCode)429)
    {
        // Rate limited - return cached
        if (_cachedCredits != null)
        {
            _logger.LogWarning("Credits API rate limited, returning cached data");
            return _cachedCredits;
        }
        throw;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to fetch credits");

        // Return cached if available
        if (_cachedCredits != null)
        {
            return _cachedCredits;
        }

        throw;
    }
}
```

---

## Performance Considerations

### Caching Strategy

**Credits Endpoint:**
- Cache lifetime: 5 minutes
- Invalidate on: Credit-consuming API call, manual refresh, token refresh
- Fallback: Return cached data on API errors

**User Profile Endpoint:**
- Cache lifetime: 1 hour
- Invalidate on: User explicitly opens settings, logout/login
- Fallback: Return cached data on API errors

**Enhanced Token Response:**
- No caching needed (one-time login flow)
- Immediately populate credits cache from response

### API Call Reduction

**Before (Current):**
```
Login flow:
1. POST /oauth/token (get tokens)
2. GET /api/user/profile (get email)
3. GET /api/user/credits (get credits)
4. GET /v1/models (get available models)
= 4 sequential API calls
```

**After (Enhanced):**
```
Login flow:
1. POST /oauth/token?include_user_data=true (get tokens + user + credits)
2. GET /v1/models (get available models)
= 2 API calls (50% reduction)
```

### Real-Time Updates

**Credits Updates After API Usage:**

```csharp
// After a completion request
public async Task<string> GetCompletionAsync(string prompt, ...)
{
    var result = await CallAPIAsync(...);

    // Refresh credits in background (non-blocking)
    _ = Task.Run(async () => {
        try
        {
            await _creditsService.RefreshCreditsAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Background credits refresh failed");
        }
    });

    return result;
}
```

---

## Security Considerations

### PII (Personally Identifiable Information)

**Data Classification:**
- `email`: PII - Sensitive
- `displayName`: PII - Less sensitive
- `userId`: Non-PII identifier
- Credits data: Non-PII

**Storage:**
- Email: Store in memory only, not persisted to database
- Display name: Store in memory only
- Credits: Can be cached in memory

**Logging:**
- Never log email addresses
- Never log full user profiles
- Log only userId for debugging

**Example Logging:**

```csharp
// ❌ BAD
_logger.LogInformation("User {email} logged in with {credits} credits", user.Email, credits);

// ✅ GOOD
_logger.LogInformation("User {userId} logged in successfully", user.UserId);
```

### Token Scopes

**Required Scopes:**
- `user.info` - Access to user profile endpoint
- `credits.read` - Access to credits endpoint
- `llm.inference` - Make LLM API requests
- `models.read` - List available models

**Scope Validation:**
- Server validates scopes on each request
- Client requests all necessary scopes in authorization URL
- Refresh token maintains original scopes

---

## Testing Strategy

### Unit Tests

**Credits Service Tests:**
```csharp
[Fact]
public async Task GetCreditsAsync_WhenCacheValid_ReturnsCache()
{
    // Arrange
    var cachedCredits = new CreditInfo { ... };
    _service.SetCache(cachedCredits, DateTime.UtcNow.AddMinutes(5));

    // Act
    var result = await _service.GetCreditsAsync();

    // Assert
    Assert.Equal(cachedCredits, result);
    _httpClient.Verify(x => x.SendAsync(It.IsAny<HttpRequestMessage>()), Times.Never);
}

[Fact]
public async Task GetCreditsAsync_When401_RefreshesTokenAndRetries()
{
    // Arrange
    _httpClient.SetupSequence(x => x.SendAsync(It.IsAny<HttpRequestMessage>()))
        .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.Unauthorized))
        .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = ... });

    // Act
    var result = await _service.GetCreditsAsync();

    // Assert
    _tokenManager.Verify(x => x.RefreshTokenIfNeededAsync(), Times.Once);
    _httpClient.Verify(x => x.SendAsync(It.IsAny<HttpRequestMessage>()), Times.Exactly(2));
}
```

### Integration Tests (Mock Server)

**Mock Credits Endpoint:**
```csharp
[Test]
public async Task EndToEnd_Login_FetchesCreditsAutomatically()
{
    // Start mock OAuth server
    var mockServer = new MockOAuthServer();
    mockServer.SetupTokenResponse(new EnhancedTokenResponse
    {
        AccessToken = "mock_token",
        User = new UserProfile
        {
            Email = "test@example.com",
            UserId = "usr_123"
        },
        Credits = new CreditInfo
        {
            FreeCredits = new FreeCreditInfo { Remaining = 2000 },
            ProCredits = new ProCreditInfo { Remaining = 0 }
        }
    });

    // Execute login flow
    var result = await _oauthService.StartLoginFlowWithUserDataAsync();

    // Assert
    Assert.True(result.Success);
    Assert.Equal("test@example.com", result.User.Email);
    Assert.Equal(2000, result.Credits.FreeCredits.Remaining);
}
```

---

## Migration & Rollout

### Phase 1: Backend API Implementation

**Week 1:**
- Implement `/api/user/credits` endpoint
- Implement `/api/user/profile` endpoint
- Add unit tests for business logic

**Week 2:**
- Enhance `/oauth/token` with `include_user_data` parameter
- Enhance `/oauth/token` (refresh) with `include_credits` parameter
- Add integration tests

### Phase 2: Client Integration

**Week 3:**
- Implement `DedicatedAPICreditsService`
- Update `DedicatedAPIOAuthService` for enhanced responses
- Create credit data models
- Add caching logic

**Week 4:**
- Integrate with Dashboard UI
- Integrate with Status Bar
- Add error handling
- Client-side testing

### Phase 3: Testing & Rollout

**Week 5:**
- End-to-end testing with staging API
- Performance testing (caching, API latency)
- Security review

**Week 6:**
- Beta rollout to 10% users
- Monitor API response times, error rates
- Gather user feedback

**Week 7:**
- Production rollout to 100% users
- Monitor metrics
- Bug fixes

---

## API Versioning

### Endpoint Versioning

All new endpoints use `/api/v1/` prefix:
```
/api/v1/user/credits
/api/v1/user/profile
```

OAuth endpoints remain unversioned (standard OAuth 2.0 spec):
```
/oauth/authorize
/oauth/token
/oauth/revoke
```

### Backward Compatibility

- Enhanced token response is opt-in (`include_user_data` parameter)
- Existing clients without parameter continue to work
- New fields added to responses are always optional on client-side

---

## Monitoring & Metrics

### Backend Metrics

**API Endpoint Metrics:**
- Request count per endpoint
- Response time (p50, p95, p99)
- Error rate by status code
- Cache hit rate (if backend caches)

**Key Metrics:**
```
- GET /api/user/credits - Requests/min, avg response time
- GET /api/user/profile - Requests/min, avg response time
- POST /oauth/token (enhanced) - Adoption rate (with vs without include_user_data)
```

### Client Metrics

**Credits Service:**
- Cache hit rate (% of requests served from cache)
- API call frequency
- Error rate by error type

**User Experience:**
- Time to display credits after login (target: < 1 second)
- Credits display accuracy (compare client vs server)

---

## Open Questions for Backend Team

1. **Q: What is the default monthly free credit allocation?**
   - A: TBD - Suggest 2,000 credits for free tier

2. **Q: When do free credits reset? (UTC midnight, user's timezone, billing cycle date?)**
   - A: TBD - Recommend first day of month at UTC midnight for simplicity

3. **Q: Do pro credits expire?**
   - A: TBD - Recommend no expiration for purchased credits

4. **Q: What happens when user downgrades from Pro to Free?**
   - A: TBD - Recommend: Unused pro credits remain available, but no new pro credits

5. **Q: Should the API return credit costs per model (e.g., GPT-5 = 10 credits/request)?**
   - A: TBD - Future enhancement, not required for 079

6. **Q: Rate limiting strategy for credits endpoint?**
   - A: TBD - Recommend 60 req/min (same as models endpoint)

7. **Q: Should credits endpoint return usage history (last 30 days)?**
   - A: TBD - Not required for 079, can be future enhancement

---

## Acceptance Criteria

### Backend API

- [ ] `/api/user/credits` returns all required fields per spec
- [ ] `/api/user/profile` returns user profile with subscription info
- [ ] `/oauth/token` supports `include_user_data=true` parameter
- [ ] Enhanced token response includes user + credits
- [ ] All endpoints return proper error codes (401, 403, 429, 500)
- [ ] Rate limiting implemented per spec
- [ ] API documentation published (OpenAPI/Swagger)
- [ ] Integration tests pass with mock data

### Client Integration

- [ ] `DedicatedAPICreditsService` fetches and caches credits
- [ ] Enhanced OAuth flow retrieves user data in single request
- [ ] Dashboard displays free credits with reset date
- [ ] Dashboard displays pro credits for eligible users
- [ ] Status bar shows credit count
- [ ] Credits auto-refresh after API usage
- [ ] Error handling gracefully handles all API errors
- [ ] Cached credits used as fallback when API unavailable

### Performance

- [ ] Initial login flow completes in < 3 seconds
- [ ] Credits API response time < 500ms (p95)
- [ ] Cache hit rate > 80% for credits endpoint
- [ ] UI updates credits display within 100ms of cache update

---

## Conclusion

This API specification defines the backend endpoints required to support the Enhanced Welcome Experience (079). The key additions are:

1. **Detailed credits endpoint** with free/pro breakdown, monthly allocation, and reset dates
2. **User profile endpoint** for account information
3. **Enhanced OAuth token response** to reduce initial login round trips

By implementing these endpoints, the client can deliver a rich, informative user experience with minimal API calls and excellent performance through strategic caching.

**Next Steps:**
1. Backend team reviews and approves API specification
2. Backend implements endpoints per spec (Weeks 1-2)
3. Client team begins integration (Week 3, pending backend staging deployment)
4. Joint testing and refinement (Weeks 4-5)
5. Production rollout (Weeks 6-7)
