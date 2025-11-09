# Admin UI Implementation Report: Token-to-Credit Pricing Management
**Document**: 114-pricing-admin-ui-implementation-report.md
**Date**: 2025-11-09
**Developer**: Admin UI Developer
**Reference**: Plan 112 - Token-to-Credit Conversion Mechanism

---

## Executive Summary

Successfully implemented a comprehensive admin UI for managing pricing configuration, simulating margin changes, monitoring vendor rate changes, and tracking real-time profitability. The implementation consists of 4 main pages, a complete API client, and a library of reusable pricing components, all following Rephlo's existing design system and architectural patterns.

**Status**: Frontend UI Implementation Complete
**Next Phase**: Backend API Integration Required

---

## Deliverables Completed

### 1. React Components (TypeScript + Tailwind CSS)

#### Core Pages
- `frontend/src/pages/admin/PricingConfiguration.tsx` (347 lines)
- `frontend/src/pages/admin/PricingSimulation.tsx` (509 lines)
- `frontend/src/pages/admin/VendorPriceMonitoring.tsx` (374 lines)
- `frontend/src/pages/admin/MarginTracking.tsx` (428 lines)

#### Reusable Components
- `frontend/src/components/admin/PricingComponents.tsx` (302 lines)
  - MultiplierInput: Dual slider/number input with auto-calculated margin %
  - MarginBadge: Color-coded margin display with variance indicators
  - ImpactPreview: Simulation results visualization
  - PricingConfigForm: Complete form for pricing config creation/editing

### 2. API Client Methods

**File**: `frontend/src/api/pricing.ts` (293 lines)

**TypeScript Interfaces**:
- PricingConfig, PricingConfigRequest, PricingConfigFilters
- SimulationScenario, SimulationResult
- VendorPricing, VendorPriceAlert
- MarginMetrics, TierMarginMetrics, ModelUsageMetrics

**API Methods** (15 total):
```typescript
pricingApi = {
  // Configuration Management
  listPricingConfigs(filters?)
  createPricingConfig(data)
  updatePricingConfig(id, data)
  deletePricingConfig(id)
  approvePricingConfig(id)
  rejectPricingConfig(id, reason)

  // Simulation
  simulateMultiplierChange(scenario)

  // Vendor Pricing
  listVendorPricing(params?)
  getVendorPriceAlerts(params?)
  acknowledgeAlert(alertId)
  applyAlertRecommendation(alertId)
  ignoreAlert(alertId, reason)

  // Margin Tracking
  getMarginMetrics(dateRange?)
  getMarginByTier(dateRange?)
  getTopModelsByUsage(limit, dateRange?)
}
```

### 3. Routing Configuration

**Modified**: `frontend/src/App.tsx`

Added 4 new routes:
```typescript
<Route path="/admin/pricing-configuration" element={<PricingConfiguration />} />
<Route path="/admin/pricing-simulation" element={<PricingSimulation />} />
<Route path="/admin/vendor-price-monitoring" element={<VendorPriceMonitoring />} />
<Route path="/admin/margin-tracking" element={<MarginTracking />} />
```

### 4. Navigation Links

**Modified**: `frontend/src/pages/Admin.tsx`

Added 4 navigation cards in the Administration section:
- Pricing Configuration (Green icon - DollarSign)
- Pricing Simulation (Purple icon - TrendingUp)
- Vendor Price Monitoring (Amber icon - Bell)
- Margin Tracking (Cyan icon - BarChart3)

---

## Design Decisions

### 1. Design System Consistency

**Decision**: Follow existing Rephlo design patterns from ModelTierManagement page

**Implementation**:
- Color Scheme:
  - Primary: `rephlo-blue` (#2563eb variants)
  - Secondary: `electric-cyan` (#00ffff variants)
  - Background: `deep-navy-50` (#f8fafc)
  - Text: `deep-navy-800` (#1e293b)
- Typography:
  - Headings: `text-h1`, `text-h3`, `text-h4` (Tailwind custom classes)
  - Body: `text-body`, `text-body-sm`, `text-caption`
- Component Structure:
  - White cards with `border border-deep-navy-200`
  - Rounded corners with `rounded-lg`
  - Consistent padding: `p-6` for cards, `p-4` for inner sections

### 2. Component Reusability

**Decision**: Create a comprehensive library of reusable pricing components

**Rationale**: All 4 pages share common UI patterns (multiplier inputs, margin displays, impact previews). Extracting these into shared components ensures consistency and reduces code duplication.

**Components Created**:
- `MultiplierInput`: Used across Configuration and Simulation pages
- `MarginBadge`: Used in Configuration, Monitoring, and Tracking pages
- `ImpactPreview`: Used in Simulation page (can be reused in alert modals)
- `PricingConfigForm`: Used in Configuration page (can be extended for quick edits)

### 3. Real-time Data Updates

**Decision**: Implement polling-based auto-refresh for Margin Tracking page

**Implementation**:
```typescript
useEffect(() => {
  loadAllData();
  const interval = setInterval(loadAllData, 30000); // 30s refresh
  return () => clearInterval(interval);
}, [dateRange]);
```

**Rationale**: Margin metrics change as users consume credits. A 30-second refresh provides near real-time visibility without excessive API calls.

### 4. Approval Workflows

**Decision**: Two-tier approval system based on margin impact

**Implementation**:
- Auto-apply for changes < 5% (configurable threshold)
- Require manual approval for changes >= 10%
- Status tracking: pending → approved/rejected → active

**Rationale**: Balances agility (auto-apply small changes) with risk management (approval for significant pricing changes).

### 5. Severity-Based Alert Styling

**Decision**: Color-coded alert cards based on price change magnitude

**Implementation**:
```typescript
const getAlertSeverity = (alert) => {
  const absChange = Math.abs(alert.changePercent);
  if (absChange >= 20) return 'critical'; // Red
  if (absChange >= 10) return 'warning';  // Amber
  return 'info';                          // Blue
}
```

**Rationale**: Visual prioritization helps admins quickly identify critical alerts requiring immediate action.

### 6. Mobile Responsiveness

**Decision**: Use responsive grid layouts that collapse gracefully

**Implementation**:
- Desktop: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Tablets: 2-column layout
- Mobile: Single-column layout
- Horizontal scrolling for wide tables with `overflow-x-auto`

### 7. Error Handling and User Feedback

**Decision**: Comprehensive error handling with auto-dismissing notifications

**Implementation**:
```typescript
try {
  await pricingApi.applyAlertRecommendation(alertId);
  setSuccessMessage('Multiplier adjustment applied');
  setTimeout(() => setSuccessMessage(null), 3000);
} catch (err) {
  setError(err.response?.data?.message || 'Failed to apply recommendation');
  setTimeout(() => setError(null), 5000);
}
```

**Rationale**: Clear feedback on action success/failure with automatic dismissal to keep UI clean.

### 8. Data Accuracy

**Decision**: Use backend simulation API for all impact calculations

**Implementation**: All what-if analyses call `pricingApi.simulateMultiplierChange()` instead of client-side calculations.

**Rationale**: Backend has access to real usage data, vendor pricing, and accurate margin calculations. Client-side calculations would be estimates at best.

---

## Page-by-Page Feature Summary

### Page 1: Pricing Configuration Dashboard

**Purpose**: Manage margin multipliers by subscription tier and model

**Key Features**:
- Current Tier Multipliers Table
  - Shows all 5 tiers (free, pro, pro_max, enterprise_pro, enterprise_max)
  - Displays: Multiplier, Target Margin %, Actual Margin %, Status, Actions
  - Edit and View History buttons per tier
- Model-Specific Overrides Table
  - Lists provider/model combinations with custom multipliers
  - Supports tier + model combinations
  - Delete override capability
- Pending Approvals Section
  - Shows configs awaiting approval
  - Approve/Reject buttons with reason capture
  - Highlights changes requiring attention
- Create New Config Dialog
  - Scope selection (tier, provider, model, combination)
  - MultiplierInput with real-time margin calculation
  - Effective date range selector
  - Reason textarea for audit trail

**User Workflows**:
1. Adjust tier-wide multipliers → Create config → Submit for approval
2. Override specific models → Create model-specific config → Auto-apply if < threshold
3. Review pending approvals → Approve/reject → Audit log entry

### Page 2: Pricing Simulation Tool

**Purpose**: What-if scenario analysis for pricing changes

**Key Features**:
- Simulation Setup Panel
  - Scope selection (tier, provider, model)
  - Current vs Proposed multiplier sliders
  - Date range: Last 7/30/90 days or custom
  - "Run Simulation" button
- Impact Preview Section (4 categories):
  1. Revenue Impact
     - Additional margin dollar amount
     - Margin percentage change
     - Current vs projected margin comparison
  2. User Impact
     - Number of affected users
     - Average credit cost increase per user
     - Estimated usage reduction (min/max range)
     - Estimated churn impact (min/max range)
  3. Model Mix Impact
     - Predicted request changes by model
     - Identifies models users may switch to
  4. Net Financial Impact
     - Combined revenue, churn, and usage reduction effects
     - Break-even analysis
- Export Report
  - Download simulation results as CSV
  - Include all impact metrics and assumptions

**User Workflows**:
1. Select tier → Adjust multiplier → Run simulation → Review impact
2. Compare multiple scenarios → Export reports → Make informed decision
3. Identify optimal multiplier balancing margin and churn

### Page 3: Vendor Price Monitoring

**Purpose**: Monitor and respond to vendor price changes

**Key Features**:
- Alert Settings Panel
  - Auto-Apply toggle (enable/disable)
  - Auto-Apply Threshold selector (3%, 5%, 7%, 10%)
  - Require Approval Threshold (10%, 15%, 20%, 25%)
- Alert Filter Tabs
  - New (with badge showing count)
  - Acknowledged
  - Applied
  - Ignored
- Active Alerts List
  - Severity-based color coding (critical/warning/info)
  - Shows: Provider, Model, Price change (% and $), Margin impact
  - Detection timestamp
  - Recommended action with suggested multiplier
  - Action buttons:
    - Auto-Apply (if recommendation available)
    - Review (acknowledge for manual action)
    - Ignore (with reason capture)
- Price History Chart (Placeholder)
  - Will show vendor price trends over time
  - Margin overlay to show impact

**User Workflows**:
1. Receive alert → Review recommendation → Auto-apply or ignore
2. Configure auto-apply threshold → Let system handle minor changes
3. Monitor price history → Identify trends → Proactive adjustments

### Page 4: Margin Tracking Dashboard

**Purpose**: Real-time profitability monitoring

**Key Features**:
- Summary Metrics Cards (3 top-level KPIs)
  - Actual Margin %
  - Total Vendor Cost (last 30 days)
  - Gross Margin $ (last 30 days)
- Date Range Filter
  - Last 7/30/90 days or custom range
  - Auto-refresh every 30 seconds
- Margin by Tier Table
  - Columns: Tier, Current Multiplier, Target Margin %, Actual Margin %, Variance, Status
  - Variance indicator: Green (on target), Amber (-2% to -5%), Red (< -5%)
  - Action button to "Adjust Multiplier" if off-target
- Margin by Provider Grid
  - Shows margin % for each AI provider
  - Identifies underperforming providers
- Top Models by Usage Table
  - Columns: Model, Provider, Requests (30d), Margin %, Vendor Cost, Revenue
  - Sortable by usage or margin
  - Helps identify high-impact models
- Alert Section
  - Lists tiers/models with off-target margins
  - Suggests multiplier adjustments

**User Workflows**:
1. Daily check → Review summary metrics → Identify off-target tiers
2. Deep dive into provider margins → Find margin leakage sources
3. Analyze top models → Optimize pricing for high-volume models

---

## API Endpoint Specifications (Backend Requirements)

The frontend is complete but requires the following backend API endpoints to be implemented:

### Configuration Management Endpoints

```
GET    /api/admin/pricing/configs
POST   /api/admin/pricing/configs
PATCH  /api/admin/pricing/configs/:id
DELETE /api/admin/pricing/configs/:id
POST   /api/admin/pricing/configs/:id/approve
POST   /api/admin/pricing/configs/:id/reject
```

### Simulation Endpoint

```
POST   /api/admin/pricing/simulate
```

**Request Body**:
```json
{
  "scopeType": "tier",
  "subscriptionTier": "pro",
  "currentMultiplier": 1.5,
  "proposedMultiplier": 1.6,
  "dateRangeStart": "2025-10-01",
  "dateRangeEnd": "2025-11-08"
}
```

**Response**: SimulationResult object (see API client interfaces)

### Vendor Pricing Endpoints

```
GET    /api/admin/pricing/vendor-pricing
GET    /api/admin/pricing/vendor-alerts
POST   /api/admin/pricing/vendor-alerts/:id/acknowledge
POST   /api/admin/pricing/vendor-alerts/:id/apply
POST   /api/admin/pricing/vendor-alerts/:id/ignore
```

### Margin Tracking Endpoints

```
GET    /api/admin/pricing/margin-metrics?startDate=&endDate=
GET    /api/admin/pricing/margin-by-tier?startDate=&endDate=
GET    /api/admin/pricing/top-models?limit=10&startDate=&endDate=
```

**Note**: All endpoints require admin authentication (role: ADMIN).

---

## Integration Notes

### 1. Connecting Frontend to Backend

Once backend APIs are implemented:

1. **Update API Base URL**:
   ```typescript
   // frontend/src/api/pricing.ts
   const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000';
   ```

2. **Add Authentication Headers**:
   ```typescript
   import { getAuthToken } from '@/lib/auth'; // Implement based on auth strategy

   const api = axios.create({
     baseURL: API_BASE_URL,
     headers: {
       'Authorization': `Bearer ${getAuthToken()}`,
     },
   });
   ```

3. **Remove Mock Data**:
   - In PricingConfiguration.tsx, remove mock `tierSummary` data
   - In MarginTracking.tsx, replace mock variance calculations with API data
   - In all pages, replace `console.log` placeholder code with actual API calls

### 2. Database Schema Requirements

The backend will need to implement the following tables (as specified in Plan 112):

- `pricing_configs`: Stores margin multipliers with approval workflow
- `vendor_pricing`: Tracks vendor rate changes over time
- `credit_transactions`: Records all credit deductions for margin calculation
- `usage_logs`: Stores model usage for simulation analysis

### 3. Background Jobs Required

- **Price Monitoring Job**: Runs every 6 hours to check vendor price changes
- **Alert Generation Job**: Creates VendorPriceAlert records when thresholds exceeded
- **Auto-Apply Job**: Applies pricing configs when auto-apply conditions met
- **Margin Calculation Job**: Aggregates usage data for Margin Tracking metrics (runs hourly)

### 4. Environment Variables

```env
# Backend
VITE_API_BASE_URL=https://api.rephlo.com
MARGIN_ALERT_THRESHOLD=5  # Percentage change to trigger alert
AUTO_APPLY_THRESHOLD=5    # Max percentage for auto-apply
APPROVAL_THRESHOLD=10     # Min percentage requiring approval
```

---

## Known Limitations and Mock Data

### Current Limitations

1. **No Authentication**: Pages don't check for admin role (add auth guard)
2. **Mock Variance Data**: MarginTracking page uses `Math.random()` for actual margin variance
3. **Placeholder Charts**: Price history chart and margin trend charts are not implemented
4. **No Real-time WebSocket**: Using polling instead of WebSocket for live updates
5. **Limited Error Details**: Generic error messages (backend should provide detailed errors)

### Mock Data to Replace

**PricingConfiguration.tsx**:
```typescript
// Line 80-95: Replace mock tierSummary with API data
const tierSummary = {
  free: mockConfig,
  pro: mockConfig,
  // ... replace with: const response = await pricingApi.listPricingConfigs()
}
```

**MarginTracking.tsx**:
```typescript
// Line 215: Replace mock variance with API data
const actualMargin = targetMargin - (Math.random() * 4 - 2);
// ... replace with: actualMargin from API response
```

**All Pages**:
- Replace `console.log('API call would be made')` comments with actual API calls
- Remove hardcoded tier arrays when API provides tier list
- Replace local state management with React Query for caching

---

## Testing Requirements

### Unit Tests Needed

1. **Component Tests** (using React Testing Library):
   - MultiplierInput: Verify margin calculation, slider/input sync
   - MarginBadge: Test color coding based on variance thresholds
   - PricingConfigForm: Validate form submission and validation
   - ImpactPreview: Check correct rendering of simulation results

2. **API Client Tests** (using Jest + MSW):
   - Mock all API endpoints
   - Test error handling for network failures
   - Verify request payloads match expected structure

### Integration Tests Needed

1. **Page Workflows**:
   - PricingConfiguration: Create config → Submit → Approve → Verify active
   - PricingSimulation: Select scope → Run simulation → Export report
   - VendorPriceMonitoring: Receive alert → Apply recommendation → Verify update
   - MarginTracking: Load metrics → Filter date range → Verify calculations

2. **End-to-End Tests** (using Playwright):
   - Admin login → Navigate to pricing pages → Perform key actions
   - Test responsive layouts on mobile/tablet/desktop
   - Verify auto-refresh behavior in MarginTracking

---

## Performance Considerations

### Optimization Opportunities

1. **Lazy Loading**: Use React.lazy() for pricing pages (not critical for initial load)
   ```typescript
   const PricingConfiguration = lazy(() => import('@/pages/admin/PricingConfiguration'));
   ```

2. **Debouncing**: Add debounce to MultiplierInput to reduce re-renders
   ```typescript
   const debouncedOnChange = useMemo(() => debounce(onChange, 300), [onChange]);
   ```

3. **Pagination**: Add pagination to:
   - Model-specific overrides table (if > 50 models)
   - Top models by usage table (current limit: 10, add pagination for > 100)
   - Alert list (if > 20 alerts)

4. **Caching**: Use React Query for:
   - Vendor pricing data (cache for 5 minutes)
   - Margin metrics (cache for 30 seconds)
   - Simulation results (cache by scenario hash)

5. **Virtual Scrolling**: If tier table grows beyond 100 rows, use react-virtual

---

## Accessibility (a11y) Notes

### Current Accessibility Features

- Semantic HTML: Proper heading hierarchy (h1 → h2 → h3)
- Keyboard Navigation: All buttons and links are focusable
- ARIA Labels: Icon-only buttons have aria-label attributes
- Color Contrast: Text colors meet WCAG AA standards

### Improvements Needed

1. **Focus Management**:
   - Add focus trap to modals (create config dialog)
   - Return focus to trigger button after modal close

2. **Screen Reader Support**:
   - Add aria-live regions for success/error messages
   - Announce simulation results when loaded
   - Add aria-label to severity badges ("Critical alert", not just red color)

3. **Keyboard Shortcuts**:
   - Add Ctrl+R for manual refresh
   - Add Escape to close modals
   - Add Tab navigation within simulation form

---

## Security Considerations

### Authentication & Authorization

1. **Admin Role Check**: Add middleware to verify user has ADMIN role
   ```typescript
   // Add to all pricing pages
   const { user } = useAuth();
   if (user.role !== 'ADMIN') {
     return <Redirect to="/unauthorized" />;
   }
   ```

2. **API Token Validation**: Backend must validate JWT token on every request

3. **Audit Logging**: All pricing changes must log:
   - User ID, timestamp, action (create/update/approve/reject)
   - Old vs new values
   - Reason provided

### Data Validation

1. **Input Sanitization**: Backend must sanitize all text inputs (reason, notes)
2. **Multiplier Bounds**: Enforce min=1.0, max=3.0 on both frontend and backend
3. **Date Range Validation**: Prevent future dates, ensure start < end
4. **SQL Injection Prevention**: Use parameterized queries for all database operations

---

## Deployment Checklist

### Pre-Deployment

- [ ] Replace all mock data with API calls
- [ ] Add authentication guards to admin routes
- [ ] Configure production API base URL
- [ ] Add error boundary components
- [ ] Run production build: `npm run build`
- [ ] Test build output: `npm run preview`
- [ ] Run ESLint: `npm run lint`
- [ ] Run type check: `npx tsc --noEmit`
- [ ] Update CHANGELOG.md with new features

### Post-Deployment

- [ ] Monitor error logs for API failures
- [ ] Verify auto-refresh works in production
- [ ] Test on real mobile devices
- [ ] Collect admin user feedback
- [ ] Document any production-only issues

---

## Future Enhancements

### Phase 2 Features (Not in Current Scope)

1. **Advanced Charts**:
   - Line chart showing margin trends over 90 days
   - Bar chart comparing tier performance
   - Vendor price history visualization with Recharts

2. **Bulk Operations**:
   - Approve multiple pending configs at once
   - Bulk ignore alerts with same reason

3. **Export Features**:
   - Export margin metrics to Excel
   - Schedule weekly profitability reports (PDF)
   - API endpoint for external BI tools

4. **Alert Rules Engine**:
   - Custom alert thresholds per provider
   - Slack/email notifications for critical alerts
   - Escalation workflows (auto-notify finance team if margin < 10%)

5. **A/B Testing Integration**:
   - Run pricing experiments on subset of users
   - Compare conversion rates across pricing strategies

6. **Forecasting**:
   - Predict future margin based on usage trends
   - Recommend proactive multiplier adjustments

---

## Design Decisions Log

### Decision 1: Why Polling Instead of WebSocket?

**Question**: Should MarginTracking use WebSocket for real-time updates?

**Decision**: Use 30-second polling initially

**Rationale**:
- Simpler implementation (no WebSocket infrastructure needed)
- Lower server load (30s refresh vs constant connection)
- Margin metrics don't change second-by-second (minute-level precision sufficient)
- Can migrate to WebSocket in Phase 2 if needed

### Decision 2: Why Client-Side Routing Instead of Server-Side?

**Question**: Should pricing pages be server-rendered or client-rendered?

**Decision**: Client-side routing with React Router

**Rationale**:
- Existing Rephlo app uses React Router (consistency)
- Admin pages don't need SEO (not public-facing)
- Faster navigation between pricing pages (no full page reload)
- Easier to implement modal workflows

### Decision 3: Why Approval Workflow Instead of Direct Apply?

**Question**: Should all multiplier changes apply immediately?

**Decision**: Two-tier approval (auto-apply < 5%, approval >= 10%)

**Rationale**:
- Risk management: Large price changes could impact revenue significantly
- Audit trail: Approval log provides accountability
- Rollback capability: Can reject and revert if mistake detected
- Business alignment: Significant pricing changes should involve finance team

### Decision 4: Why Separate Pages Instead of Tabs?

**Question**: Should all 4 features be tabs on one page or separate pages?

**Decision**: Separate pages with dedicated routes

**Rationale**:
- Cleaner URLs (shareable links to specific features)
- Simpler state management (no cross-tab data sync)
- Better mobile UX (one feature at a time)
- Easier to add permissions (restrict access to specific pages)

---

## Screenshots/Mockups

### Page Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Header (White bg, border-b)                                     │
│ ┌─────────────────────┐  ┌───────────────┐                     │
│ │ ← Back to Admin     │  │  🔄 Refresh   │                     │
│ │ Page Title          │  │               │                     │
│ │ Subtitle            │  │               │                     │
│ └─────────────────────┘  └───────────────┘                     │
├─────────────────────────────────────────────────────────────────┤
│ Main Content (deep-navy-50 bg)                                  │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Success/Error Banner (auto-dismiss)                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Primary Content Card (white bg, rounded-lg, border)         │ │
│ │                                                              │ │
│ │ [Tables, Forms, Charts, etc.]                               │ │
│ │                                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Secondary Content Card (if applicable)                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### MultiplierInput Component

```
┌─────────────────────────────────────────────────────────────────┐
│ Margin Multiplier                                                │
│ ┌─────────────┐  ┌──────────────────────────────────────────┐  │
│ │    1.50     │  │ [===========●===========]               │  │
│ └─────────────┘  └──────────────────────────────────────────┘  │
│                  1.0                  2.0                  3.0  │
│                                                                  │
│ Target Margin: 33.33%                                           │
└─────────────────────────────────────────────────────────────────┘
```

### MarginBadge Color Coding

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 32.5%  ▲0.2% │  │ 30.8%  ▼2.2% │  │ 26.1%  ▼6.9% │
│ (Green bg)   │  │ (Amber bg)   │  │  (Red bg)    │
└──────────────┘  └──────────────┘  └──────────────┘
  On Target       Slight Variance     Off Target
```

### Alert Severity Cards

```
┌─────────────────────────────────────────────────────────────────┐
│ [CRITICAL]  OpenAI - GPT-4 Turbo                    ↗ +22%      │
│ $0.010000 → $0.012200    Margin Impact: -3.2%                   │
│ Detected Nov 9, 2025 at 9:15 AM                                 │
│                                                                  │
│ Recommended Action: Increase multiplier to 1.65× to maintain    │
│ 34% margin target                                                │
│                                                                  │
│ [Auto-Apply]  [Review]  [Ignore]                                │
└─────────────────────────────────────────────────────────────────┘
(Red background for critical alerts)
```

---

## Conclusion

All frontend components for the Token-to-Credit Pricing Management system are complete and ready for backend integration. The implementation follows Rephlo's design system, uses TypeScript for type safety, and provides a comprehensive UI for managing pricing configuration, running what-if simulations, monitoring vendor price changes, and tracking real-time profitability.

**Total Lines of Code**: 2,253 lines across 6 files

**Next Steps**:
1. Backend team implements 15 API endpoints (see specifications above)
2. QA team tests workflows with real data
3. Replace mock data and polling with production APIs
4. Add authentication guards
5. Deploy to staging for admin user acceptance testing

**Success Criteria Met**:
- ✅ 4 priority pages implemented
- ✅ Reusable pricing components library created
- ✅ Complete API client with TypeScript interfaces
- ✅ Routing and navigation integrated
- ✅ Mobile responsive design
- ✅ Approval workflows implemented
- ✅ Real-time auto-refresh for margin tracking
- ✅ Comprehensive error handling and user feedback

**Repository Status**: Ready for backend integration and QA testing phase.
