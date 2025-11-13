# Admin Analytics Dashboard - User Guide

**Document ID:** docs/guides/018
**Version:** 1.0
**Last Updated:** 2025-01-13
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing the Dashboard](#accessing-the-dashboard)
3. [Dashboard Components](#dashboard-components)
4. [Using Filters](#using-filters)
5. [Exporting Data](#exporting-data)
6. [Interpreting Metrics](#interpreting-metrics)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Admin Analytics Dashboard provides real-time insights into vendor costs, gross margins, and profitability across your AI inference platform. This dashboard helps you:

- **Monitor profitability** - Track gross margin and revenue in real-time
- **Identify cost drivers** - See which providers and models consume the most budget
- **Analyze trends** - Detect patterns and anomalies in usage and costs
- **Make data-driven decisions** - Export data for further analysis

**Key Metrics:**
- Gross Margin (USD and %)
- Vendor Costs by Provider
- Margin Trends Over Time
- Cost Distribution and Anomalies

---

## Accessing the Dashboard

### Prerequisites

- **Admin Role Required** - Only users with the `admin` scope can access this dashboard
- **Valid JWT Token** - You must be authenticated via the Identity Provider
- **Modern Browser** - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Navigation

1. **Login** to the Admin Dashboard at `https://app.rephlo.com/admin`
2. **Click "Analytics"** in the top navigation menu
3. The vendor analytics dashboard will load automatically

**URL:** `https://app.rephlo.com/admin/analytics`

---

## Dashboard Components

### 1. Gross Margin Overview Card

**Purpose:** High-level KPI summary with trend indicators

**Displays:**
- **Total Gross Margin** - Total profit (revenue - vendor costs) in USD
- **Margin Percentage** - Gross margin as % of total revenue
- **Avg Margin per Request** - Average profit per API request
- **Trend Indicator** - ↑/↓ showing % change from previous period
- **Tier Breakdown** - Gross margin split by Free/Pro/Enterprise tiers

**Example Interpretation:**
```
Total Gross Margin: $4,532.15 ↑ +12.5%
Margin %: 42.3% ↑ +2.1pp
Avg per Request: $0.0128 ↓ -0.8%

Tier Breakdown:
- Free: $1,200.45 (26.5%)
- Pro: $2,500.80 (55.2%)
- Enterprise: $830.90 (18.3%)
```

**What It Tells You:**
- Overall profitability is improving (+12.5% trend)
- Margin percentage increased by 2.1 percentage points
- Average margin per request decreased slightly (possible price pressure or higher-cost models)
- Pro tier drives most of the gross margin (55.2%)

---

### 2. Provider Cost Comparison Chart

**Purpose:** Identify which AI providers consume the most budget

**Displays:**
- **Horizontal bar chart** showing top 5 providers by total cost
- **Total Cost** - Sum of vendor costs for each provider
- **Request Count** - Number of API requests to each provider
- **Avg Cost per Request** - Average vendor cost per request

**Example:**
```
OpenAI:      $8,500.25 | 125,000 requests | $0.068/req
Anthropic:   $6,200.80 | 95,000 requests  | $0.065/req
Google:      $3,100.50 | 80,000 requests  | $0.039/req
Azure:       $2,800.00 | 60,000 requests  | $0.047/req
Mistral:     $1,500.45 | 50,000 requests  | $0.030/req
```

**What It Tells You:**
- OpenAI is your most expensive provider ($8,500.25 total cost)
- Mistral is the most cost-effective ($0.030 per request)
- Anthropic has high usage but competitive pricing
- Consider shifting workloads to lower-cost providers (Google, Mistral) for non-critical tasks

---

### 3. Margin Trend Line Chart

**Purpose:** Visualize how gross margin changes over time

**Displays:**
- **3 Lines:**
  - **Gross Margin** (blue) - Raw gross margin per time bucket
  - **7-day Moving Average** (green) - Smoothed trend over 7 days
  - **30-day Moving Average** (orange) - Longer-term trend

**Granularity Options:**
- **Hour** - For real-time monitoring (last 24-48 hours)
- **Day** - For weekly/monthly analysis (default)
- **Week** - For quarterly trends
- **Month** - For annual planning

**Example Interpretation:**
```
Last 30 Days (Daily Granularity):
- Jan 1: $120.50
- Jan 2: $135.80
- Jan 3: $110.20
...
- Jan 30: $155.90

7-day MA trending upward (↑ from $125 to $145)
30-day MA flat (~$130)
```

**What It Tells You:**
- Short-term upward trend (7-day MA increasing)
- Long-term stability (30-day MA flat)
- Recent spike on Jan 30 ($155.90) - investigate cause

---

### 4. Cost Distribution Histogram

**Purpose:** Analyze cost distribution and detect anomalies

**Displays:**
- **Histogram** showing frequency of requests by cost bucket
- **Statistics Panel:**
  - **Mean** - Average cost per request
  - **Median** - Middle value (50th percentile)
  - **Std Dev** - Standard deviation (measure of variability)
  - **P95** - 95th percentile (high-cost requests)
  - **P99** - 99th percentile (outliers)
- **Anomaly Alert** - Highlights requests >3σ from mean (red bars)

**Example:**
```
Statistics:
- Mean: $0.045
- Median: $0.038
- Std Dev: $0.015
- P95: $0.075
- P99: $0.120

Anomalies Detected: 12 requests
- Bucket $0.150-$0.175: 8 requests
- Bucket $0.175-$0.200: 3 requests
- Bucket $0.200+: 1 request
```

**What It Tells You:**
- Most requests cost $0.038-$0.045 (normal distribution)
- 12 anomalous high-cost requests detected
- P99 requests cost $0.120 (2.7x median) - investigate these outliers
- Possible causes: Long-context requests, expensive models (GPT-4o, Claude Opus)

---

### 5. Advanced Filters Panel

**Purpose:** Refine analytics queries to specific time periods, tiers, or providers

**Filter Options:**

#### Period Selector
- **Last 7 Days** (default)
- **Last 30 Days**
- **Last 90 Days**
- **Custom Range** - Select start/end dates (requires date picker implementation)

#### Tier Selector
- **All Tiers** (default)
- **Free Tier Only**
- **Pro Tier Only**
- **Enterprise Tier Only**

#### Provider Multi-Select
- **All Providers** (default)
- OpenAI
- Anthropic
- Google
- Azure
- Mistral

**How to Use:**
1. Click on the filter you want to change
2. Select new value (radio for tier, checkboxes for providers)
3. All charts update automatically (React Query refetch)
4. URL params and LocalStorage are updated for persistence

**Example Filter Combinations:**
```
Scenario 1: Analyze Pro Tier Costs
- Period: Last 30 Days
- Tier: Pro Tier Only
- Providers: All Providers

Scenario 2: Compare OpenAI vs Anthropic
- Period: Last 7 Days
- Tier: All Tiers
- Providers: OpenAI, Anthropic (selected)

Scenario 3: Enterprise Tier Cost Optimization
- Period: Last 90 Days
- Tier: Enterprise Tier Only
- Providers: All Providers
```

---

### 6. CSV Export Button

**Purpose:** Download analytics data for offline analysis

**Features:**
- **Streaming Export** - Handles large datasets (100k+ rows) without memory overflow
- **Auto-Download** - File downloads automatically on success
- **Filename Format** - `analytics-export-{timestamp}.csv`
- **Columns Included:**
  - Date, Provider, Model, Tier, Request Count, Total Vendor Cost, Total Revenue, Gross Margin, Margin %

**How to Use:**
1. Apply desired filters (period, tier, providers)
2. Click **"Export CSV"** button (top right)
3. Wait for loading indicator (typically 2-5 seconds for 100k rows)
4. File downloads automatically to your Downloads folder

**Example CSV Output:**
```csv
date,provider,model,tier,request_count,vendor_cost_usd,revenue_usd,gross_margin_usd,margin_percentage
2025-01-13,OpenAI,gpt-4o-2024-08-06,pro,1250,85.50,150.75,65.25,43.28
2025-01-13,Anthropic,claude-3-5-sonnet-20241022,enterprise,800,62.00,93.00,31.00,33.33
2025-01-13,Google,gemini-1.5-pro,free,500,15.50,38.75,23.25,60.00
...
```

**Use Cases:**
- Import into Excel/Google Sheets for pivot tables
- Share with finance team for budget planning
- Create custom visualizations in Tableau/Power BI
- Run statistical analysis in R/Python

---

## Using Filters

### Time Period Filtering

**Use Case:** Analyze costs over different time ranges

**Steps:**
1. Click **Period** dropdown
2. Select desired period:
   - **Last 7 Days** - Recent trends, real-time monitoring
   - **Last 30 Days** - Monthly performance review
   - **Last 90 Days** - Quarterly planning
   - **Custom** - Specific date range (not yet implemented)
3. All charts update immediately

**Tip:** Use shorter periods (7 days) for operational monitoring, longer periods (90 days) for strategic planning.

---

### Tier Filtering

**Use Case:** Compare profitability across subscription tiers

**Steps:**
1. Click desired **Tier** radio button:
   - **All** - Combined view (default)
   - **Free** - Only free-tier users
   - **Pro** - Only pro-tier users
   - **Enterprise** - Only enterprise-tier users
2. Charts update to show tier-specific data

**Example Analysis:**
```
Question: Is Enterprise tier profitable?

1. Select "Enterprise Tier Only"
2. Check Gross Margin Overview:
   - Margin %: 35.5%
3. Check Provider Cost Chart:
   - Top provider: OpenAI ($2,800)
4. Check Cost Distribution:
   - Mean cost: $0.055/req
   - Median cost: $0.048/req

Conclusion: Enterprise tier is profitable (35.5% margin) but has higher average costs due to premium models.
```

---

### Provider Filtering

**Use Case:** Isolate costs for specific AI providers

**Steps:**
1. **Uncheck "All Providers"** checkbox
2. **Check desired providers** (multiple selection allowed):
   - OpenAI
   - Anthropic
   - Google
   - Azure
   - Mistral
3. Charts update to show only selected providers

**Example Analysis:**
```
Question: How do OpenAI and Anthropic compare?

1. Uncheck "All Providers"
2. Check "OpenAI" and "Anthropic"
3. View updated charts:
   - OpenAI: $8,500 total cost, 125k requests
   - Anthropic: $6,200 total cost, 95k requests
4. Calculate cost per request:
   - OpenAI: $0.068/req
   - Anthropic: $0.065/req

Conclusion: Anthropic is 4.4% cheaper per request.
```

---

## Exporting Data

### Export Workflow

1. **Apply Filters** - Set desired period, tier, providers
2. **Click "Export CSV"** button (top right corner)
3. **Wait for Download** - Loading spinner appears (2-10 seconds)
4. **Open File** - CSV file downloads to your browser's download folder

### Export Specifications

**File Format:** CSV (Comma-Separated Values)
**Encoding:** UTF-8
**Delimiter:** Comma (`,`)
**Header Row:** Yes (column names in first row)
**Date Format:** ISO 8601 (YYYY-MM-DD)
**Number Format:** Decimal with 2 places for USD, 2 places for percentages

**Columns:**
| Column Name          | Description                          | Example       |
|----------------------|--------------------------------------|---------------|
| date                 | Date of aggregation                  | 2025-01-13    |
| provider             | AI provider name                     | OpenAI        |
| model                | Model ID                             | gpt-4o-2024-08-06 |
| tier                 | Subscription tier                    | pro           |
| request_count        | Number of API requests               | 1250          |
| vendor_cost_usd      | Total vendor cost (USD)              | 85.50         |
| revenue_usd          | Total revenue (credits × $0.01)      | 150.75        |
| gross_margin_usd     | Gross profit (revenue - cost)        | 65.25         |
| margin_percentage    | Gross margin % (margin/revenue)      | 43.28         |

### Excel/Google Sheets Analysis

**Step 1: Import CSV**
- Excel: Data → From Text/CSV
- Google Sheets: File → Import → Upload

**Step 2: Create Pivot Table**
```
Rows: provider
Values: SUM(gross_margin_usd)
Filters: tier, date
```

**Step 3: Create Chart**
- Select pivot table data
- Insert → Chart → Column Chart
- Customize axis labels and title

---

## Interpreting Metrics

### Gross Margin Percentage

**Formula:** `(Revenue - Vendor Cost) / Revenue × 100%`

**Healthy Ranges:**
- **>50%** - Excellent profitability (highly marked-up tiers)
- **40-50%** - Good profitability (Pro tier typical)
- **30-40%** - Moderate profitability (Enterprise tier typical)
- **<30%** - Low profitability (requires optimization)

**Example:**
```
Revenue: $10,000
Vendor Cost: $6,000
Gross Margin: $4,000
Margin %: 40%

Interpretation: For every $1 of revenue, you keep $0.40 after paying vendor costs.
```

---

### Trend Indicators

**Symbol Guide:**
- **↑ +12.5%** - Metric increased by 12.5% compared to previous period
- **↓ -8.2%** - Metric decreased by 8.2% compared to previous period
- **pp** - Percentage points (absolute change, not relative change)

**Example:**
```
Current Period Margin %: 42.3%
Previous Period Margin %: 40.2%
Trend: ↑ +2.1pp

Interpretation: Margin percentage improved by 2.1 percentage points (from 40.2% to 42.3%).
Note: This is NOT a 2.1% relative increase (which would be 40.2% × 1.021 = 41.04%).
```

---

### Anomaly Detection

**Method:** Statistical outlier detection using 3-sigma rule

**Formula:** `Anomaly = Cost > (Mean + 3 × Std Dev)`

**Example:**
```
Mean cost: $0.045
Std Dev: $0.015
Threshold: $0.045 + (3 × $0.015) = $0.090

Anomalous Requests:
- Request ID: 12345, Cost: $0.150 (66.7% above threshold)
- Request ID: 12346, Cost: $0.200 (122.2% above threshold)

Investigation Steps:
1. Check model used (likely GPT-4o or Claude Opus)
2. Check input/output tokens (likely long-context request)
3. Check user tier (Enterprise users often have higher costs)
4. Review request logs for patterns
```

---

## Troubleshooting

### Dashboard Not Loading

**Symptoms:**
- Blank screen or loading spinner indefinitely
- Error message: "Failed to load analytics"

**Solutions:**
1. **Check Admin Permissions**
   - Verify you have `admin` scope in your JWT token
   - Contact system administrator if not

2. **Check Network Connection**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Refresh page
   - Look for failed requests (red status codes)

3. **Verify Backend is Running**
   - Check backend health: `https://api.rephlo.com/health`
   - Should return `{"status": "healthy"}`

4. **Clear Browser Cache**
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Options → Privacy → Clear Data
   - Safari: Develop → Empty Caches

---

### Charts Not Updating After Filter Change

**Symptoms:**
- Filters change but charts show stale data
- "Refetching..." indicator doesn't appear

**Solutions:**
1. **Hard Refresh**
   - Windows/Linux: Ctrl + Shift + R
   - Mac: Cmd + Shift + R

2. **Check React Query DevTools**
   - Open browser console (F12)
   - Look for React Query cache status
   - Check if queries are marked as stale

3. **Verify API Responses**
   - Open Network tab in DevTools
   - Filter by `/admin/analytics`
   - Check response status (should be 200 OK)
   - Verify response body contains updated data

---

### CSV Export Not Downloading

**Symptoms:**
- "Export CSV" button clicks but no download starts
- Error message: "Export failed"

**Solutions:**
1. **Check Browser Download Settings**
   - Verify downloads are not blocked
   - Check download folder exists and is writable

2. **Check File Size Limits**
   - Large exports (>100k rows) may take 10-30 seconds
   - Wait for loading spinner to disappear

3. **Verify API Response**
   - Open Network tab in DevTools
   - Click "Export CSV"
   - Check POST request to `/admin/analytics/export-csv`
   - Response should have `Content-Type: text/csv`

4. **Try Smaller Date Range**
   - If exporting 90 days fails, try 30 days first
   - Gradually increase range to find limit

---

### Rate Limit Errors (429 Too Many Requests)

**Symptoms:**
- Error message: "Too many requests. Try again in 1 hour."
- HTTP status: 429

**Explanation:**
- Admin analytics endpoints are rate-limited to **100 requests per hour** per user
- This prevents accidental DDoS from rapid filter changes

**Solutions:**
1. **Wait 1 Hour**
   - Rate limit resets after 1 hour from first request

2. **Reduce Filter Changes**
   - Apply all filters before submitting query
   - Avoid rapid clicking between filters

3. **Contact Administrator**
   - Request rate limit increase if legitimately needed for your workflow

---

### No Data Showing

**Symptoms:**
- Charts load successfully but show "No data available"
- KPI cards show $0.00 values

**Possible Causes:**
1. **No Usage Data in Selected Period**
   - Try expanding date range (e.g., Last 90 Days)
   - Check if any API requests were made during this period

2. **Filters Too Restrictive**
   - Reset filters to defaults (All Tiers, All Providers)
   - Gradually re-apply filters to narrow down

3. **Database Not Seeded**
   - Check with system administrator
   - Run `npm run seed` in backend (dev environment only)

---

## Keyboard Shortcuts

### Navigation
- **Tab** - Move between filter controls
- **Enter** - Activate selected filter option
- **Space** - Toggle checkbox (provider multi-select)
- **Esc** - Close dropdown (if open)

### Accessibility
- **Screen Readers** - All charts have hidden data tables with ARIA labels
- **Focus Indicators** - Blue outline shows current keyboard focus
- **High Contrast Mode** - Color combinations meet WCAG 2.1 AA standards (≥4.5:1 contrast)

---

## Best Practices

### Daily Monitoring
1. **Check Gross Margin Overview** - Ensure profitability is stable or improving
2. **Review Trend Indicator** - Look for unexpected spikes or drops
3. **Scan for Anomalies** - Investigate high-cost requests

### Weekly Review
1. **Analyze Provider Costs** - Identify top cost drivers
2. **Compare Tier Performance** - Ensure each tier is profitable
3. **Export CSV for Finance** - Share weekly summary with stakeholders

### Monthly Planning
1. **Review 90-Day Trends** - Identify seasonal patterns
2. **Calculate Provider ROI** - Cost-benefit analysis per provider
3. **Optimize Pricing Strategy** - Adjust margin multipliers based on data

---

## Support

**Questions or Issues?**
- Contact: admin@rephlo.com
- Documentation: https://docs.rephlo.com
- GitHub Issues: https://github.com/rephlo/rephlo-sites/issues

---

**END OF USER GUIDE**
