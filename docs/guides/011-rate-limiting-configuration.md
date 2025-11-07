# Rate Limiting Configuration Guide

**Created**: 2025-11-07
**Status**: Verified and Tested
**Reference**: docs/plan/104-phase4-email-testing-completion.md (Section 4.3)

## Table of Contents

1. [Overview](#overview)
2. [Current Configuration](#current-configuration)
3. [How Rate Limiting Works](#how-rate-limiting-works)
4. [Rate Limit Tiers](#rate-limit-tiers)
5. [Endpoint-Specific Limits](#endpoint-specific-limits)
6. [Redis Integration](#redis-integration)
7. [Configuration](#configuration)
8. [Monitoring Rate Limits](#monitoring-rate-limits)
9. [Testing Rate Limiting](#testing-rate-limiting)
10. [Troubleshooting](#troubleshooting)
11. [Production Recommendations](#production-recommendations)

## Overview

The Rephlo Backend API implements distributed rate limiting to prevent abuse and ensure fair resource allocation. Rate limiting is enforced at two levels:

1. **IP-based rate limiting** - Applied to unauthenticated endpoints (registration, password reset, OAuth)
2. **User-based rate limiting** - Applied to authenticated endpoints based on subscription tier

All rate limiting uses Redis for distributed tracking, allowing enforcement across multiple server instances.

## Current Configuration

### Environment Variables

Rate limiting is configured via the following environment variables in `.env`:

```bash
# Redis Configuration
REDIS_URL=localhost:6379
REDIS_PASSWORD=Password12345
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000

# Rate Limit Bypass (for testing only - DO NOT use in production)
RATE_LIMIT_BYPASS_SECRET=
```

### Rate Limit Tiers

Three subscription tiers with different rate limits:

| Tier | Requests/Min | Tokens/Min | Credits/Day |
|------|-------------|-----------|-----------|
| Free | 10 | 10,000 | 200 |
| Pro | 60 | 100,000 | 5,000 |
| Enterprise | 300 | 500,000 | 50,000 |

## How Rate Limiting Works

### Sliding Window Algorithm

Rate limiting uses a **sliding window counter** approach implemented via Redis. This provides:

- **Accurate tracking** - Requests are tracked with precise timestamps
- **Memory efficient** - Redis handles counter management and expiration
- **Distributed** - Works across multiple server instances
- **Real-time** - Limits reset on a rolling basis (not fixed intervals)

### Request Flow

```
1. Request arrives at API
2. Rate limit middleware extracts client identifier:
   - Authenticated user → use User ID + tier
   - Unauthenticated → use IP address
3. Check Redis for current request count
4. If limit exceeded → return 429 Too Many Requests
5. If limit available → increment counter and process request
6. Include rate limit headers in response
```

### Response Headers

Every response includes standard rate limit headers:

```
RateLimit-Limit: 5            # Maximum requests allowed per window
RateLimit-Remaining: 2        # Requests remaining before rate limit
RateLimit-Reset: 1699329600   # Unix timestamp when limit resets
Retry-After: 7                # Seconds to wait before retry (429 only)
```

## Rate Limit Tiers

### Free Tier (Default)

- **10 requests per minute**
- **10,000 tokens per minute**
- **200 credits per day**
- Applied to all unauthenticated users

### Pro Tier

- **60 requests per minute**
- **100,000 tokens per minute**
- **5,000 credits per day**
- Applied to users with Pro subscription

### Enterprise Tier

- **300 requests per minute**
- **500,000 tokens per minute**
- **50,000 credits per day**
- Applied to users with Enterprise subscription

## Endpoint-Specific Limits

### Authentication Endpoints (IP-based)

All authentication endpoints apply IP-based rate limiting to prevent brute force attacks:

#### POST /auth/register
- **Limit**: 5 requests per hour per IP
- **Purpose**: Prevent account enumeration and spam registrations
- **Error Code**: `rate_limit_exceeded`

Example response when rate limited:
```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Too many requests from this IP. Please try again in 7 seconds.",
    "details": {
      "limit": 5,
      "retryAfter": 7
    }
  }
}
```

#### POST /auth/verify-email
- **Limit**: 10 requests per hour per IP
- **Purpose**: Allow multiple verification attempts
- **Error Code**: `rate_limit_exceeded`

#### POST /auth/forgot-password
- **Limit**: 3 requests per hour per IP
- **Purpose**: Prevent password reset abuse
- **Error Code**: `rate_limit_exceeded`

#### POST /auth/reset-password
- **Limit**: 3 requests per hour per IP
- **Purpose**: Prevent brute force password reset
- **Error Code**: `rate_limit_exceeded`

### OAuth Endpoints (IP-based)

#### GET /oauth/google/authorize
- **Limit**: 10 requests per minute per IP
- **Purpose**: Standard OAuth flow protection

#### GET /oauth/google/callback
- **Limit**: 10 requests per minute per IP
- **Purpose**: Prevent callback spam

### Protected Endpoints (User-based)

All protected endpoints apply user-based rate limiting based on subscription tier:

- **Limit source**: User ID + Subscription tier
- **Limit period**: 1 minute (rolling window)
- **Error Code**: `rate_limit_exceeded`

## Redis Integration

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Express Application                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           Rate Limiting Middleware                      ││
│  │  • createUserRateLimiter()    (authenticated users)    ││
│  │  • createIPRateLimiter()      (unauthenticated)        ││
│  └─────────────────────────────────────────────────────────┘│
│                          ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │    express-rate-limit + rate-limit-redis Store         ││
│  │  Manages sliding window counters in Redis              ││
│  └─────────────────────────────────────────────────────────┘│
│                          ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Redis (ioredis client)                     ││
│  │  Stores and manages rate limit counters                ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Redis Data Storage

Rate limit data is stored in Redis with prefixed keys:

```
Key Format: rl:ip:{ip_address}:rpm
Example: rl:ip:192.168.1.100:rpm = 3

Key Format: rl:user:{user_id}:{tier}:rpm
Example: rl:user:clx123:pro:rpm = 45
```

**Expiration**: Each key automatically expires after 1 minute (60 seconds)

### Connection Configuration

Redis connection is initialized in `backend/src/container.ts`:

```typescript
container.register('RedisConnection', {
  useValue: new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy(times) {
      const delay = Math.min(times * 10, 2000);
      logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
  }),
});
```

**Features**:
- Automatic retry with exponential backoff (max 2s delay)
- Graceful fallback to memory store if Redis unavailable
- Connection pooling via ioredis

### Graceful Degradation

If Redis is unavailable:
1. Middleware detects Redis connection failure
2. Falls back to in-memory rate limiting store
3. Logs warning: `"User rate limiter using in-memory store"`
4. **Important**: In-memory store only works on single server (not distributed)

## Configuration

### Adjusting Rate Limits

To modify rate limits, edit `backend/src/middleware/ratelimit.middleware.ts`:

```typescript
// Lines 37-53
export const RATE_LIMITS = {
  free: {
    requestsPerMinute: 10,      // Change this
    tokensPerMinute: 10000,     // Change this
    creditsPerDay: 200,         // Change this
  },
  pro: {
    requestsPerMinute: 60,      // Change this
    tokensPerMinute: 100000,    // Change this
    creditsPerDay: 5000,        // Change this
  },
  enterprise: {
    requestsPerMinute: 300,     // Change this
    tokensPerMinute: 500000,    // Change this
    creditsPerDay: 50000,       // Change this
  },
};
```

### Adjusting Endpoint Limits

To modify endpoint-specific IP limits, edit `backend/src/routes/auth.routes.ts`:

```typescript
// Lines 40-43
const registrationLimiter = createIPRateLimiter(5);      // 5 per hour
const passwordResetLimiter = createIPRateLimiter(3);     // 3 per hour
const emailVerificationLimiter = createIPRateLimiter(10); // 10 per hour
```

To change to requests per minute instead of per hour, adjust the window and max values:

```typescript
// Current: 5 per hour = 5 per 60 minutes = 0.083 per minute
// To change to 5 per minute: keep max at 5, change windowMs to 60000 (1 minute)

const registrationLimiter = createIPRateLimiter(300); // 300 per hour = 5 per minute
```

### Enabling Rate Limit Bypass

For development/testing, you can bypass rate limits using a header:

1. Set `RATE_LIMIT_BYPASS_SECRET` in `.env`:
   ```
   RATE_LIMIT_BYPASS_SECRET=dev-bypass-secret-12345
   ```

2. Include header in requests:
   ```bash
   curl -H "X-RateLimit-Bypass: dev-bypass-secret-12345" http://localhost:7150/auth/register
   ```

**IMPORTANT**: Never use this in production or commit the secret to version control.

## Monitoring Rate Limits

### Checking Rate Limit Status

Use the rate limit status endpoint to check current limits for authenticated users:

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:7150/v1/rate-limit
```

Response:
```json
{
  "requests_per_minute": {
    "limit": 60,
    "remaining": 45,
    "reset_at": "2025-11-07T06:03:00Z"
  },
  "tokens_per_minute": {
    "limit": 100000,
    "remaining": 98500,
    "reset_at": "2025-11-07T06:03:00Z"
  },
  "credits_per_day": {
    "limit": 5000,
    "remaining": 4800,
    "reset_at": "2025-11-08T00:00:00Z"
  }
}
```

### Logging Rate Limit Violations

Rate limit violations are logged with context:

```
[WARN] Rate limit exceeded - {
  userId: "clx123",
  ip: "192.168.1.100",
  tier: "pro",
  limit: 60,
  endpoint: "POST /api/v1/models"
}
```

View logs:
```bash
tail -f logs/combined.log | grep "Rate limit exceeded"
```

### Redis Monitoring

Monitor Redis rate limit keys:

```bash
# Connect to Redis CLI
redis-cli -a "Password12345"

# View all rate limit keys
KEYS "rl:*"

# Check specific rate limit counter
GET "rl:ip:192.168.1.100:rpm"

# Check TTL (time to live)
TTL "rl:ip:192.168.1.100:rpm"

# Monitor real-time operations
MONITOR
```

## Testing Rate Limiting

### Automated Test Script

Run the included test script to verify rate limiting:

```bash
node test-rate-limiting.js
```

This will:
1. Test API health
2. Verify registration rate limiting (5/hour)
3. Verify email verification rate limiting (10/hour)
4. Verify forgot-password rate limiting (3/hour)
5. Report test results

### Manual Testing with curl

Test registration endpoint (5 per hour per IP):

```bash
# Request 1-4: Should succeed (201)
for i in {1..4}; do
  curl -X POST http://localhost:7150/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test'$i'@example.com",
      "password": "TestPass123!",
      "username": "user'$i'",
      "firstName": "Test",
      "lastName": "User",
      "acceptedTerms": true
    }'
  sleep 1
done

# Request 5: Should fail (429)
curl -X POST http://localhost:7150/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test5@example.com",
    "password": "TestPass123!",
    "username": "user5",
    "firstName": "Test",
    "lastName": "User",
    "acceptedTerms": true
  }'
```

### Test Results

**Verification Test Results** (2025-11-07):

- ✓ API health check passes
- ✓ Registration rate limiting: 5 per hour enforced correctly
- ✓ Email verification: 10 per hour enforced correctly
- ✓ Forgot password: 3 per hour enforced correctly
- ✓ Rate limit headers included in all responses
- ✓ Retry-After header provided on 429 responses
- ✓ Redis integration working (using Redis store, not in-memory)

## Troubleshooting

### Issue: "Redis not ready for rate limiting" warnings

**Symptom**: Logs show repeated warnings about Redis not being ready

**Causes**:
- Redis service not started
- Incorrect Redis URL or password in `.env`
- Redis connection timeout
- Network connectivity issue

**Solution**:
1. Verify Redis is running:
   ```bash
   redis-cli -a "Password12345" ping
   # Should return: PONG
   ```

2. Check Redis connection in `.env`:
   ```bash
   # Should match your Redis setup
   REDIS_URL=localhost:6379
   REDIS_PASSWORD=Password12345
   ```

3. Verify network connectivity:
   ```bash
   telnet localhost 6379
   # Should connect successfully
   ```

4. Check Redis logs:
   ```bash
   # If using Redis container
   docker logs redis
   ```

5. If Redis is down, restart it:
   ```bash
   # Linux/Mac
   redis-server

   # Docker
   docker run -d -p 6379:6379 redis:7-alpine
   ```

### Issue: Rate limits not being enforced

**Symptom**: All requests succeed, even after exceeding rate limit

**Causes**:
- `RATE_LIMIT_BYPASS_SECRET` set and being used
- Redis connection issue (falling back to memory store)
- Rate limit middleware not applied to route

**Solution**:
1. Remove or comment out `RATE_LIMIT_BYPASS_SECRET` in `.env`
2. Verify Redis connection (see above)
3. Check route configuration in `auth.routes.ts` and `social-auth.routes.ts`

### Issue: Rate limit headers missing

**Symptom**: Responses don't include `RateLimit-*` headers

**Causes**:
- Middleware not configured correctly
- Response headers being stripped by proxy

**Solution**:
1. Verify CORS config exposes rate limit headers:
   ```typescript
   // In config/security.ts
   Access-Control-Expose-Headers: 'X-RateLimit-Limit,X-RateLimit-Remaining,X-RateLimit-Reset,Retry-After'
   ```

2. Check for middleware that strips headers (reverse proxies, CDNs)

### Issue: Legitimate users being rate limited

**Symptom**: Users report "too many requests" errors

**Causes**:
- Rate limits too strict for use case
- Rate limit window too short
- IP-based limiting catching multiple users behind NAT

**Solution**:
1. Increase rate limit values in `ratelimit.middleware.ts`
2. Extend rate limit window (increase `windowMs`)
3. Switch to user-based limiting where possible (requires authentication)
4. Add IP whitelist for known services

### Issue: Different limits on different servers

**Symptom**: Rate limits inconsistent across load-balanced servers

**Causes**:
- Redis not properly shared
- Different rate limit configurations per server

**Solution**:
1. Ensure all servers connect to same Redis instance
2. Verify `REDIS_URL` is identical across all servers
3. Check network connectivity between servers and Redis
4. Use Redis sentinel/cluster for high availability

## Production Recommendations

### 1. Redis Setup

For production, use a managed Redis service or dedicated Redis cluster:

**AWS ElastiCache**:
```
REDIS_URL=rediss://production-redis.xxxxx.ng.0001.use1.cache.amazonaws.com:6379
REDIS_PASSWORD=<secure-password>
```

**Azure Cache for Redis**:
```
REDIS_URL=rediss://rephlo-prod.redis.cache.windows.net:6380
REDIS_PASSWORD=<primary-key>
```

**Google Cloud Memorystore**:
```
REDIS_URL=redis://10.0.0.2:6379
REDIS_PASSWORD=<auth-string>
```

### 2. Security

- **Remove rate limit bypass secret** in production:
  ```bash
  RATE_LIMIT_BYPASS_SECRET=
  ```

- **Use Redis password** (strong, 20+ characters):
  ```bash
  REDIS_PASSWORD=<very-long-random-secure-password>
  ```

- **Enable Redis TLS/SSL** for cloud deployments

- **Restrict Redis network access** to application servers only

### 3. Scaling

- **Deploy Redis cluster** for high availability
- **Use Redis Sentinel** for automatic failover
- **Monitor Redis memory usage** (rate limit keys expire after 1 minute)
- **Set Redis maxmemory policy** to `allkeys-lru` or `allkeys-lfu`

### 4. Monitoring

Set up alerts for:
- Redis connection failures
- High rate limit violation frequency
- Redis memory usage > 80%
- Redis latency > 100ms

### 5. Rate Limit Tuning

Adjust limits based on actual usage patterns:

1. **Monitor baseline**: Collect 1-2 weeks of metrics
2. **Identify patterns**: Peak traffic, user behavior
3. **Set conservative limits**: Start high, decrease gradually
4. **Communicate changes**: Notify users of limit changes
5. **Review periodically**: Monthly audits of rate limit effectiveness

### 6. Compliance

- **Log all 429 responses** for audit trails
- **Document rate limit policy** in API terms of service
- **Provide rate limit status endpoint** for users to check limits
- **Support appeal process** for users needing higher limits

## References

- **express-rate-limit**: https://github.com/nfriedly/express-rate-limit
- **rate-limit-redis**: https://github.com/wyattjoh/rate-limit-redis
- **ioredis**: https://github.com/luin/ioredis
- **Redis Commands**: https://redis.io/commands/
- **Rate Limiting Best Practices**: https://cloud.google.com/architecture/rate-limiting-strategies-techniques

## Change Log

### 2025-11-07 (Initial)
- Created comprehensive rate limiting configuration guide
- Verified Redis integration working correctly
- Tested all endpoint rate limits (5, 10, 3 per hour)
- Documented production recommendations
- Created troubleshooting section
