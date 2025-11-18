# Plan 180: Admin Analytics Dashboard UI Design

**Document ID**: 180-admin-analytics-dashboard-ui-design.md
**Version**: 2.0 (Refactored)
**Status**: Design Ready for Implementation
**Created**: 2025-01-13
**Last Updated**: 2025-01-13
**Target Completion**: 2025-01-20 (7 days)
**Scope**: UI design for vendor cost and gross margin analytics visualization

**Dependencies:**
- Plan 161: Provider Pricing System Activation (architecture)
- Progress 179: Provider Pricing & Credit System Implementation Completion (backend ready)

**Owner**: Frontend Architecture & UX Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Design Objectives](#design-objectives)
4. [Component Specifications](#component-specifications)
5. [Wireframes & Layouts](#wireframes--layouts)
6. [Implementation Tasks](#implementation-tasks)
7. [Success Criteria](#success-criteria)
8. [Technical References](#technical-references)

---

## Executive Summary

### Context

The Provider Pricing & Credit Deduction System (Plan 161, Progress 179) has been successfully implemented in the backend with:
- ✅ 62 AI models seeded with vendor pricing (OpenAI, Anthropic, Google, Azure, Mistral)
- ✅ Tier-based margin multipliers (Free: 2.5x, Pro: 1.8x, Enterprise: 1.5x)
- ✅ Atomic credit deduction tracking vendor cost and gross profit per API request
- ✅ `token_usage_ledger` table with complete financial analytics data

### Problem Statement

Currently, the Admin Dashboard displays KPIs but lacks vendor cost analytics. Admins have no visibility into:
- Platform profitability (gross margins)
- Vendor cost trends over time
- Cost distribution across providers
- Margin efficiency by subscription tier

### Solution

Add **Analytics Dashboard** to Admin Portal with 6 new components:

1. **Gross Margin Overview Card** - KPI summary with tier breakdown
2. **Provider Cost Chart** - Bar chart showing top 5 providers by cost
3. **Margin Trend Chart** - Line chart showing gross margin over time
4. **Cost Histogram** - Distribution of request costs with anomaly detection
5. **Advanced Filters Panel** - Date range, tier, provider, model filters
6. **CSV Export Button** - Download analytics data

**Timeline:** 7 days (61 hours)
**Team:** 1 full-stack developer + 1 QA engineer

---

## Current State Analysis

### Existing Admin Dashboard

**File:** `frontend/src/pages/admin/AdminDashboard.tsx` (483 lines)

**Current Features:**
- KPI grid (Total Users, Active Subscriptions, Revenue, Credits Used)
- Revenue Mix donut chart
- Recent Activity feed
- User management table

**Missing:**
- Vendor cost analytics
- Gross margin visualization
- Financial trend analysis
- Export functionality

### Backend Data Available

**Table:** `token_usage_ledger`

**Key Fields:**
- `vendor_cost` (Decimal(10,8)) - Cost paid to LLM provider
- `gross_margin_usd` (Decimal(10,8)) - Profit per request
- `margin_multiplier` (Decimal(5,2)) - Tier-based multiplier
- `credits_deducted` (Int) - Credits charged (1 credit = $0.01 USD)
- `created_at` (DateTime) - Request timestamp
- `status` (String) - 'success', 'failed', 'partial'

**Current Data Volume:** ~50k requests/month
**Expected Growth:** 500k requests/month within 6 months

---

## Design Objectives

### Priority Breakdown

**P0 (Must-Have):**
1. Real-time gross margin KPI with trend indicator
2. Provider cost breakdown (top 5 providers)
3. Margin trend visualization (30-day default)
4. Date range filter (Last 7/30/90 days, Custom)
5. Data accuracy (8 decimal precision for USD)

**P1 (Should-Have):**
1. Cost per request histogram with anomaly detection
2. Tier-based filtering (Free/Pro/Enterprise)
3. Provider multi-select filter
4. Model multi-select filter
5. CSV export with streaming (handles >100k rows)
6. Responsive design (desktop/tablet/mobile)

**P2 (Nice-to-Have):**
1. Custom date ranges with calendar picker
2. Gross margin alerts (email notifications)
3. Predictive cost modeling (ML-based forecasts)

### Non-Goals

- ❌ Individual user-level analytics (privacy concern)
- ❌ Real-time streaming updates (5-min cache acceptable)
- ❌ Custom report builder (future feature)

---

## Component Specifications

### 1. Gross Margin Overview Card

**Purpose:** Display high-level KPI summary with trend comparison

**Data Displayed:**
- Total Gross Margin (USD)
- Margin Percentage (%)
- Avg Margin per Request (USD)
- Trend indicator (↑/↓ vs previous period)
- Tier breakdown (Free/Pro/Enterprise)

**Acceptance Criteria:**
- ✅ KPIs update when filters change
- ✅ Trend indicator shows % change from previous period
- ✅ Tier breakdown sums to total margin (±$0.01 tolerance)
- ✅ Loading skeleton during data fetch

**Tech Stack:** React Query + Recharts (mini bar chart for tier breakdown)

---

### 2. Provider Cost Comparison Chart

**Purpose:** Visualize vendor costs across top 5 providers

**Chart Type:** Horizontal Bar Chart

**Data Displayed:**
- Provider name (OpenAI, Anthropic, Google, Azure, Mistral)
- Total cost (USD)
- Request count
- Average cost per request
- Percentage of total cost

**Acceptance Criteria:**
- ✅ Shows top 5 providers by cost (descending order)
- ✅ Tooltips display detailed metrics on hover
- ✅ Color-coded bars using Rephlo brand colors
- ✅ Responsive (stacks vertically on mobile)

**Tech Stack:** Recharts BarChart

---

### 3. Margin Trend Line Chart

**Purpose:** Visualize gross margin trends over time

**Chart Type:** Line Chart with dual axes

**Data Displayed:**
- Gross margin (USD) over time
- Request count (secondary axis)
- 7-day moving average
- 30-day moving average (if date range ≥30 days)

**Granularity Selector:**
- Hour (for last 7 days)
- Day (for last 30-90 days)
- Week (for custom ranges >90 days)
- Month (for custom ranges >180 days)

**Acceptance Criteria:**
- ✅ Line chart shows clear trend direction
- ✅ Moving averages smooth out daily volatility
- ✅ Granularity auto-selects based on date range
- ✅ X-axis labels formatted clearly (no overlap)

**Tech Stack:** Recharts LineChart

---

### 4. Cost per Request Histogram

**Purpose:** Show distribution of request costs and identify anomalies

**Chart Type:** Histogram (Bar Chart with buckets)

**Data Displayed:**
- Cost buckets ($0-0.01, $0.01-0.10, $0.10-1.00, $1.00-10.00, $10.00+)
- Request count per bucket
- Total cost per bucket
- Anomalies highlighted (>3 std dev from mean)

**Statistics Panel:**
- Mean cost per request
- Median cost
- 95th percentile (P95)
- 99th percentile (P99)
- Standard deviation

**Acceptance Criteria:**
- ✅ Buckets cover full cost range
- ✅ Anomalies highlighted with red bars
- ✅ Statistics panel updates with filters
- ✅ Tooltips show bucket details

**Tech Stack:** Recharts BarChart + custom statistics calculation

---

### 5. Advanced Filters Panel

**Purpose:** Allow admins to filter analytics by multiple dimensions

**Filter Options:**

1. **Period Selector** (Radio buttons)
   - Last 7 Days
   - Last 30 Days (default)
   - Last 90 Days
   - Custom Range (opens date picker)

2. **Tier Selector** (Radio buttons)
   - All Tiers (default)
   - Free
   - Pro
   - Enterprise

3. **Provider Multi-Select** (Checkboxes)
   - OpenAI
   - Anthropic
   - Google
   - Azure
   - Mistral
   - Select All / Deselect All

4. **Model Multi-Select** (Checkboxes with search)
   - GPT-4o
   - Claude 3.5 Sonnet
   - Gemini Pro
   - (62 models total - show top 10, search for rest)

**Acceptance Criteria:**
- ✅ Filters persist to URL query params (shareable links)
- ✅ Filters persist to LocalStorage (user preference)
- ✅ "Apply Filters" button triggers refetch
- ✅ "Reset Filters" button clears all selections

**Tech Stack:** shadcn/ui (DatePicker, RadioGroup, Checkbox, MultiSelect)

---

### 6. CSV Export Button

**Purpose:** Download analytics data for external analysis

**Export Format:** CSV

**CSV Schema:**
```csv
date,tier,provider,model,request_count,total_cost,gross_margin,avg_cost_per_request
2025-01-15,pro,openai,gpt-4o,1250,125.50,45.20,0.1004
```

**Acceptance Criteria:**
- ✅ Exports data matching current filters
- ✅ Handles large datasets (>100k rows) with streaming
- ✅ Filename format: `rephlo-analytics-{period}.csv`
- ✅ Loading spinner during export
- ✅ Success toast notification on download

**Tech Stack:** Backend streaming + browser download API

---

## Wireframes & Layouts

### Desktop Layout (≥1024px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ REPHLO ADMIN DASHBOARD                            [User Menu ▼] [Logout] │
├──────────────────────────────────────────────────────────────────────────┤
│ [Dashboard] [Users] [Subscriptions] ➤ [Analytics] [Settings]            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Analytics Dashboard                                [Export CSV 📥]      │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ FILTERS PANEL                                                      │ │
│  │                                                                    │ │
│  │  Period: [Last 30 Days ▼]  Tier: [○ All ● Free ○ Pro ○ Ent]     │ │
│  │  Providers: [☑ OpenAI ☑ Anthropic ☑ Google ☑ Azure ☐ Mistral]   │ │
│  │  Models: [☑ GPT-4o ☑ Claude 3.5 Sonnet ☐ Gemini Pro]            │ │
│  │                                                    [Apply Filters] │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │ GROSS MARGIN OVERVIEW                            Last 30 Days       ││
│  ├──────────────────────────────────────────────────────────────────────┤│
│  │                                                                      ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             ││
│  │  │ Total Margin │  │ Margin %     │  │ Avg per Req  │             ││
│  │  │   $4,532.15  │  │    42.3%     │  │    $0.0128   │             ││
│  │  │   ↑ +12.5%   │  │   ↑ +2.1pp   │  │   ↓ -0.8%    │             ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘             ││
│  │                                                                      ││
│  │  By Tier:  Free: $824 (18%) | Pro: $2,856 (63%) | Ent: $852 (19%) ││
│  │                                                                      ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ PROVIDER COST BREAKDOWN        │  │ MARGIN TREND                   │ │
│  ├────────────────────────────────┤  ├────────────────────────────────┤ │
│  │                                │  │                                │ │
│  │  OpenAI     ████████ $2,145   │  │  $5k ┐                         │ │
│  │  Anthropic  █████ $1,234      │  │      │    ╱╲                   │ │
│  │  Google     ███ $678          │  │  $3k ┤   ╱  ╲  ╱╲              │ │
│  │  Azure      ██ $345           │  │      │  ╱    ╲╱  ╲             │ │
│  │  Mistral    █ $130            │  │  $1k ┤ ╱          ╲            │ │
│  │                                │  │      └────────────────────────  │ │
│  │  Total: $4,532  (15,890 reqs) │  │      Jan 1   Jan 15   Jan 30   │ │
│  │                                │  │                                │ │
│  └────────────────────────────────┘  └────────────────────────────────┘ │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐│
│  │ COST PER REQUEST DISTRIBUTION                                        ││
│  ├──────────────────────────────────────────────────────────────────────┤│
│  │                                                                      ││
│  │   Requests                                                           ││
│  │   5000 ┐                                                             ││
│  │        │  ████                                                       ││
│  │   3000 ┤  ████  ███                                                 ││
│  │        │  ████  ███  ██                                             ││
│  │   1000 ┤  ████  ███  ██  █  █                                       ││
│  │        └─────────────────────────────────────                       ││
│  │          $0.01 $0.10 $1.00 $10                                      ││
│  │                                                                      ││
│  │  Mean: $0.179 | Median: $0.125 | P95: $0.450 | P99: $1.20          ││
│  │  Anomalies: 3 requests >$10 (highlighted in red)                    ││
│  │                                                                      ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Tablet Layout (768px-1023px)

- Filters panel: 2-column grid (Period + Tier | Providers + Models)
- Gross Margin card: 3 KPIs in single row
- Provider Chart + Margin Chart: Stacked vertically (full width)
- Cost Histogram: Full width

### Mobile Layout (<768px)

- Filters panel: Single column, collapsible accordion
- Gross Margin card: KPIs stacked vertically
- All charts: Full width, reduced height (300px)
- CSV Export button: Fixed at bottom

---

## Implementation Tasks

### Phase 1: Backend API Development (14 hours)

**Task 1.1: AnalyticsService Implementation (6 hours)**
- Create `backend/src/services/analytics.service.ts`
- Implement 5 methods: getGrossMarginKPI, getCostByProvider, getMarginTrend, getCostDistribution, exportToCSV
- Write unit tests (90% coverage)

**Task 1.2: AnalyticsController Implementation (4 hours)**
- Create `backend/src/controllers/analytics.controller.ts`
- Implement HTTP handlers with Zod validation
- Add error handling with standardized responses

**Task 1.3: Analytics Routes & Middleware (2 hours)**
- Create `backend/src/api/analytics.routes.ts`
- Apply authentication + admin scope middleware
- Configure rate limiting (100 req/hour)

**Task 1.4: Database Indexes (2 hours)**
- Create composite index: `idx_token_usage_analytics`
- Create partial index: `idx_token_usage_success`
- Run performance benchmarks

**Acceptance Criteria:**
- ✅ All 5 endpoints return 200 OK with valid JWT
- ✅ Non-admin users get 403 Forbidden
- ✅ Rate limit enforced (429 after 100 requests)
- ✅ Database queries <500ms for 100k rows

**Technical Reference:** [181-analytics-backend-architecture.md](../reference/181-analytics-backend-architecture.md)

---

### Phase 2: Frontend Components (21 hours)

**Task 2.1: Custom Hooks (4 hours)**
- Create `frontend/src/hooks/useAnalytics.ts`
- Implement 5 hooks: useGrossMarginKPI, useCostByProvider, useMarginTrend, useCostDistribution, useExportCSV
- Configure React Query cache (5-min staleTime, 10-min cacheTime)

**Task 2.2: API Client Layer (2 hours)**
- Create `frontend/src/api/analytics.api.ts`
- Implement 5 API methods with type-safe Axios calls
- Add error handling and response transformation

**Task 2.3: AnalyticsDashboard Container (3 hours)**
- Create `frontend/src/pages/admin/AnalyticsDashboard.tsx`
- Implement filter state management (URL params + LocalStorage)
- Add loading states and error boundaries

**Task 2.4: AdvancedFiltersPanel Component (4 hours)**
- Create `frontend/src/components/AdvancedFiltersPanel.tsx`
- Implement date picker, tier selector, provider/model multi-select
- Add "Apply" and "Reset" buttons

**Task 2.5: Chart Components (6 hours)**
- GrossMarginOverviewCard (2 hours)
- ProviderCostChart (1.5 hours)
- MarginTrendChart (1.5 hours)
- CostHistogramChart (1 hour)

**Task 2.6: CSVExportButton Component (2 hours)**
- Create `frontend/src/components/CSVExportButton.tsx`
- Implement mutation hook with loading state
- Add success/error toast notifications

**Acceptance Criteria:**
- ✅ All components render without errors
- ✅ Filters trigger data refetch
- ✅ Charts display correct data
- ✅ CSV export downloads file
- ✅ Responsive design works on mobile

**Technical Reference:** [182-analytics-frontend-architecture.md](../reference/182-analytics-frontend-architecture.md)

---

### Phase 3: Testing & Polish (18 hours)

**Task 3.1: Backend Integration Tests (6 hours)**
- Write integration tests for all 5 endpoints
- Test filter combinations (date range, tier, provider, model)
- Test error scenarios (invalid JWT, rate limit, validation errors)

**Task 3.2: Frontend Component Tests (6 hours)**
- Write React Testing Library tests for all components
- Test user interactions (filter changes, chart tooltips, CSV export)
- Test loading and error states

**Task 3.3: Accessibility Audit (3 hours)**
- Run axe-core accessibility checker
- Fix color contrast issues (WCAG 2.1 AA)
- Add ARIA labels and keyboard navigation

**Task 3.4: Performance Optimization (3 hours)**
- Add React.memo to chart components
- Implement code splitting for Recharts
- Optimize bundle size (target: <300KB initial)

**Acceptance Criteria:**
- ✅ 90% test coverage (backend + frontend)
- ✅ WCAG 2.1 AA compliance (axe-core 0 violations)
- ✅ Lighthouse performance score ≥90
- ✅ Bundle size <300KB initial, <200KB lazy-loaded

**Technical Reference:** [184-analytics-security-compliance.md](../reference/184-analytics-security-compliance.md)

---

### Phase 4: Documentation (8 hours)

**Task 4.1: API Documentation (3 hours)**
- Document all 5 endpoints with OpenAPI/Swagger spec
- Add request/response examples
- Document error codes and responses

**Task 4.2: User Guide (2 hours)**
- Create admin user guide: "How to Use Analytics Dashboard"
- Add screenshots and step-by-step instructions
- Document CSV export format

**Task 4.3: Implementation Completion Report (3 hours)**
- Write completion report in `docs/progress/`
- Include before/after metrics
- Document known issues and future enhancements

**Acceptance Criteria:**
- ✅ OpenAPI spec validates (no errors)
- ✅ User guide reviewed by PM
- ✅ Completion report published

---

## Success Criteria

### Functional Requirements

**Data Accuracy:**
| Metric                  | Tolerance | Verification Method                              |
|-------------------------|-----------|--------------------------------------------------|
| Total Gross Margin      | ±$0.01    | Manual SQL query vs API response                 |
| Margin Percentage       | ±0.01%    | Compare (margin/revenue)*100 with displayed %    |
| Avg Cost per Request    | ±$0.0001  | SUM(vendor_cost)/COUNT(*) verification          |
| Tier Breakdown          | ±$0.01    | Sum of tier amounts = total margin              |

**Performance Requirements:**
| Component                | Target Load Time | Acceptable | Unacceptable |
|--------------------------|------------------|------------|--------------|
| Initial Dashboard Load   | <2s              | <3s        | >3s          |
| Gross Margin Card        | <500ms           | <1s        | >1s          |
| Provider Cost Chart      | <800ms           | <1.5s      | >1.5s        |
| Margin Trend Chart       | <800ms           | <1.5s      | >1.5s        |
| Cost Histogram           | <600ms           | <1s        | >1s          |
| CSV Export (10k rows)    | <5s              | <10s       | >10s         |

---

### Business Metrics

**Adoption Rate:**
- Target: 80% of admin users access Analytics Dashboard within 30 days
- Measurement: Track page views in analytics tool

**Anomaly Detection:**
- Target: Identify 95% of cost anomalies (>3 std dev) within 24 hours
- Measurement: Manual review of anomaly alerts vs actual outliers

**Reporting Efficiency:**
- Target: Reduce time to generate financial reports by 50% (from 2 hours to 1 hour)
- Measurement: Survey admin users before/after implementation

---

### Technical Health Metrics

**API Performance:**
- Response time P95: <1s
- Error rate: <0.1%
- Rate limit violations: <5% of total requests

**Frontend Performance:**
- Lighthouse Performance score: ≥90
- First Contentful Paint (FCP): <1.5s
- Largest Contentful Paint (LCP): <2.5s

**Code Quality:**
- Test coverage: ≥90% (backend + frontend)
- ESLint warnings: 0
- TypeScript errors: 0
- Accessibility violations (axe-core): 0

---

## Technical References

### Architecture Documents

- **Backend API:** [181-analytics-backend-architecture.md](../reference/181-analytics-backend-architecture.md)
  - API endpoint specifications (5 endpoints)
  - Service layer implementation (~400 lines TypeScript)
  - Database query patterns with SQL examples
  - Error handling and security implementation

- **Frontend Components:** [182-analytics-frontend-architecture.md](../reference/182-analytics-frontend-architecture.md)
  - Component hierarchy and responsibilities
  - Custom hooks implementation (React Query)
  - State management flow (URL params + LocalStorage)
  - Performance optimization (React.memo, code splitting)

- **Database Schema:** [183-analytics-database-schema.md](../reference/183-analytics-database-schema.md)
  - token_usage_ledger schema and key fields
  - Database indexes (composite + partial)
  - Query optimization patterns
  - Performance benchmarks (50-200ms target)

- **Security & Compliance:** [184-analytics-security-compliance.md](../reference/184-analytics-security-compliance.md)
  - JWT authentication and authorization
  - Rate limiting (100 req/hour for admins)
  - Data privacy (no PII exposure)
  - WCAG 2.1 AA accessibility compliance

### Related Plans

- **Plan 161:** Provider Pricing System Activation
- **Progress 179:** Provider Pricing & Credit System Implementation Completion
- **API Standards:** [156-api-standards.md](../reference/156-api-standards.md)

---

## Revision History

| Version | Date       | Author              | Changes                                      |
|---------|------------|---------------------|----------------------------------------------|
| 1.0     | 2025-01-13 | Frontend Team       | Initial design specification                 |
| 2.0     | 2025-01-13 | Frontend Team       | Refactored to high-level plan with references|

---

**END OF PLAN 180**
