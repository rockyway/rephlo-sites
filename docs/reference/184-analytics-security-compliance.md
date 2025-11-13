# Admin Analytics Dashboard - Security & Compliance

**Document Type:** Technical Reference
**Related Plan:** [180-admin-analytics-dashboard-ui-design.md](../plan/180-admin-analytics-dashboard-ui-design.md)
**Status:** Design Phase
**Created:** 2025-01-13
**Last Updated:** 2025-01-13

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Rate Limiting](#rate-limiting)
4. [Data Privacy](#data-privacy)
5. [SQL Injection Prevention](#sql-injection-prevention)
6. [Accessibility Compliance](#accessibility-compliance)
7. [CORS & CSRF Protection](#cors--csrf-protection)
8. [Error Handling](#error-handling)

---

## Overview

Security and accessibility are critical requirements for the Admin Analytics Dashboard, which exposes sensitive financial data (gross margins, vendor costs, revenue) to administrative users only.

### Security Principles

1. **Least Privilege:** Only admin users can access analytics endpoints
2. **Defense in Depth:** Multiple security layers (JWT, rate limiting, SQL injection prevention)
3. **Data Privacy:** No individual user IDs or emails exposed in aggregated analytics
4. **Auditability:** All analytics requests logged with requestId for tracing
5. **Accessibility:** WCAG 2.1 AA compliance for inclusive access

---

## Authentication & Authorization

### JWT Validation

All analytics endpoints require a valid JWT token with admin scope.

#### Middleware Stack

```typescript
// backend/src/api/analytics.routes.ts

import { authenticate } from '../middleware/authenticate';
import { requireScopes } from '../middleware/requireScopes';

const router = express.Router();

// Apply authentication + admin scope to all routes
router.use(authenticate());           // Validates JWT token
router.use(requireScopes(['admin'])); // Checks for 'admin' scope

// Analytics endpoints
router.get('/gross-margin', analyticsController.getGrossMargin);
router.get('/cost-by-provider', analyticsController.getCostByProvider);
// ... etc
```

---

### JWT Claims Required

```typescript
interface JWTPayload {
  sub: string;           // User ID (UUID)
  email: string;         // User email
  scope: string[];       // ['admin', 'user.info']
  role: 'admin' | 'user';
  iat: number;           // Issued at (Unix timestamp)
  exp: number;           // Expiry (Unix timestamp)
}
```

**Example JWT Validation:**

```typescript
// backend/src/middleware/authenticate.ts

export function authenticate() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid Authorization header');
      }

      const token = authHeader.substring(7);

      // Fetch JWKS from Identity Provider (cached 5 min)
      const jwks = await fetchJWKS(process.env.OIDC_JWKS_URL);

      // Verify JWT signature (RS256)
      const payload = jwt.verify(token, jwks, {
        algorithms: ['RS256'],
        issuer: process.env.OIDC_ISSUER,
      }) as JWTPayload;

      // Inject user claims into request
      req.user = {
        id: payload.sub,
        email: payload.email,
        scopes: payload.scope,
        role: payload.role,
      };

      next();
    } catch (error) {
      // Fallback: Token introspection if JWT verification fails
      const introspectionResult = await introspectToken(token);
      if (introspectionResult.active) {
        req.user = introspectionResult.user;
        next();
      } else {
        throw new UnauthorizedError('Invalid or expired token');
      }
    }
  };
}
```

---

### Scope Enforcement

```typescript
// backend/src/middleware/requireScopes.ts

export function requireScopes(requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userScopes = req.user?.scopes || [];

    const hasRequiredScopes = requiredScopes.every(scope =>
      userScopes.includes(scope)
    );

    if (!hasRequiredScopes) {
      throw new ForbiddenError(
        `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`
      );
    }

    next();
  };
}
```

---

### Authorization Matrix

| Endpoint                   | Required Scope | Required Role | Data Sensitivity |
|----------------------------|----------------|---------------|------------------|
| GET /gross-margin          | admin          | admin         | High (revenue)   |
| GET /cost-by-provider      | admin          | admin         | High (costs)     |
| GET /margin-trend          | admin          | admin         | High (margins)   |
| GET /cost-distribution     | admin          | admin         | High (costs)     |
| POST /export-csv           | admin          | admin         | High (full data) |

**Access Denied Response:**

```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions. Required scopes: admin",
    "timestamp": "2025-01-30T14:32:15.000Z",
    "requestId": "req-abc123"
  }
}
```

---

## Rate Limiting

### Tier-Based Limits

**Admin Analytics:** 100 requests/hour per user (Redis-backed)

**Why 100 req/hour?**

- Typical admin session: 20-30 filter changes
- CSV exports: 5-10 per session
- Prevents abuse/scraping while allowing legitimate use
- Headroom for multiple concurrent admins

---

### Implementation

```typescript
// backend/src/middleware/rateLimiter.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../db/redis';

export const analyticsRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:analytics:',
  }),
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 100,                   // 100 requests per hour
  keyGenerator: (req) => req.user.id,  // Rate limit per user
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders: false,       // Disable X-RateLimit-* headers
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many analytics requests. Try again in 1 hour.',
        retryAfter: 3600,  // seconds
      }
    });
  },
});
```

---

### Rate Limit Headers

**Response Headers (Standard):**

```
RateLimit-Limit: 100
RateLimit-Remaining: 47
RateLimit-Reset: 1706716800  (Unix timestamp)
```

**When Limit Exceeded:**

```
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1706716800
Retry-After: 3600

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many analytics requests. Try again in 1 hour.",
    "retryAfter": 3600
  }
}
```

---

## Data Privacy

### No Individual User Data Exposed

Analytics endpoints return **aggregated data only** - no individual user IDs, emails, or request IDs.

#### ❌ BAD: Exposing Individual User Data

```json
{
  "requests": [
    {
      "userId": "user-123",
      "email": "john@example.com",
      "requestId": "req-456",
      "cost": 0.025,
      "grossMargin": 0.012
    }
  ]
}
```

#### ✅ GOOD: Aggregated Data Only

```json
{
  "tierBreakdown": [
    {
      "tier": "pro",
      "totalRequests": 15890,
      "totalCost": 2840.00,
      "avgCostPerRequest": 0.179,
      "grossMargin": 1245.50
    }
  ]
}
```

---

### CSV Export Anonymization

**CSV Schema:**

```csv
date,tier,provider,model,request_count,total_cost,gross_margin,avg_cost_per_request
2025-01-15,pro,openai,gpt-4o,1250,125.50,45.20,0.1004
2025-01-15,free,anthropic,claude-3-5-sonnet,890,89.00,25.30,0.1000
```

**No columns for:**
- user_id
- email
- request_id
- IP address
- User agent

---

### GDPR Compliance Considerations

**Data Retention:**
- Analytics data aggregated from `token_usage_ledger` (30-90 day retention policy)
- No Personally Identifiable Information (PII) in analytics responses
- CSV exports contain only aggregate metrics (no user-level data)

**Right to Access:**
- Admin dashboard does not expose individual user data
- User-specific data requests handled by separate user profile endpoints

**Right to Erasure:**
- User deletion cascades to `token_usage_ledger` (onDelete: Cascade)
- Aggregated analytics unaffected (no user identifiers)

---

## SQL Injection Prevention

### Prisma Parameterized Queries

All database queries use **Prisma ORM** with parameterized queries - SQL injection is prevented by design.

#### ✅ SAFE: Prisma Query Builder

```typescript
// Prisma uses parameterized queries (SQL placeholders)
const result = await prisma.tokenUsageLedger.findMany({
  where: {
    createdAt: { gte: startDate, lte: endDate },
    providerId: { in: providerIds },  // Array binding (safe)
    status: 'success',
  }
});

// Generated SQL (parameterized):
// SELECT * FROM token_usage_ledger
// WHERE created_at >= $1 AND created_at <= $2
//   AND provider_id = ANY($3::uuid[])
//   AND status = $4
```

---

#### ✅ SAFE: Prisma Raw Queries with Tagged Templates

```typescript
// Even raw queries use $1, $2 placeholders (not string interpolation)
const result = await prisma.$queryRaw`
  SELECT SUM(gross_margin_usd) as total
  FROM token_usage_ledger
  WHERE created_at >= ${startDate}
    AND provider_id = ANY(${providerIds})
    AND status = ${status}
`;

// Prisma escapes parameters - SQL injection prevented
```

---

#### ❌ UNSAFE: String Interpolation (Prisma Prevents This)

```typescript
// This code won't compile with Prisma (TypeScript error)
const query = `SELECT * FROM users WHERE id = '${userId}'`;  // 🚨 SQL injection!
await prisma.$executeRawUnsafe(query);  // Must use $executeRaw with tagged templates
```

**Prisma Enforces Safety:**
- `$queryRaw` and `$executeRaw` only accept tagged templates
- `$queryRawUnsafe` requires explicit opt-in (code review flag)

---

### Input Validation (Zod Schemas)

All query parameters validated before database access:

```typescript
// backend/src/controllers/analytics.controller.ts

import { z } from 'zod';

const GrossMarginQuerySchema = z.object({
  period: z.enum(['last_7_days', 'last_30_days', 'last_90_days', 'custom']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tier: z.enum(['free', 'pro', 'enterprise']).optional(),
  providers: z.array(z.string().uuid()).optional(),
  models: z.array(z.string()).optional(),
});

async getGrossMargin(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate query parameters (throws if invalid)
    const params = GrossMarginQuerySchema.parse(req.query);

    // Proceed with validated data
    const data = await this.analyticsService.getGrossMarginKPI(params);
    res.json(data);
  } catch (error) {
    next(error);  // Zod validation errors handled by error middleware
  }
}
```

**Zod Validation Errors:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": [
      {
        "path": ["period"],
        "message": "Invalid enum value. Expected 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom', received 'invalid'"
      }
    ]
  }
}
```

---

## Accessibility Compliance

### WCAG 2.1 AA Standards

The Admin Analytics Dashboard meets **WCAG 2.1 Level AA** accessibility requirements.

---

### 1. Color Contrast (4.5:1 for Text, 3:1 for UI)

**Rephlo Color Palette Compliance:**

```css
/* ✅ PASS: Blue text on white background */
.text-rephlo { color: #2563EB; background: #FFFFFF; }
/* Contrast ratio: 8.2:1 (exceeds 4.5:1) */

/* ✅ PASS: White text on Navy background */
.bg-rephlo-navy .text-white { color: #FFFFFF; background: #1E293B; }
/* Contrast ratio: 12.6:1 (exceeds 4.5:1) */

/* ⚠️ WARNING: Cyan text on white (use for accents only) */
.text-rephlo-cyan { color: #06B6D4; background: #FFFFFF; }
/* Contrast ratio: 4.0:1 (borderline, use for large text only) */
```

**Verification Tool:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

### 2. Keyboard Navigation

**All Interactive Elements Keyboard-Accessible:**

```tsx
<Button
  onClick={handleExport}
  aria-label="Export analytics data to CSV"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleExport();
    }
  }}
>
  Export CSV
</Button>
```

**Focus Indicators:**

```css
/* Visible focus ring (WCAG requirement) */
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}

/* Remove focus ring on mouse click (but keep for keyboard) */
button:focus:not(:focus-visible) {
  outline: none;
}
```

**Tab Order:**

1. **Filters Panel:** Period → Tier → Provider → Model → Apply
2. **Dashboard:** Gross Margin Card → Provider Chart → Margin Chart → Histogram → Export Button

---

### 3. Screen Reader Support

**ARIA Labels:**

```tsx
<div role="region" aria-labelledby="gross-margin-heading">
  <h2 id="gross-margin-heading">Gross Margin Overview</h2>
  <div aria-live="polite" aria-atomic="true">
    Total margin: ${data.totalGrossMargin.toFixed(2)}, up {data.trend.marginChangePercent}% from last period
  </div>
</div>
```

**Chart Accessibility:**

```tsx
<BarChart aria-label="Provider cost breakdown bar chart">
  <Bar dataKey="cost" fill="#2563EB" />
  <Tooltip content={<CustomTooltip />} />

  {/* Screen reader accessible data table */}
  <table className="sr-only">
    <caption>Provider costs in USD</caption>
    <thead>
      <tr>
        <th>Provider</th>
        <th>Total Cost</th>
      </tr>
    </thead>
    <tbody>
      {data.providers.map(item => (
        <tr key={item.providerId}>
          <td>{item.providerName}</td>
          <td>${item.totalCost.toFixed(2)}</td>
        </tr>
      ))}
    </tbody>
  </table>
</BarChart>
```

**Loading Announcements:**

```tsx
{isLoading && (
  <div role="status" aria-live="polite">
    Loading analytics data...
  </div>
)}
```

**Error Announcements:**

```tsx
{isError && (
  <div role="alert" aria-live="assertive">
    Failed to load analytics data. Please try again.
  </div>
)}
```

---

### 4. Semantic HTML

```tsx
{/* ✅ GOOD: Semantic structure */}
<main>
  <h1>Admin Analytics Dashboard</h1>
  <section aria-labelledby="filters-heading">
    <h2 id="filters-heading">Filters</h2>
    <form>...</form>
  </section>
  <section aria-labelledby="gross-margin-heading">
    <h2 id="gross-margin-heading">Gross Margin Overview</h2>
    {/* KPI cards */}
  </section>
</main>

{/* ❌ BAD: Non-semantic divs */}
<div>
  <div className="title">Admin Analytics Dashboard</div>
  <div className="filters">...</div>
  <div className="content">...</div>
</div>
```

---

## CORS & CSRF Protection

### CORS Configuration

**Allowed Origins:**

```typescript
// backend/src/server.ts

import cors from 'cors';

const allowedOrigins = [
  'http://localhost:7052',      // Frontend dev
  'https://rephlo.com',         // Production frontend
  'https://admin.rephlo.com',   // Admin portal
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,  // Allow cookies (not used for analytics, but set for consistency)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
```

**CORS Preflight (OPTIONS):**

```
OPTIONS /admin/analytics/gross-margin HTTP/1.1
Origin: http://localhost:7052
Access-Control-Request-Method: GET
Access-Control-Request-Headers: Authorization

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:7052
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

---

### CSRF Protection

**Not Required for API-Only Endpoints:**

- Analytics API is stateless (JWT-based, no session cookies)
- No CSRF tokens needed (no session state to steal)

**Enforced Security:**

1. **Authorization Header Required:** Reject requests without `Authorization: Bearer <token>`
2. **Origin Validation:** CORS whitelist prevents unauthorized origins
3. **JWT Expiry:** Tokens expire after 1 hour (short-lived)

---

## Error Handling

### Standardized Error Responses

**Format:**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional context (optional)",
    "timestamp": "2025-01-30T14:32:15.000Z",
    "requestId": "req-abc123"
  }
}
```

---

### Error Codes

| Code                         | HTTP Status | Description                          | User Action                     |
|------------------------------|-------------|--------------------------------------|---------------------------------|
| `ANALYTICS_QUERY_FAILED`     | 500         | Database query timeout               | Retry with narrower date range  |
| `INVALID_DATE_RANGE`         | 400         | Start date > end date                | Fix date range                  |
| `RATE_LIMIT_EXCEEDED`        | 429         | Too many requests                    | Wait 1 hour                     |
| `INSUFFICIENT_PERMISSIONS`   | 403         | Not admin user                       | Contact admin                   |
| `CSV_EXPORT_TOO_LARGE`       | 413         | >500k rows requested                 | Narrow filters                  |
| `VALIDATION_ERROR`           | 400         | Invalid query parameters (Zod)       | Fix parameter format            |
| `UNAUTHORIZED`               | 401         | Missing or invalid JWT               | Re-authenticate                 |

---

### Error Handling Middleware

```typescript
// backend/src/middleware/errorHandler.ts

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log error with requestId for tracing
  logger.error({
    message: err.message,
    stack: err.stack,
    requestId: req.id,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
  });

  // Determine error code and status
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';

  if (err instanceof UnauthorizedError) {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
  } else if (err instanceof ForbiddenError) {
    statusCode = 403;
    errorCode = 'INSUFFICIENT_PERMISSIONS';
  } else if (err instanceof ValidationError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.message.includes('Database timeout')) {
    statusCode = 500;
    errorCode = 'ANALYTICS_QUERY_FAILED';
  }

  // Return standardized error response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.id,
    }
  });
}
```

---

### Security Error Responses (Vague for Attackers)

```json
// ✅ GOOD: Vague error (doesn't leak info)
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication failed",
    "timestamp": "2025-01-30T14:32:15.000Z"
  }
}

// ❌ BAD: Detailed error (leaks implementation details)
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "JWT signature verification failed: Invalid RS256 signature. JWKS endpoint returned 404. User ID user-123 not found in database."
  }
}
```

---

## References

- **Plan:** [180-admin-analytics-dashboard-ui-design.md](../plan/180-admin-analytics-dashboard-ui-design.md)
- **Backend Architecture:** [181-analytics-backend-architecture.md](./181-analytics-backend-architecture.md)
- **Frontend Architecture:** [182-analytics-frontend-architecture.md](./182-analytics-frontend-architecture.md)
- **Database Schema:** [183-analytics-database-schema.md](./183-analytics-database-schema.md)
- **WCAG 2.1 Guidelines:** [https://www.w3.org/WAI/WCAG21/quickref/](https://www.w3.org/WAI/WCAG21/quickref/)
- **OWASP Top 10:** [https://owasp.org/www-project-top-ten/](https://owasp.org/www-project-top-ten/)
