# Performance Monitoring Guide - Rephlo

**Document Version:** 1.0
**Last Updated:** November 2025

---

## Overview

This guide outlines performance monitoring practices for the Rephlo branding website to ensure optimal user experience and system health.

---

## Performance Targets

### Frontend Performance Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Lighthouse Performance Score** | > 90 | < 70 |
| **First Contentful Paint (FCP)** | < 1.5s | > 3s |
| **Largest Contentful Paint (LCP)** | < 2.5s | > 4s |
| **Time to Interactive (TTI)** | < 3.0s | > 5s |
| **Cumulative Layout Shift (CLS)** | < 0.1 | > 0.25 |
| **Total Blocking Time (TBT)** | < 200ms | > 500ms |
| **Page Load Time** | < 2s | > 5s |
| **Total Bundle Size** | < 500KB | > 1MB |

### Backend Performance Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **API Response Time (simple)** | < 300ms | > 1s |
| **API Response Time (complex)** | < 1s | > 3s |
| **Database Query Time** | < 100ms | > 500ms |
| **Error Rate** | < 1% | > 5% |
| **Uptime** | > 99.9% | < 99% |
| **Request Throughput** | 10,000/day | N/A |

---

## Frontend Monitoring

### Lighthouse Audits

**Run Lighthouse periodically:**

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://rephlo.ai --view

# Run with specific settings
lighthouse https://rephlo.ai \
  --only-categories=performance,accessibility,best-practices \
  --output=html \
  --output-path=./lighthouse-report.html
```

**Automated Lighthouse CI:**

Create `.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse CI

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            https://rephlo.ai
            https://rephlo.ai/admin
          uploadArtifacts: true
```

### Core Web Vitals Monitoring

**Using Google Analytics 4:**

```javascript
// frontend/src/main.tsx or App.tsx
import { onCLS, onFCP, onFID, onLCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to Google Analytics
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
}

onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### Real User Monitoring (RUM)

**Using Vercel Analytics (if deployed to Vercel):**

```javascript
// frontend/src/main.tsx
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  );
}
```

**Alternative: LogRocket (free tier available):**

```bash
npm install logrocket
```

```javascript
// frontend/src/main.tsx
import LogRocket from 'logrocket';

if (import.meta.env.PROD) {
  LogRocket.init('your-app-id');
}
```

### Bundle Size Monitoring

**Analyze bundle size:**

```bash
cd frontend
npm run build

# Review output:
# dist/assets/index-abc123.js   145.23 kB │ gzip: 46.15 kB
# dist/assets/vendor-def456.js  234.56 kB │ gzip: 78.90 kB
```

**Set up bundle size alerts:**

Create `.github/workflows/bundle-size.yml`:

```yaml
name: Bundle Size Check

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          skip_step: install
          build_script: npm run build
          directory: frontend
```

---

## Backend Monitoring

### Response Time Monitoring

**Add timing middleware:**

```typescript
// backend/src/middleware/timing.ts
import { Request, Response, NextFunction } from 'express';

export function timingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);

    // Alert if slow
    if (duration > 1000) {
      console.warn(`SLOW REQUEST: ${req.method} ${req.path} - ${duration}ms`);
    }
  });

  next();
}
```

### Database Query Performance

**Enable Prisma query logging:**

```typescript
// backend/src/db/index.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Log slow queries
prisma.$on('query', (e: any) => {
  if (e.duration > 100) {
    console.warn(`SLOW QUERY (${e.duration}ms): ${e.query}`);
  }
});
```

### Error Rate Monitoring

**Track error rates:**

```typescript
// backend/src/middleware/errorTracking.ts
let errorCount = 0;
let requestCount = 0;

export function trackErrors(err: any, req: Request, res: Response, next: NextFunction) {
  errorCount++;
  requestCount++;

  const errorRate = (errorCount / requestCount) * 100;

  if (errorRate > 5) {
    console.error(`HIGH ERROR RATE: ${errorRate.toFixed(2)}%`);
  }

  next(err);
}
```

---

## Monitoring Tools

### Free/Open Source Options

**1. UptimeRobot (Free)**
- Monitor: https://rephlo.ai and https://api.rephlo.ai/health
- Interval: 5 minutes
- Alerts: Email, Slack, webhook
- Setup: https://uptimerobot.com

**2. Checkly (Free tier)**
- Synthetic monitoring
- API endpoint checks
- Browser checks
- Setup: https://checklyhq.com

**3. Google PageSpeed Insights**
- Free performance reports
- Core Web Vitals tracking
- URL: https://pagespeed.web.dev

**4. Render/Vercel Built-in Metrics**
- CPU, Memory usage
- Request latency
- Error rates
- Available in dashboards

### Paid Options (Optional)

**1. Sentry (Error Tracking)**
- Frontend and backend error tracking
- Performance monitoring
- Release tracking
- Cost: $26/month for 50k events

```bash
# Install Sentry
npm install @sentry/node @sentry/react
```

```typescript
// Backend: backend/src/server.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.errorHandler());
```

```typescript
// Frontend: frontend/src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

**2. New Relic (APM)**
- Full application performance monitoring
- Database monitoring
- Real user monitoring
- Cost: $99/month

**3. Datadog (Full Stack)**
- Infrastructure monitoring
- APM
- Log aggregation
- Cost: $15/host/month

---

## Metrics Dashboards

### Render Dashboard (Built-in)

**Access:** Render Dashboard → Service → Metrics

**Available Metrics:**
- CPU usage
- Memory usage
- Request latency (p50, p95, p99)
- Request rate
- Error rate

### Vercel Analytics (Built-in)

**Access:** Vercel Dashboard → Project → Analytics

**Available Metrics:**
- Real user metrics
- Core Web Vitals
- Page views
- Unique visitors
- Top pages

### Custom Grafana Dashboard (Optional)

**For self-hosted monitoring:**

```bash
# Docker compose with Prometheus + Grafana
# Create docker-compose.monitoring.yml

version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  prometheus_data:
  grafana_data:
```

---

## Performance Optimization Tips

### Frontend Optimizations

1. **Code Splitting**
   ```javascript
   // Lazy load routes
   const AdminPage = lazy(() => import('./pages/Admin'));
   ```

2. **Image Optimization**
   ```bash
   # Convert to WebP
   npm install -g sharp-cli
   sharp -i public/images/*.png -o public/images/ -f webp
   ```

3. **Bundle Optimization**
   ```javascript
   // vite.config.ts
   export default defineConfig({
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom', 'react-router-dom'],
           },
         },
       },
     },
   });
   ```

### Backend Optimizations

1. **Database Indexes**
   ```prisma
   model Download {
     @@index([timestamp])
     @@index([os])
   }
   ```

2. **Response Caching**
   ```typescript
   // Cache version endpoint (rarely changes)
   let versionCache: any = null;
   let cacheTime = 0;

   app.get('/api/version', async (req, res) => {
     if (versionCache && Date.now() - cacheTime < 3600000) {
       return res.json(versionCache);
     }

     const version = await getLatestVersion();
     versionCache = version;
     cacheTime = Date.now();
     res.json(version);
   });
   ```

3. **Connection Pooling**
   ```typescript
   // Prisma handles connection pooling automatically
   // Ensure DATABASE_URL has pool settings if needed
   ```

---

## Alerts & Thresholds

### Critical Alerts (Immediate Action)

- **Uptime < 99%** → Page on-call engineer
- **Error rate > 10%** → Alert team immediately
- **Response time > 3s** → Investigate urgently
- **Database down** → Critical incident

### Warning Alerts (Monitor Closely)

- **Uptime < 99.5%** → Email team
- **Error rate > 5%** → Slack notification
- **Response time > 1s** → Log and monitor
- **Lighthouse score < 70** → Plan optimization

### Configuration Example (UptimeRobot)

```
Monitor: https://api.rephlo.ai/health
Type: HTTP(s)
Interval: 5 minutes
Timeout: 30 seconds

Alert when down for: 5 minutes
Alert contacts:
  - Email: team@rephlo.ai
  - Slack: #alerts
```

---

## Regular Performance Reviews

### Weekly Review

- [ ] Check uptime statistics (target: 99.9%)
- [ ] Review error logs
- [ ] Check response time trends
- [ ] Monitor database growth

### Monthly Review

- [ ] Run Lighthouse audit
- [ ] Analyze user metrics
- [ ] Review slow query logs
- [ ] Check bundle sizes
- [ ] Plan optimizations if needed

### Quarterly Review

- [ ] Comprehensive performance audit
- [ ] Load testing
- [ ] Security performance review
- [ ] Infrastructure capacity planning

---

## Quick Reference

### Performance Commands

```bash
# Frontend
cd frontend
npm run build  # Check bundle sizes
npx lighthouse https://rephlo.ai --view

# Backend
curl -w "@curl-format.txt" https://api.rephlo.ai/api/version

# Create curl-format.txt:
echo 'time_total: %{time_total}s\n' > curl-format.txt
```

### Monitoring URLs

- Frontend: https://rephlo.ai
- Backend Health: https://api.rephlo.ai/health
- Admin Dashboard: https://rephlo.ai/admin

---

**Document Status:** Production Ready
**Maintained By:** DevOps Team
**Review Frequency:** Monthly
