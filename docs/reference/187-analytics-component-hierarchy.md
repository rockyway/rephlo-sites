# Analytics Dashboard Component Hierarchy

**Document ID:** 187
**Date:** 2025-11-13
**Related:** Plan 180, Progress Report 186

---

## Component Tree Structure

```
AnalyticsDashboard (Main Container)
│
├─ AdminLayout (Parent wrapper - existing)
│  ├─ Breadcrumbs
│  └─ Main Content Area
│     └─ [Container renders here]
│
├─ Page Header Section
│  ├─ Title: "Analytics Dashboard"
│  ├─ Description: "Vendor cost and gross margin analytics"
│  └─ CSVExportButton
│     ├─ useExportCSV() mutation hook
│     ├─ Download icon (lucide-react)
│     ├─ Loading spinner
│     └─ Error message (conditional)
│
├─ AdvancedFiltersPanel
│  ├─ Period Selector (4 buttons)
│  │  ├─ Last 7 Days
│  │  ├─ Last 30 Days
│  │  ├─ Last 90 Days
│  │  └─ Custom (future: date picker)
│  │
│  ├─ Tier Selector (4 buttons)
│  │  ├─ All
│  │  ├─ Free
│  │  ├─ Pro
│  │  └─ Enterprise
│  │
│  └─ Provider Multi-Select (5 toggle buttons)
│     ├─ OpenAI
│     ├─ Anthropic
│     ├─ Google
│     ├─ Azure
│     └─ Mistral
│
├─ GrossMarginOverviewCard (Full Width)
│  ├─ useGrossMarginKPI() query hook
│  ├─ Loading State (skeleton with 8 placeholders)
│  ├─ Error State (error message)
│  │
│  ├─ Screen Reader Summary (sr-only)
│  │  └─ Accessible text announcement
│  │
│  ├─ KPI Metrics Grid (4 metrics)
│  │  ├─ Total Gross Margin
│  │  │  ├─ Value (formatted currency)
│  │  │  └─ Label
│  │  │
│  │  ├─ Margin Percentage
│  │  │  ├─ Value (percentage)
│  │  │  └─ Label
│  │  │
│  │  ├─ Avg Margin per Request
│  │  │  ├─ Value (formatted currency)
│  │  │  └─ Label
│  │  │
│  │  └─ Trend
│  │     ├─ Direction (up/down/neutral)
│  │     ├─ Icon (TrendingUp/TrendingDown/Minus)
│  │     ├─ Percentage change
│  │     └─ Comparison text
│  │
│  └─ Tier Breakdown Section
│     ├─ Section Title: "Breakdown by Tier"
│     │
│     └─ Tier List (3 items)
│        ├─ Free Tier
│        │  ├─ Tier name
│        │  ├─ Gross margin (currency)
│        │  ├─ Percentage of total
│        │  └─ Mini horizontal bar chart
│        │
│        ├─ Pro Tier
│        │  └─ [same structure]
│        │
│        └─ Enterprise Tier
│           └─ [same structure]
│
├─ Charts Grid (2 columns on desktop, 1 on mobile)
│  │
│  ├─ ProviderCostChart
│  │  ├─ useCostByProvider() query hook
│  │  ├─ Loading State (skeleton)
│  │  ├─ Error State (error message)
│  │  │
│  │  ├─ Statistics Summary
│  │  │  ├─ Total Providers Count
│  │  │  ├─ Total Cost (formatted)
│  │  │  ├─ Average Cost (formatted)
│  │  │  └─ Request Count (formatted)
│  │  │
│  │  ├─ Recharts BarChart (horizontal)
│  │  │  ├─ ResponsiveContainer (300px height)
│  │  │  ├─ CartesianGrid
│  │  │  ├─ XAxis (cost values)
│  │  │  ├─ YAxis (provider names)
│  │  │  ├─ Tooltip (custom component)
│  │  │  └─ Bar
│  │  │     └─ Cell (5 colors)
│  │  │
│  │  └─ Screen Reader Table (sr-only)
│  │     ├─ Caption
│  │     ├─ Headers
│  │     └─ Data Rows (5 providers)
│  │
│  └─ MarginTrendChart
│     ├─ useMarginTrend() query hook
│     ├─ Loading State (skeleton)
│     ├─ Error State (error message)
│     │
│     ├─ Granularity Selector (4 buttons)
│     │  ├─ Hour
│     │  ├─ Day (default)
│     │  ├─ Week
│     │  └─ Month
│     │
│     ├─ Recharts LineChart
│     │  ├─ ResponsiveContainer (300px height)
│     │  ├─ CartesianGrid
│     │  ├─ XAxis (timestamps)
│     │  ├─ YAxis (margin values)
│     │  ├─ Tooltip (custom component)
│     │  ├─ Legend
│     │  │
│     │  ├─ Line: Gross Margin
│     │  │  ├─ Color: Blue (#2563EB)
│     │  │  ├─ strokeWidth: 2
│     │  │  └─ solid line
│     │  │
│     │  ├─ Line: 7-day Moving Average
│     │  │  ├─ Color: Cyan (#06B6D4)
│     │  │  ├─ strokeWidth: 1.5
│     │  │  └─ dashed (5 5)
│     │  │
│     │  └─ Line: 30-day Moving Average
│     │     ├─ Color: Purple (#8B5CF6)
│     │     ├─ strokeWidth: 1.5
│     │     └─ dashed (5 5)
│     │
│     └─ Screen Reader Table (sr-only)
│        ├─ Caption
│        ├─ Headers (Date, Margin, 7-day MA, 30-day MA)
│        └─ Data Rows (time series)
│
└─ CostHistogramChart (Full Width)
   ├─ useCostDistribution() query hook
   ├─ Loading State (skeleton)
   ├─ Error State (error message)
   │
   ├─ Statistics Panel (5 metrics)
   │  ├─ Mean (formatted currency)
   │  ├─ Median (formatted currency)
   │  ├─ Standard Deviation (formatted currency)
   │  ├─ P95 (95th percentile)
   │  └─ P99 (99th percentile)
   │
   ├─ Recharts BarChart
   │  ├─ ResponsiveContainer (300px height)
   │  ├─ CartesianGrid
   │  ├─ XAxis (cost ranges, rotated -45°)
   │  ├─ YAxis (request count)
   │  ├─ Tooltip (custom component)
   │  │
   │  └─ Bar
   │     └─ Cell (color by anomaly status)
   │        ├─ Normal: Blue (#2563EB)
   │        └─ Anomaly: Red (#EF4444)
   │
   ├─ Screen Reader Table (sr-only)
   │  ├─ Caption
   │  ├─ Headers (Range, Count)
   │  └─ Data Rows (10-15 buckets)
   │
   └─ Anomaly Alert (conditional)
      ├─ AlertCircle icon (red)
      ├─ Title: "Anomalies Detected: {count} requests >3σ from mean"
      └─ Highest cost: {formatted currency}
```

---

## Data Flow Diagram

```
User Interaction
    │
    ├─ Filter Change (Period/Tier/Provider)
    │  └─> setFilters() in AnalyticsDashboard
    │     ├─> URL params updated (useSearchParams)
    │     ├─> LocalStorage updated
    │     └─> All React Query hooks revalidate
    │        ├─> useGrossMarginKPI()
    │        ├─> useCostByProvider()
    │        ├─> useMarginTrend()
    │        └─> useCostDistribution()
    │           └─> Components re-render with new data
    │
    ├─ Granularity Change (MarginTrendChart)
    │  └─> setGranularity() local state
    │     └─> useMarginTrend() revalidates with new granularity
    │        └─> Chart re-renders
    │
    └─ CSV Export Click
       └─> useExportCSV() mutation
          └─> POST /admin/analytics/export-csv
             ├─> Success: Blob download
             └─> Error: Error message displayed

React Query Cache
    │
    ├─ Query Key: ['analytics', 'gross-margin', filters]
    │  ├─ staleTime: 5 minutes
    │  └─ gcTime: 10 minutes
    │
    ├─ Query Key: ['analytics', 'cost-by-provider', filters]
    ├─ Query Key: ['analytics', 'margin-trend', filters, granularity]
    └─ Query Key: ['analytics', 'cost-distribution', filters]
       │
       └─> Automatic refetch on:
          ├─ Filter change (queryKey changes)
          ├─ Window focus (if data stale)
          └─ Manual refetch (mutation success)

Backend API
    │
    ├─ GET /admin/analytics/gross-margin
    │  └─ Returns: GrossMarginKPIData
    │
    ├─ GET /admin/analytics/cost-by-provider
    │  └─ Returns: ProviderCostData
    │
    ├─ GET /admin/analytics/margin-trend
    │  └─ Returns: MarginTrendData
    │
    ├─ GET /admin/analytics/cost-distribution
    │  └─ Returns: CostDistributionData
    │
    └─ POST /admin/analytics/export-csv
       └─ Returns: CSV Blob (file download)
```

---

## State Management Flow

### Global State (AnalyticsDashboard)

```typescript
// Priority order for initialization
const [filters, setFilters] = useState<AnalyticsFilters>(() => {
  // 1. URL params (highest priority - shareable links)
  const urlPeriod = searchParams.get('period');
  if (urlPeriod) return parseUrlParams();

  // 2. LocalStorage (user preference persistence)
  const saved = localStorage.getItem('analytics-filters');
  if (saved) return JSON.parse(saved);

  // 3. Default (fallback)
  return { period: 'last_30_days' };
});

// Sync to URL (for sharing)
useEffect(() => {
  setSearchParams(buildUrlParams(filters), { replace: true });
}, [filters]);

// Sync to LocalStorage (for persistence)
useEffect(() => {
  localStorage.setItem('analytics-filters', JSON.stringify(filters));
}, [filters]);
```

### Local State (MarginTrendChart)

```typescript
// Component-specific state
const [granularity, setGranularity] = useState<Granularity>('day');

// Passed to React Query hook
const { data } = useMarginTrend({
  ...filters,
  granularity,
});
```

### Server State (React Query)

```typescript
// Cached on server state changes
const queryClient = useQueryClient();

// Automatic invalidation on filter change (queryKey dependency)
queryKey: ['analytics', 'gross-margin', filters]

// Manual invalidation on mutation success
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['analytics'] });
}
```

---

## Component Communication Patterns

### Parent → Child (Props Down)

```
AnalyticsDashboard
    │
    ├─ filters prop → GrossMarginOverviewCard
    ├─ filters prop → ProviderCostChart
    ├─ filters prop → MarginTrendChart
    ├─ filters prop → CostHistogramChart
    ├─ filters prop → AdvancedFiltersPanel
    └─ filters prop → CSVExportButton
```

### Child → Parent (Callbacks Up)

```
AdvancedFiltersPanel
    │
    └─ onChange(newFilters) → AnalyticsDashboard.handleFilterChange()
       └─ setFilters(prev => ({ ...prev, ...newFilters }))
```

### Sibling Communication (Via Parent State)

```
AdvancedFiltersPanel (changes filters)
    │
    └─> AnalyticsDashboard.setFilters()
        │
        ├─> All sibling components re-render with new filters
        │
        ├─> GrossMarginOverviewCard (receives new filters)
        ├─> ProviderCostChart (receives new filters)
        ├─> MarginTrendChart (receives new filters)
        └─> CostHistogramChart (receives new filters)
           └─> React Query hooks auto-refetch with new queryKey
```

---

## Accessibility Tree (Simplified)

```
<main role="main" aria-label="Analytics Dashboard">
  │
  ├─ <nav aria-label="Breadcrumb">
  │  └─ Breadcrumb links
  │
  ├─ <header>
  │  ├─ <h1>Analytics Dashboard</h1>
  │  ├─ <p>Description</p>
  │  └─ <button aria-label="Export analytics data to CSV">
  │
  ├─ <section aria-label="Filters">
  │  ├─ <fieldset> Period
  │  │  ├─ <legend>Period</legend>
  │  │  └─ <button aria-pressed="true">Last 30 Days</button>
  │  │
  │  ├─ <fieldset> Tier
  │  └─ <fieldset> Providers
  │
  ├─ <section aria-label="Gross Margin Overview">
  │  ├─ <div role="status" aria-live="polite" class="sr-only">
  │  │  └─ Screen reader announcement
  │  │
  │  ├─ <dl> KPI Metrics
  │  │  ├─ <dt>Total Gross Margin</dt>
  │  │  ├─ <dd>$12,345</dd>
  │  │  └─ [3 more metric pairs]
  │  │
  │  └─ <section> Tier Breakdown
  │     └─ <ul>
  │        ├─ <li> Free Tier
  │        ├─ <li> Pro Tier
  │        └─ <li> Enterprise Tier
  │
  ├─ <div role="grid" aria-label="Charts">
  │  │
  │  ├─ <section aria-label="Provider Cost Chart">
  │  │  ├─ <div aria-hidden="true"> Visual chart
  │  │  └─ <table class="sr-only">
  │  │     ├─ <caption>Provider costs in USD</caption>
  │  │     └─ Data rows
  │  │
  │  └─ <section aria-label="Margin Trend Chart">
  │     ├─ <fieldset> Granularity selector
  │     ├─ <div aria-hidden="true"> Visual chart
  │     └─ <table class="sr-only">
  │
  └─ <section aria-label="Cost Distribution">
     ├─ <dl> Statistics
     ├─ <div aria-hidden="true"> Visual histogram
     ├─ <table class="sr-only">
     └─ <div role="alert" aria-live="assertive"> Anomaly alert
```

---

## Responsive Breakpoints

### Mobile (< 768px)

```
AnalyticsDashboard
├─ Full width stack
│  ├─ AdvancedFiltersPanel (2-column grid)
│  ├─ GrossMarginOverviewCard (full width)
│  ├─ ProviderCostChart (full width)
│  ├─ MarginTrendChart (full width)
│  └─ CostHistogramChart (full width)
```

### Tablet (768px - 1024px)

```
AnalyticsDashboard
├─ Mixed layout
│  ├─ AdvancedFiltersPanel (4-column grid)
│  ├─ GrossMarginOverviewCard (full width)
│  ├─ [2-column grid]
│  │  ├─ ProviderCostChart (50%)
│  │  └─ MarginTrendChart (50%)
│  └─ CostHistogramChart (full width)
```

### Desktop (≥ 1024px)

```
AnalyticsDashboard
├─ Optimized layout
│  ├─ AdvancedFiltersPanel (4-column grid)
│  ├─ GrossMarginOverviewCard (full width)
│  ├─ [2-column grid - lg:grid-cols-2]
│  │  ├─ ProviderCostChart (50%)
│  │  └─ MarginTrendChart (50%)
│  └─ CostHistogramChart (full width)
```

---

## Component Dependencies

### External Libraries

```
AnalyticsDashboard
├─ react (18.x)
├─ react-router-dom (useSearchParams)
├─ @tanstack/react-query (useQuery, useMutation)
├─ lucide-react (icons)
├─ recharts (charts)
│  ├─ BarChart
│  ├─ LineChart
│  ├─ CartesianGrid
│  ├─ XAxis, YAxis
│  ├─ Tooltip
│  └─ Legend
└─ @/utils/format (formatCurrency, formatNumber)
```

### Internal Dependencies

```
frontend/src/
├─ api/
│  └─ analytics.ts (API client)
│     └─ services/api.ts (apiClient instance)
│
├─ hooks/
│  └─ useAnalytics.ts (custom hooks)
│     └─ api/analytics.ts (API functions)
│
├─ types/
│  └─ analytics.types.ts (TypeScript interfaces)
│
├─ components/analytics/
│  ├─ GrossMarginOverviewCard.tsx
│  │  ├─ hooks/useAnalytics.ts
│  │  ├─ types/analytics.types.ts
│  │  └─ utils/format.ts
│  │
│  ├─ ProviderCostChart.tsx
│  ├─ MarginTrendChart.tsx
│  ├─ CostHistogramChart.tsx
│  ├─ AdvancedFiltersPanel.tsx
│  └─ CSVExportButton.tsx
│
└─ pages/admin/
   └─ AnalyticsDashboard.tsx
      ├─ components/analytics/* (all 6 components)
      ├─ components/admin/layout/Breadcrumbs.tsx
      └─ hooks/useAnalytics.ts
```

---

## Rendering Lifecycle

### Initial Mount

1. **AnalyticsDashboard mounts**
   - Initialize filters from URL → LocalStorage → defaults
   - Render skeleton placeholders

2. **Child components mount**
   - GrossMarginOverviewCard
     - useGrossMarginKPI() hook starts fetching
     - Renders loading skeleton
   - ProviderCostChart
     - useCostByProvider() hook starts fetching
     - Renders loading skeleton
   - MarginTrendChart
     - useMarginTrend() hook starts fetching
     - Renders loading skeleton
   - CostHistogramChart
     - useCostDistribution() hook starts fetching
     - Renders loading skeleton

3. **React Query fetches data**
   - Parallel requests to 4 backend endpoints
   - Response time: ~200-500ms each

4. **Data arrives**
   - useQuery hooks update with data
   - Components re-render with actual data
   - Charts animate into view (Recharts)

### Filter Change

1. **User clicks filter button**
   - AdvancedFiltersPanel.onChange() called
   - AnalyticsDashboard.handleFilterChange() updates state

2. **State propagates**
   - filters state updates
   - useEffect syncs to URL and LocalStorage
   - All child components receive new filters prop

3. **React Query revalidates**
   - queryKey changes (includes filters)
   - All 4 hooks refetch data
   - Components show loading state briefly

4. **New data renders**
   - Charts update with new data
   - Smooth transitions (Recharts animations)

---

## Error Boundary Strategy

### Component-Level Error Handling

Each chart component has its own error boundary:

```typescript
if (isError || !data) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-red-600 text-center" role="alert">
        Failed to load {componentName} data.
      </p>
    </div>
  );
}
```

### Benefits

- **Graceful degradation:** Other charts still work if one fails
- **User-friendly messages:** Clear error text
- **Accessibility:** role="alert" announces errors
- **No cascade:** Single component failure doesn't crash dashboard

### Future Enhancement

Implement React Error Boundary component for unexpected errors:

```typescript
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <AnalyticsDashboard />
</ErrorBoundary>
```

---

## Performance Optimization Summary

### Code Splitting

- **Route-level:** AnalyticsDashboard lazy loaded via React.lazy()
- **Chart-level:** Recharts loaded only when dashboard visited
- **Impact:** ~150 KB savings in initial bundle

### React Query Caching

- **staleTime: 5 min** - Reduce redundant fetches
- **gcTime: 10 min** - Keep data for quick navigation
- **Impact:** Near-instant re-renders on navigation back

### Component Memoization

- **Potential:** Use React.memo() for chart components
- **Current:** Not implemented (premature optimization)
- **Future:** Profile first, optimize if needed

---

**Document prepared by:** Claude Code Assistant
**Diagram format:** ASCII tree (for universal readability)
**Intended audience:** Developers, QA, technical documentation
