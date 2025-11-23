# Plan 207: Prompt Caching Implementation Guide

**Document Version:** 1.0
**Last Updated:** 2025-01-20
**Implementation Status:** ✅ Complete
**Author:** Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [What is Prompt Caching?](#what-is-prompt-caching)
3. [Architecture Changes](#architecture-changes)
4. [Environment Configuration](#environment-configuration)
5. [API Usage Examples](#api-usage-examples)
6. [Cache Analytics Endpoints](#cache-analytics-endpoints)
7. [Migration Guide](#migration-guide)
8. [Feature Flags](#feature-flags)
9. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
10. [Performance Considerations](#performance-considerations)

---

## Overview

Plan 207 adds comprehensive prompt caching support to the Rephlo LLM API platform, enabling:

- **Differential Pricing:** Cache write operations (1.25x base), cache read operations (0.1x for Anthropic, 0.5x for OpenAI)
- **Cache Analytics:** User-facing and admin dashboards for cache performance metrics
- **Provider Support:** Anthropic, OpenAI, and Google AI cache mechanisms
- **Cost Tracking:** Automatic calculation of cache hit rates and cost savings

### Key Benefits

- **Cost Savings:** Up to 90% reduction in costs for repeated prompt patterns (Anthropic cache reads)
- **Performance:** Reduced latency for cached prompt segments
- **Transparency:** Detailed analytics showing cache efficiency and savings
- **Flexibility:** Environment-based feature flags for gradual rollout

---

## What is Prompt Caching?

Prompt caching allows LLM providers to cache static portions of prompts (e.g., system instructions, documentation) and reuse them across requests, reducing both cost and latency.

### Provider-Specific Mechanisms

#### Anthropic (Claude)
- **Cache Control:** Use `cache_control: { type: "ephemeral" }` on message blocks
- **Pricing:**
  - Cache write: 1.25x base input price
  - Cache read: 0.1x base input price (90% savings)
- **TTL:** 5 minutes
- **Metrics:** `cache_creation_input_tokens`, `cache_read_input_tokens`

**Example:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "You are a helpful assistant...",
          "cache_control": { "type": "ephemeral" }
        },
        {
          "type": "text",
          "text": "What is the capital of France?"
        }
      ]
    }
  ]
}
```

#### OpenAI (GPT-4, GPT-3.5)
- **Automatic Caching:** No request parameters needed
- **Pricing:** Cached tokens billed at 0.5x base price (50% savings)
- **TTL:** Varies by model
- **Metrics:** `prompt_tokens_details.cached_tokens`

#### Google AI (Gemini)
- **Context Caching API:** Separate endpoint for cache management
- **Pricing:** Provider-specific rates
- **Metrics:** Provider-specific fields

---

## Architecture Changes

### Database Schema

**New columns in `token_usage_ledger` table:**

| Column                  | Type          | Description                                      |
|-------------------------|---------------|--------------------------------------------------|
| `cache_creation_tokens` | INTEGER       | Tokens written to cache (cache write)            |
| `cache_read_tokens`     | INTEGER       | Tokens read from cache (cache hit)               |
| `cached_prompt_tokens`  | INTEGER       | OpenAI cached tokens in prompt                   |
| `cache_hit_rate`        | DECIMAL(5,2)  | Cache hit rate percentage (0-100)                |
| `cost_savings_percent`  | DECIMAL(5,2)  | Cost savings from caching (0-100)                |
| `cache_write_credits`   | DECIMAL(10,2) | Credits charged for cache writes                 |
| `cache_read_credits`    | DECIMAL(10,2) | Credits charged for cache reads                  |

**New columns in `model_provider_pricing` table:**

| Column                    | Type          | Description                           |
|---------------------------|---------------|---------------------------------------|
| `cache_write_price_per_1k`| DECIMAL(10,6) | Price per 1K cache write tokens       |
| `cache_read_price_per_1k` | DECIMAL(10,6) | Price per 1K cache read tokens        |

### Service Layer

**Enhanced Services:**
- **TokenTrackingService:** Records cache metrics for every API request
- **AnalyticsService:** Aggregates cache performance across users and platform
- **CreditCalculationService:** Differential pricing for cache operations

**New Controllers:**
- **CacheAnalyticsController:** User and admin cache analytics endpoints

### API Routes

**User Endpoints:**
- `GET /api/cache-analytics/performance` - Personal cache KPI
- `GET /api/cache-analytics/hit-rate-trend` - Personal hit rate trend

**Admin Endpoints:**
- `GET /admin/analytics/cache/performance` - Platform cache KPI
- `GET /admin/analytics/cache/hit-rate-trend` - Platform hit rate trend
- `GET /admin/analytics/cache/savings-by-provider` - Savings breakdown by provider
- `GET /admin/analytics/cache/efficiency-by-model` - Efficiency ranking by model

---

## Environment Configuration

### Required Environment Variables

Add to `.env` file:

```bash
# Feature Flags (Plan 207)
FEATURE_PROMPT_CACHING_ENABLED=true
FEATURE_CACHE_ANALYTICS_ENABLED=true
```

### Configuration Options

| Variable                            | Default | Description                                      |
|-------------------------------------|---------|--------------------------------------------------|
| `FEATURE_PROMPT_CACHING_ENABLED`    | `true`  | Enable cache_control support and differential pricing |
| `FEATURE_CACHE_ANALYTICS_ENABLED`   | `true`  | Enable cache analytics endpoints                 |

**Supported Values:** `true`, `false`, `1`, `0` (case-insensitive)

### Startup Verification

When the backend starts, you'll see feature flag status in logs:

```
Feature Flags:
  - Prompt Caching: ENABLED
  - Cache Analytics: ENABLED
```

---

## API Usage Examples

### Using Cache Control (Anthropic)

**Request:**
```bash
curl -X POST http://localhost:7150/v1/chat/completions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "You are an expert software engineer. You specialize in TypeScript and Node.js...",
            "cache_control": { "type": "ephemeral" }
          },
          {
            "type": "text",
            "text": "How do I implement dependency injection?"
          }
        ]
      }
    ],
    "max_tokens": 1024
  }'
```

**Response (includes cache metrics):**
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1705752600,
  "model": "claude-3-5-sonnet-20241022",
  "usage": {
    "prompt_tokens": 250,
    "completion_tokens": 150,
    "total_tokens": 400,
    "cache_creation_input_tokens": 200,
    "cache_read_input_tokens": 0
  },
  "choices": [...]
}
```

On subsequent requests with the same cached content:

```json
{
  "usage": {
    "prompt_tokens": 250,
    "completion_tokens": 150,
    "total_tokens": 400,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 200
  }
}
```

**Cost Breakdown:**
- **First request (cache write):** 200 tokens × 1.25x = 250 token-equivalents
- **Second request (cache read):** 200 tokens × 0.1x = 20 token-equivalents
- **Savings:** 92% reduction in cost for cached portion

### OpenAI Automatic Caching

**Request:**
```bash
curl -X POST http://localhost:7150/v1/chat/completions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant..."
      },
      {
        "role": "user",
        "content": "What is TypeScript?"
      }
    ],
    "max_tokens": 500
  }'
```

**Response (OpenAI automatic caching):**
```json
{
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 100,
    "total_tokens": 250,
    "prompt_tokens_details": {
      "cached_tokens": 50
    }
  }
}
```

**Cost Breakdown:**
- **Uncached tokens:** 100 tokens × 1.0x = 100 token-equivalents
- **Cached tokens:** 50 tokens × 0.5x = 25 token-equivalents
- **Total billed:** 125 token-equivalents (instead of 150)

---

## Cache Analytics Endpoints

### User Performance KPI

**Endpoint:** `GET /api/cache-analytics/performance`

**Query Parameters:**
- `period` (optional): `last_7_days`, `last_30_days`, `last_90_days`, `custom` (default: `last_30_days`)
- `startDate` (optional): ISO 8601 date (required if period=custom)
- `endDate` (optional): ISO 8601 date (required if period=custom)
- `providers` (optional): Array of provider UUIDs to filter
- `models` (optional): Array of model IDs to filter

**Example Request:**
```bash
curl -X GET "http://localhost:7150/api/cache-analytics/performance?period=last_30_days" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "avgCacheHitRate": 45.2,
  "totalCachedTokens": 150000,
  "totalCacheSavings": 12.45,
  "avgSavingsPercent": 35.0,
  "cacheEnabledRequests": 120,
  "totalRequests": 150,
  "cacheAdoptionRate": 80.0,
  "breakdown": {
    "cacheWriteTokens": 50000,
    "cacheReadTokens": 80000,
    "cachedPromptTokens": 20000
  },
  "trend": {
    "previousPeriodHitRate": 40.0,
    "hitRateChange": 5.2,
    "direction": "up"
  },
  "period": "last_30_days",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### User Hit Rate Trend

**Endpoint:** `GET /api/cache-analytics/hit-rate-trend`

**Query Parameters:**
- Same as `/performance` endpoint
- `granularity` (optional): `hour`, `day`, `week`, `month` (default: `day`)

**Example Request:**
```bash
curl -X GET "http://localhost:7150/api/cache-analytics/hit-rate-trend?period=last_7_days&granularity=day" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "dataPoints": [
    {
      "timestamp": "2025-01-15T00:00:00.000Z",
      "avgHitRate": 42.5,
      "requestCount": 25,
      "cachedTokens": 12000,
      "savingsPercent": 30.0
    },
    {
      "timestamp": "2025-01-16T00:00:00.000Z",
      "avgHitRate": 48.0,
      "requestCount": 30,
      "cachedTokens": 15000,
      "savingsPercent": 35.0
    }
  ],
  "summary": {
    "peakHitRate": 55.0,
    "peakDate": "2025-01-18T00:00:00.000Z",
    "avgHitRate": 45.2,
    "trend": "improving"
  },
  "period": "last_7_days",
  "granularity": "day",
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### Admin Platform Performance KPI

**Endpoint:** `GET /admin/analytics/cache/performance`

**Authentication:** Requires admin role

**Query Parameters:**
- Same as user endpoints, plus:
- `tier` (optional): Filter by user tier (`free`, `pro`, `enterprise`)

**Example Request:**
```bash
curl -X GET "http://localhost:7150/admin/analytics/cache/performance?period=last_30_days&tier=pro" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

**Example Response:**
```json
{
  "avgCacheHitRate": 52.3,
  "totalCachedTokens": 15000000,
  "totalCacheSavings": 1245.67,
  "avgSavingsPercent": 38.5,
  "cacheEnabledRequests": 12000,
  "totalRequests": 15000,
  "cacheAdoptionRate": 80.0,
  "breakdown": {
    "cacheWriteTokens": 5000000,
    "cacheReadTokens": 8000000,
    "cachedPromptTokens": 2000000
  },
  "trend": {
    "previousPeriodHitRate": 45.0,
    "hitRateChange": 7.3,
    "direction": "up"
  },
  "period": "last_30_days",
  "filters": { "tier": "pro", "providers": null, "models": null },
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### Admin Savings by Provider

**Endpoint:** `GET /admin/analytics/cache/savings-by-provider`

**Example Response:**
```json
{
  "providers": [
    {
      "providerId": "uuid-123",
      "providerName": "Anthropic",
      "totalSavings": 500.00,
      "avgHitRate": 55.0,
      "requestCount": 5000,
      "savingsPercent": 40.0
    },
    {
      "providerId": "uuid-456",
      "providerName": "OpenAI",
      "totalSavings": 300.00,
      "avgHitRate": 30.0,
      "requestCount": 3000,
      "savingsPercent": 25.0
    }
  ],
  "totalSavings": 1245.67,
  "period": "last_30_days",
  "filters": { "tier": null, "models": null },
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

### Admin Efficiency by Model

**Endpoint:** `GET /admin/analytics/cache/efficiency-by-model`

**Example Response:**
```json
{
  "models": [
    {
      "modelId": "claude-3.5-sonnet",
      "providerId": "uuid-123",
      "avgHitRate": 65.0,
      "totalCachedTokens": 8000000,
      "costSavings": 800.00,
      "requestCount": 4000,
      "efficiency": "high"
    },
    {
      "modelId": "gpt-4o",
      "providerId": "uuid-456",
      "avgHitRate": 35.0,
      "totalCachedTokens": 3000000,
      "costSavings": 200.00,
      "requestCount": 2000,
      "efficiency": "medium"
    }
  ],
  "period": "last_30_days",
  "filters": { "tier": null, "providers": null },
  "timestamp": "2025-01-20T10:30:00.000Z"
}
```

---

## Migration Guide

### For Existing Deployments

#### Step 1: Database Migration

Run the database migration to add cache metric columns:

```bash
cd backend
npm run prisma:migrate
```

This applies migration `20251120000001_add_prompt_caching_fields`.

**Verify migration:**
```bash
npm run prisma:studio
```

Check `token_usage_ledger` table has 7 new columns:
- `cache_creation_tokens`
- `cache_read_tokens`
- `cached_prompt_tokens`
- `cache_hit_rate`
- `cost_savings_percent`
- `cache_write_credits`
- `cache_read_credits`

#### Step 2: Environment Configuration

Add feature flags to `.env`:

```bash
# Plan 207: Prompt Caching Support
FEATURE_PROMPT_CACHING_ENABLED=true
FEATURE_CACHE_ANALYTICS_ENABLED=true
```

#### Step 3: Rebuild Application

```bash
npm run build
```

Verify zero TypeScript compilation errors.

#### Step 4: Deploy

Deploy the updated backend with the new migration and environment variables.

#### Step 5: Verify Deployment

1. **Check startup logs:**
   ```
   Feature Flags:
     - Prompt Caching: ENABLED
     - Cache Analytics: ENABLED
   ```

2. **Test cache analytics endpoint:**
   ```bash
   curl -X GET "http://your-api-domain/api/cache-analytics/performance" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Monitor error logs** for 24-48 hours after deployment

### Rollback Procedure

If issues arise, you can disable features via environment variables **without code changes**:

1. **Disable cache analytics endpoints:**
   ```bash
   FEATURE_CACHE_ANALYTICS_ENABLED=false
   ```
   This returns 404 for all cache analytics endpoints.

2. **Disable cache support entirely:**
   ```bash
   FEATURE_PROMPT_CACHING_ENABLED=false
   ```
   This disables cache_control processing and differential pricing.

3. **Restart backend:**
   ```bash
   npm run dev  # Development
   npm start    # Production
   ```

**Note:** Existing data in cache metric columns is preserved; only new requests are affected.

### Gradual Rollout Strategy

Use feature flags for gradual rollout:

**Phase 1: Internal Testing (Week 1)**
```bash
FEATURE_PROMPT_CACHING_ENABLED=true
FEATURE_CACHE_ANALYTICS_ENABLED=false
```
- Cache metrics recorded but analytics endpoints disabled
- Monitor data quality in database

**Phase 2: Beta Users (Week 2)**
```bash
FEATURE_PROMPT_CACHING_ENABLED=true
FEATURE_CACHE_ANALYTICS_ENABLED=true
```
- Enable analytics for subset of users
- Monitor endpoint performance and accuracy

**Phase 3: Full Rollout (Week 3)**
- Enable for all users
- Monitor platform-wide metrics

---

## Feature Flags

### Feature Flag System

Plan 207 includes an environment-based feature flag system for safe rollout and instant rollback.

**Implementation:** `backend/src/config/feature-flags.ts`

### Available Flags

| Flag                      | Default | Controls                                           |
|---------------------------|---------|----------------------------------------------------|
| `promptCachingEnabled`    | `true`  | cache_control support, differential pricing         |
| `cacheAnalyticsEnabled`   | `true`  | Cache analytics API endpoints                      |

### Middleware Protection

Cache analytics routes are protected by `requireFeature()` middleware:

```typescript
router.use(requireFeature('cacheAnalyticsEnabled'));
```

When disabled, endpoints return:
```json
{
  "error": {
    "code": "FEATURE_DISABLED",
    "message": "This feature is currently disabled"
  }
}
```

### Runtime Configuration

Feature flags are loaded at server startup from environment variables. To change flags:

1. Update `.env` file
2. Restart backend

**No code changes or redeployment required.**

---

## Monitoring & Troubleshooting

### Key Metrics to Monitor

**Database:**
- Cache metric columns populated correctly
- No null constraint violations
- Query performance on analytics endpoints

**API Performance:**
- Response times for `/api/cache-analytics/*` endpoints (target: <500ms)
- Response times for `/admin/analytics/cache/*` endpoints (target: <1000ms)
- Rate limit hit rates (60/hour users, 100/hour admins)

**Cache Efficiency:**
- Platform-wide cache hit rate (target: >40%)
- Cost savings percentage (target: >30%)
- Cache adoption rate (target: >70%)

### Common Issues

#### Issue: Analytics endpoints return 404

**Cause:** `FEATURE_CACHE_ANALYTICS_ENABLED=false`

**Solution:**
```bash
# In .env file
FEATURE_CACHE_ANALYTICS_ENABLED=true
```
Restart backend.

---

#### Issue: Cache metrics always null/zero

**Cause:** Provider not returning cache metrics, or provider integration not updated

**Solution:**
1. Check provider response parsing in `backend/src/services/llm-providers/`
2. Verify provider supports caching (Anthropic Claude 3.5+, OpenAI GPT-4o)
3. Check request includes cache_control parameters (Anthropic only)

---

#### Issue: TypeScript compilation errors after migration

**Cause:** Prisma client not regenerated after migration

**Solution:**
```bash
npm run prisma:generate
npm run build
```

---

#### Issue: Analytics queries slow (>2 seconds)

**Cause:** Missing database indexes or large date ranges

**Solution:**
1. Check indexes exist on `token_usage_ledger`:
   - `created_at`
   - `user_id`
   - `model_id`
   - `provider_id`

2. Limit date ranges in queries (max 90 days recommended)

3. Consider adding composite indexes:
   ```sql
   CREATE INDEX idx_cache_analytics
   ON token_usage_ledger(user_id, created_at, status)
   WHERE cost_savings_percent IS NOT NULL;
   ```

---

#### Issue: Rate limit exceeded errors

**Cause:** User/admin exceeding rate limits (60/hour or 100/hour)

**Solution:**
1. Verify rate limit headers in API responses:
   - `RateLimit-Limit`
   - `RateLimit-Remaining`
   - `RateLimit-Reset`

2. Implement client-side caching of analytics data

3. Consider increasing limits in route configuration (if justified)

---

### Debugging Tips

**Enable Debug Logging:**
```bash
LOG_LEVEL=debug npm run dev
```

**Check Cache Metrics in Database:**
```sql
SELECT
  id,
  cache_creation_tokens,
  cache_read_tokens,
  cached_prompt_tokens,
  cache_hit_rate,
  cost_savings_percent
FROM token_usage_ledger
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;
```

**Verify Feature Flags at Runtime:**
```bash
curl -X GET http://localhost:7150/api/cache-analytics/performance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -v
```

If feature disabled, returns HTTP 404 with `FEATURE_DISABLED` error code.

---

## Performance Considerations

### Database Performance

**Expected Load:**
- 7 additional INTEGER/DECIMAL columns per API request
- Minimal impact on write performance (<1ms overhead)

**Analytics Query Optimization:**
- Queries use aggregation functions (AVG, SUM, COUNT)
- Date range indexes ensure <500ms response times for typical queries
- Limit queries to 90-day ranges for optimal performance

### API Rate Limiting

**User Endpoints:**
- Limit: 60 requests/hour
- Window: 1 hour sliding
- Storage: Redis (distributed) or in-memory (single-server)

**Admin Endpoints:**
- Limit: 100 requests/hour
- Window: 1 hour sliding
- Storage: Redis (distributed) or in-memory (single-server)

**Recommendation:** Use Redis in production for multi-instance deployments.

### Cache Storage

**Provider Cache TTLs:**
- Anthropic: 5 minutes
- OpenAI: Varies by model
- Google AI: Provider-specific

**Optimization Tips:**
1. Place static content (system prompts, documentation) early in messages
2. Mark stable content with `cache_control` for Anthropic
3. Reuse conversation contexts within cache TTL windows
4. Monitor cache hit rates; >40% indicates effective caching

---

## Best Practices

### For Developers

1. **Always include cache metrics in usage tracking:**
   ```typescript
   await tokenTrackingService.recordUsage({
     userId,
     modelId,
     providerId,
     inputTokens,
     outputTokens,
     cacheCreationTokens,  // NEW
     cacheReadTokens,      // NEW
     cachedPromptTokens,   // NEW
     // ... other fields
   });
   ```

2. **Use type mappers for API responses:**
   ```typescript
   // Don't return raw Prisma objects (exposes snake_case)
   return mapUsageToApiType(dbUsage);
   ```

3. **Handle nullable cache metrics:**
   ```typescript
   const hitRate = usage.cache_hit_rate ?? null;
   const savings = usage.cost_savings_percent ?? null;
   ```

### For API Consumers

1. **Optimize for caching:**
   - Place static prompts early in messages
   - Use cache_control for Anthropic
   - Reuse contexts within cache TTL

2. **Monitor cache efficiency:**
   - Check `/api/cache-analytics/performance` regularly
   - Aim for >40% hit rate
   - Identify low-efficiency models

3. **Respect rate limits:**
   - Cache analytics responses client-side
   - Check RateLimit-* headers
   - Implement exponential backoff for 429 errors

### For Administrators

1. **Monitor platform metrics:**
   - Daily cache hit rates
   - Cost savings trends
   - Provider-specific efficiency
   - Model-specific efficiency

2. **Optimize pricing:**
   - Update `model_provider_pricing` with accurate cache pricing
   - Monitor vendor price changes
   - Adjust margin multipliers based on cache efficiency

3. **Capacity planning:**
   - Monitor analytics query performance
   - Scale Redis for distributed rate limiting
   - Add database indexes if queries slow down

---

## References

- **Plan Specification:** `docs/plan/207-prompt-caching-support.md`
- **QA Verification Report:** `docs/progress/207-qa-verification-report.md`
- **Database Migration:** `backend/prisma/migrations/20251120000001_add_prompt_caching_fields/migration.sql`
- **Feature Flags:** `backend/src/config/feature-flags.ts`
- **Cache Analytics Controller:** `backend/src/controllers/cache-analytics.controller.ts`
- **Analytics Service:** `backend/src/services/analytics.service.ts`

---

## Support & Feedback

For issues or questions regarding prompt caching implementation:

1. Check this guide and troubleshooting section
2. Review QA verification report for known issues
3. Check backend logs (`LOG_LEVEL=debug`)
4. Contact development team with:
   - Error logs
   - Request/response examples
   - Environment configuration

---

**Document End**
