# Desktop Application Integration Guide

Complete guide for integrating Text Assistant Enhanced API into desktop applications using OAuth 2.0 with PKCE.

## Table of Contents

1. [Quick Start](#quick-start)
2. [OAuth 2.0 Flow](#oauth-20-flow)
3. [API Integration](#api-integration)
4. [Common Use Cases](#common-use-cases)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 5-Minute Integration

**Step 1: Obtain OAuth Credentials**

Contact support@textassistant.com to register your desktop application and receive:
- Client ID
- Redirect URI (use `http://localhost:PORT/callback` for desktop apps)

**Step 2: Install HTTP Client**

```bash
# Node.js/Electron
npm install axios

# Python
pip install requests

# .NET/C#
# Use built-in HttpClient
```

**Step 3: Implement OAuth Flow**

See [OAuth 2.0 Flow](#oauth-20-flow) section below for detailed implementation.

**Step 4: Call Enhanced API**

```typescript
// Get user data and credits after login
const enhancement = await fetch('https://api.textassistant.com/oauth/token/enhance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    access_token: accessToken,
    include_user_data: 'true'
  })
});

const data = await enhancement.json();
// Now you have: data.user.email, data.user.subscription, data.user.credits
```

---

## OAuth 2.0 Flow

### Overview

Text Assistant uses OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure desktop application authentication.

**Flow Diagram:**

```
Desktop App               Browser              API Server
     |                       |                     |
     |--1. Generate PKCE---->|                     |
     |--2. Open Browser----->|                     |
     |                       |--3. Authorize------>|
     |                       |<--4. Auth Code------|
     |<--5. Redirect---------|                     |
     |--6. Exchange Code----------------------->   |
     |<--7. Access Token------------------------|   |
     |--8. Enhance Token----------------------->   |
     |<--9. User Data + Credits-----------------|   |
```

### Step 1: Generate PKCE Challenge

PKCE prevents authorization code interception by using a cryptographic challenge.

**Generate Code Verifier:**

```typescript
// TypeScript/JavaScript
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function base64UrlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

```python
# Python
import secrets
import base64

def generate_code_verifier():
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8')
    return code_verifier.rstrip('=')
```

```csharp
// C#
private static string GenerateCodeVerifier()
{
    var bytes = new byte[32];
    using (var rng = RandomNumberGenerator.Create())
    {
        rng.GetBytes(bytes);
    }
    return Base64UrlEncode(bytes);
}

private static string Base64UrlEncode(byte[] input)
{
    return Convert.ToBase64String(input)
        .TrimEnd('=')
        .Replace('+', '-')
        .Replace('/', '_');
}
```

**Generate Code Challenge:**

```typescript
// TypeScript/JavaScript (Node.js)
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}
```

```python
# Python
import hashlib

def generate_code_challenge(verifier):
    digest = hashlib.sha256(verifier.encode('utf-8')).digest()
    challenge = base64.urlsafe_b64encode(digest).decode('utf-8')
    return challenge.rstrip('=')
```

```csharp
// C#
private static string GenerateCodeChallenge(string verifier)
{
    using (var sha256 = SHA256.Create())
    {
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(verifier));
        return Base64UrlEncode(hash);
    }
}
```

### Step 2: Open Authorization URL

**Build Authorization URL:**

```typescript
const authUrl = new URL('https://api.textassistant.com/oauth/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
authUrl.searchParams.set('redirect_uri', 'http://localhost:8080/callback');
authUrl.searchParams.set('scope', 'llm.inference models.read user.info credits.read');
authUrl.searchParams.set('state', generateRandomState());
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

// Open in system browser
openBrowser(authUrl.toString());
```

**Required Parameters:**

| Parameter | Value | Description |
|-----------|-------|-------------|
| `response_type` | `code` | Use authorization code flow |
| `client_id` | Your client ID | Provided by Text Assistant |
| `redirect_uri` | `http://localhost:PORT/callback` | Must match registered URI |
| `scope` | Space-separated scopes | See [Scopes](#scopes) below |
| `state` | Random string | CSRF protection |
| `code_challenge` | SHA256 hash of verifier | PKCE challenge |
| `code_challenge_method` | `S256` | SHA256 hashing |

**Scopes:**

| Scope | Permission |
|-------|------------|
| `llm.inference` | Make LLM API requests |
| `models.read` | List available models |
| `user.info` | Access user profile |
| `credits.read` | Access credit information |

### Step 3: Start Local HTTP Server

Listen for the authorization callback:

```typescript
// TypeScript/Node.js
import http from 'http';

function startCallbackServer(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error: No authorization code received</h1>');
        reject(new Error('No authorization code'));
        return;
      }

      // Success page
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Login Successful!</h1><p>You can close this window.</p>');

      server.close();
      resolve(code);
    });

    server.listen(port, () => {
      console.log(`Callback server listening on port ${port}`);
    });
  });
}
```

```python
# Python
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

class CallbackHandler(BaseHTTPRequestHandler):
    auth_code = None

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        code = query.get('code', [None])[0]

        if code:
            CallbackHandler.auth_code = code
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<h1>Login Successful!</h1><p>You can close this window.</p>')
        else:
            self.send_response(400)
            self.end_headers()

def start_callback_server(port):
    server = HTTPServer(('localhost', port), CallbackHandler)
    thread = threading.Thread(target=server.serve_forever)
    thread.daemon = True
    thread.start()
    return server
```

```csharp
// C# (.NET)
using System.Net;
using System.Web;

private static async Task<string> StartCallbackServer(int port)
{
    var listener = new HttpListener();
    listener.Prefixes.Add($"http://localhost:{port}/callback/");
    listener.Start();

    var context = await listener.GetContextAsync();
    var query = HttpUtility.ParseQueryString(context.Request.Url.Query);
    var code = query["code"];

    var response = context.Response;
    var buffer = Encoding.UTF8.GetBytes(
        "<h1>Login Successful!</h1><p>You can close this window.</p>"
    );
    response.ContentLength64 = buffer.Length;
    await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
    response.Close();

    listener.Stop();
    return code;
}
```

### Step 4: Exchange Authorization Code for Tokens

```typescript
// TypeScript/Node.js
async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const response = await fetch('https://api.textassistant.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'http://localhost:8080/callback',
      client_id: 'YOUR_CLIENT_ID',
      code_verifier: codeVerifier
    })
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return await response.json();
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "def50200...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "llm.inference models.read user.info credits.read"
}
```

### Step 5: Enhance Token Response (Optional but Recommended)

Get user profile and credits in a single request:

```typescript
async function enhanceToken(accessToken: string): Promise<EnhancedData> {
  const response = await fetch('https://api.textassistant.com/oauth/token/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      include_user_data: 'true'
    })
  });

  return await response.json();
}
```

**Response:**

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

### Step 6: Store Tokens Securely

**Important:** Always encrypt tokens before storing!

```typescript
// TypeScript/Electron
import { safeStorage } from 'electron';

function saveTokens(accessToken: string, refreshToken: string) {
  const encrypted = safeStorage.encryptString(JSON.stringify({
    accessToken,
    refreshToken,
    expiresAt: Date.now() + 3600000 // 1 hour
  }));

  // Store encrypted buffer
  localStorage.setItem('auth_tokens', encrypted.toString('base64'));
}

function loadTokens(): { accessToken: string; refreshToken: string } | null {
  const encrypted = localStorage.getItem('auth_tokens');
  if (!encrypted) return null;

  const buffer = Buffer.from(encrypted, 'base64');
  const decrypted = safeStorage.decryptString(buffer);
  return JSON.parse(decrypted);
}
```

```csharp
// C# (.NET)
using System.Security.Cryptography;

private void SaveTokens(string accessToken, string refreshToken)
{
    var tokens = new { accessToken, refreshToken, expiresAt = DateTime.UtcNow.AddHours(1) };
    var json = JsonSerializer.Serialize(tokens);
    var encrypted = ProtectedData.Protect(
        Encoding.UTF8.GetBytes(json),
        null,
        DataProtectionScope.CurrentUser
    );
    File.WriteAllBytes("tokens.dat", encrypted);
}

private (string accessToken, string refreshToken)? LoadTokens()
{
    if (!File.Exists("tokens.dat")) return null;

    var encrypted = File.ReadAllBytes("tokens.dat");
    var decrypted = ProtectedData.Unprotect(
        encrypted,
        null,
        DataProtectionScope.CurrentUser
    );
    var json = Encoding.UTF8.GetString(decrypted);
    var tokens = JsonSerializer.Deserialize<dynamic>(json);
    return (tokens.accessToken, tokens.refreshToken);
}
```

### Step 7: Refresh Tokens

Refresh access tokens before they expire:

```typescript
async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch('https://api.textassistant.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'YOUR_CLIENT_ID'
    })
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  return await response.json();
}
```

**Best Practice:** Refresh proactively 5 minutes before expiration:

```typescript
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;

  async getValidToken(): Promise<string> {
    // Refresh if expiring in < 5 minutes
    if (Date.now() >= this.expiresAt - 300000) {
      await this.refresh();
    }
    return this.accessToken!;
  }

  private async refresh() {
    const response = await refreshAccessToken(this.refreshToken!);
    this.accessToken = response.access_token;
    this.refreshToken = response.refresh_token;
    this.expiresAt = Date.now() + response.expires_in * 1000;
    this.saveTokens();
  }
}
```

---

## API Integration

### Making Authenticated Requests

All API requests require Bearer token authentication:

```typescript
async function getCredits(accessToken: string) {
  const response = await fetch('https://api.textassistant.com/api/user/credits', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}
```

### Complete Integration Example

```typescript
class TextAssistantClient {
  private tokenManager: TokenManager;
  private baseUrl = 'https://api.textassistant.com';

  async login(): Promise<void> {
    // 1. Generate PKCE
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    // 2. Start callback server
    const code = await this.startOAuthFlow(challenge);

    // 3. Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code, verifier);

    // 4. Enhance with user data
    const enhancement = await this.enhanceToken(tokens.access_token);

    // 5. Save tokens
    this.tokenManager.setTokens(tokens);

    // 6. Cache user data
    this.cacheUserData(enhancement.user);
  }

  async getCredits(): Promise<CreditInfo> {
    const token = await this.tokenManager.getValidToken();
    const response = await fetch(`${this.baseUrl}/api/user/credits`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  }

  async getUserProfile(): Promise<UserProfile> {
    const token = await this.tokenManager.getValidToken();
    const response = await fetch(`${this.baseUrl}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  }
}
```

---

## Common Use Cases

### Use Case 1: Initial Login and Dashboard Display

**Goal:** Authenticate user and display credits on dashboard.

```typescript
// 1. User clicks "Login" button
async function handleLogin() {
  showLoadingIndicator('Opening login page...');

  try {
    // 2. Complete OAuth flow
    await client.login();

    // 3. Get credits (from cache or API)
    const credits = await client.getCredits();

    // 4. Update UI
    updateDashboard({
      email: client.currentUser.email,
      freeCredits: credits.freeCredits.remaining,
      resetDate: credits.freeCredits.resetDate,
      proCredits: credits.proCredits.remaining
    });

    showDashboard();
  } catch (error) {
    showError('Login failed. Please try again.');
  } finally {
    hideLoadingIndicator();
  }
}
```

### Use Case 2: Making LLM Request

**Goal:** Send prompt to LLM and update credit display.

```typescript
async function sendPrompt(prompt: string): Promise<string> {
  // 1. Check credits before making request
  const credits = await client.getCredits();
  if (credits.totalAvailable === 0) {
    throw new Error('Insufficient credits');
  }

  // 2. Make LLM request
  const token = await client.tokenManager.getValidToken();
  const response = await fetch('https://api.textassistant.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-5',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const result = await response.json();

  // 3. Refresh credits in background
  client.getCredits().then(updateCreditDisplay);

  return result.choices[0].message.content;
}
```

### Use Case 3: Handling Credit Exhaustion

**Goal:** Gracefully handle when user runs out of credits.

```typescript
async function checkCreditsAndWarn() {
  const credits = await client.getCredits();

  if (credits.totalAvailable === 0) {
    // No credits left
    if (credits.freeCredits.daysUntilReset <= 7) {
      showNotification(
        'Free credits exhausted',
        `Your credits will reset in ${credits.freeCredits.daysUntilReset} days.`
      );
    } else {
      showUpgradeDialog(
        'Out of Credits',
        'Purchase additional credits or upgrade to Pro for more monthly credits.'
      );
    }
  } else if (credits.totalAvailable < 100) {
    // Low credits warning
    showWarning(`Low credits: ${credits.totalAvailable} remaining`);
  }
}
```

### Use Case 4: Auto-Refresh on Startup

**Goal:** Restore session on app startup.

```typescript
async function initializeApp() {
  // 1. Check for saved tokens
  const tokens = tokenManager.loadFromStorage();

  if (!tokens) {
    // No saved session - show login screen
    showLoginScreen();
    return;
  }

  try {
    // 2. Refresh token to ensure it's valid
    await tokenManager.refresh();

    // 3. Load cached user data or fetch from API
    const profile = await client.getUserProfile();
    const credits = await client.getCredits();

    // 4. Show dashboard
    showDashboard({ profile, credits });
  } catch (error) {
    // Token refresh failed - re-authenticate
    tokenManager.clear();
    showLoginScreen();
  }
}
```

---

## Error Handling

### Common Errors

| Error Code | Meaning | Client Action |
|------------|---------|---------------|
| 400 | Bad request | Check request parameters |
| 401 | Unauthorized | Refresh token, retry once |
| 403 | Forbidden | Show subscription renewal |
| 404 | Not found | Handle gracefully |
| 429 | Rate limited | Use cached data, retry after delay |
| 500 | Server error | Retry with exponential backoff |
| 503 | Service unavailable | Show offline mode |

### Retry Strategy

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status === 401) {
        // Token expired - refresh and retry
        await tokenManager.refresh();
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${await tokenManager.getValidToken()}`
        };
        continue;
      }

      if (response.status === 429) {
        // Rate limited - exponential backoff
        const delay = Math.pow(2, i) * 1000;
        await sleep(delay);
        continue;
      }

      if (response.status >= 500) {
        // Server error - retry with backoff
        const delay = Math.pow(2, i) * 1000;
        await sleep(delay);
        continue;
      }

      // Other errors - don't retry
      throw new Error(`API error: ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }

  throw new Error('Max retries exceeded');
}
```

---

## Best Practices

### 1. Token Management

- **Encrypt tokens** before storing
- **Refresh proactively** 5 minutes before expiration
- **Handle refresh failures** gracefully (re-authenticate)
- **Clear tokens on logout**

### 2. Caching

- **Cache credits for 5 minutes**
- **Cache profile for 1 hour**
- **Invalidate cache** after credit-consuming operations
- **Use cached data as fallback** when API unavailable

### 3. User Experience

- **Show loading indicators** during API calls
- **Display credit counts** prominently in UI
- **Warn users** when credits low (<100)
- **Show reset date** for free credits
- **Handle offline mode** gracefully

### 4. Error Handling

- **Retry transient errors** (500, 503)
- **Don't retry client errors** (400, 404)
- **Show user-friendly messages** (not raw error codes)
- **Log errors** for debugging

### 5. Security

- **Never log tokens**
- **Use HTTPS only**
- **Validate state parameter** in OAuth flow
- **Clear sensitive data** from memory after use

---

## Troubleshooting

### Issue: "Invalid redirect_uri"

**Cause:** Redirect URI doesn't match registered URI.

**Solution:**
- Ensure redirect URI exactly matches what's registered
- Include port number: `http://localhost:8080/callback`
- No trailing slash unless registered with one

### Issue: "Invalid code_verifier"

**Cause:** Code verifier doesn't match code challenge.

**Solution:**
- Save code verifier before opening browser
- Use same verifier in token exchange
- Verify base64url encoding (no `+`, `/`, `=`)

### Issue: Token refresh returns 401

**Cause:** Refresh token expired or revoked.

**Solution:**
- Re-authenticate user (start OAuth flow again)
- Clear stored tokens
- Show login screen

### Issue: Rate limit exceeded (429)

**Cause:** Too many API requests in short time.

**Solution:**
- Use cached data instead of fetching
- Implement exponential backoff
- Respect `retry_after` header

### Issue: Credits not updating after usage

**Cause:** Using cached credits without invalidation.

**Solution:**
- Invalidate cache after LLM requests
- Refresh credits in background
- Show stale data indicator if cache old

---

## Migration Guide

### Upgrading from Old API

If you're upgrading from a previous API version:

**Old Flow (3 API calls):**
```typescript
// 1. Get tokens
const tokens = await getTokens();

// 2. Get user profile
const profile = await getUserProfile(tokens.access_token);

// 3. Get credits
const credits = await getCredits(tokens.access_token);
```

**New Flow (2 API calls):**
```typescript
// 1. Get tokens
const tokens = await getTokens();

// 2. Enhance with user data + credits
const enhancement = await enhanceToken(tokens.access_token, {
  include_user_data: true
});

// Now you have: enhancement.user (profile + credits)
```

**Benefits:**
- 33% fewer API calls
- Faster initial login
- Better user experience

---

## Resources

- [API Reference](../api/enhanced-endpoints.md)
- [OpenAPI Specification](../openapi/enhanced-api.yaml)
- [Postman Collection](../postman/enhanced-api-collection.json)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC](https://tools.ietf.org/html/rfc7636)

## Support

For integration support:

- **Email**: support@textassistant.com
- **Documentation**: https://docs.textassistant.com
- **Status Page**: https://status.textassistant.com

## Example Projects

Complete example projects available on GitHub:

- **Electron App**: github.com/textassistant/electron-example
- **.NET Desktop**: github.com/textassistant/dotnet-example
- **Python Desktop**: github.com/textassistant/python-example
