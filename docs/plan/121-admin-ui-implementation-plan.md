# Unified Admin Dashboard - Implementation Plan

**Document ID**: 121
**Created**: 2025-11-09
**Status**: Implementation Ready
**Priority**: P0 (High)
**Target Version**: v2.1.0
**Related Plans**: 109, 110, 111, 119, 120
**Estimated Effort**: 6-8 weeks (1 senior frontend developer)

---

## Executive Summary

Phased implementation plan for integrating 14 admin pages across Plans 109, 110, and 111 into a unified dashboard. This plan builds on the design specified in Document 120.

**Timeline**: 6-8 weeks
**Resources**: 1 senior frontend developer, 1 QA engineer (part-time)
**Risk Level**: Medium
**Dependencies**: API harmonization (Document 028), RBAC design (Document 119)

---

## Implementation Phases

### Phase 0: Preparation (Week 0, Days 1-2)

**Objective**: Set up project structure and dependencies

#### Tasks

1. **Install Dependencies** (2 hours)
   ```bash
   npm install @tanstack/react-query zustand react-router-dom@6 @headlessui/react
   npm install -D @tanstack/react-query-devtools
   ```

2. **Create Directory Structure** (1 hour)
   ```
   frontend/src/
   ├── components/admin/
   │   ├── layout/
   │   ├── data/
   │   ├── forms/
   │   ├── badges/
   │   └── utility/
   ├── pages/admin/
   │   ├── users/
   │   ├── analytics/
   │   └── AdminDashboard.tsx
   ├── stores/
   │   └── adminUIStore.ts
   ├── routes/
   │   └── adminRoutes.tsx
   └── api/
       └── admin.ts
   ```

3. **Set Up React Query Provider** (2 hours)
   - File: `frontend/src/providers/QueryProvider.tsx`
   - Configure default options (staleTime, retry logic)
   - Wrap App with QueryClientProvider

4. **Set Up Zustand Store** (2 hours)
   - File: `frontend/src/stores/adminUIStore.ts`
   - State: sidebarCollapsed, activeFilters, breadcrumbs
   - Persist to localStorage

5. **Configure React Router** (2 hours)
   - File: `frontend/src/routes/adminRoutes.tsx`
   - Define admin route structure
   - Set up lazy loading for routes

**Deliverables**:
- ✅ Dependencies installed
- ✅ Directory structure created
- ✅ React Query configured
- ✅ Zustand store created
- ✅ Router configured

**Acceptance Criteria**:
- React Query DevTools accessible
- Zustand state persists after refresh
- Admin routes accessible but show placeholder content

---

### Phase 1: Foundation (Week 1-2, Days 3-12)

**Objective**: Build core layout and shared component library

#### Week 1: Layout Components

**Day 3-4: AdminLayout Component** (16 hours)
- File: `frontend/src/components/admin/layout/AdminLayout.tsx`
- Features:
  - Responsive layout (sidebar + main content)
  - Mobile drawer for sidebar
  - Outlet for nested routes
  - Deep Navy theme colors
- Acceptance: Layout renders correctly on mobile, tablet, desktop

**Day 5-6: AdminSidebar Component** (16 hours)
- File: `frontend/src/components/admin/layout/AdminSidebar.tsx`
- Features:
  - Collapsible sidebar (desktop)
  - Drawer sidebar (mobile)
  - Active route highlighting
  - Navigation menu with icons
  - Zustand integration for collapse state
- Menu structure:
  ```
  🏠 Dashboard (/admin)
  👥 Users (/admin/users)
  💳 Subscriptions (/admin/subscriptions)
  🔑 Licenses (/admin/licenses)
  🎟️ Coupons (/admin/coupons)
  📊 Analytics (/admin/analytics)
  ⚙️ Settings (/admin/settings)
  ```
- Acceptance: Sidebar collapses/expands, active route highlighted

**Day 7-8: AdminHeader Component** (16 hours)
- File: `frontend/src/components/admin/layout/AdminHeader.tsx`
- Features:
  - Breadcrumbs (auto-generated from route)
  - Global search (placeholder for now)
  - User menu (profile, logout)
  - Notifications icon (placeholder)
- Acceptance: Breadcrumbs update on route change, user menu functional

#### Week 2: Shared Components

**Day 9-10: Data Components** (16 hours)
- Files:
  - `components/admin/data/AdminStatsGrid.tsx`
  - `components/admin/data/AdminDataTable.tsx`
  - `components/admin/data/AdminFilterPanel.tsx`
  - `components/admin/data/AdminPagination.tsx`

**AdminStatsGrid** (4 hours):
```typescript
interface StatCard {
  label: string;
  value: string | number;
  change?: { value: number; trend: 'up' | 'down' };
  icon?: React.ReactNode;
}

<AdminStatsGrid stats={[
  { label: 'Total Users', value: 1234, change: { value: 12, trend: 'up' } },
  // ...
]} columns={4} />
```

**AdminDataTable** (8 hours):
- Features: Sorting, filtering, pagination, row selection
- Props: columns, data, loading, error, onRowClick
- Responsive: Horizontal scroll on mobile
- Acceptance: Table sorts, filters, paginates correctly

**AdminFilterPanel** (2 hours):
- Features: Collapsible filter panel with form inputs
- Props: filters (array of FilterConfig), onApply, onReset

**AdminPagination** (2 hours):
- Features: Page number input, prev/next buttons, per-page selector
- **CRITICAL**: 1-indexed (not 0-indexed) to match Plans 109/110
- Acceptance: Pagination updates correctly

**Day 11: Form Components** (8 hours)
- Files:
  - `components/admin/forms/ConfirmationModal.tsx`
  - `components/admin/forms/FormModal.tsx`

**ConfirmationModal**:
```typescript
<ConfirmationModal
  isOpen={showConfirm}
  title="Delete User"
  message="Are you sure you want to delete this user? This action cannot be undone."
  confirmText="Delete"
  confirmVariant="danger"
  onConfirm={() => deleteUser()}
  onCancel={() => setShowConfirm(false)}
/>
```

**FormModal**:
- Generic modal with form validation
- Zod schema integration
- Loading state during submission

**Day 12: Badges & Utility Components** (8 hours)
- Files:
  - `components/admin/badges/TierBadge.tsx`
  - `components/admin/badges/StatusBadge.tsx`
  - `components/admin/badges/Badge.tsx`
  - `components/admin/utility/EmptyState.tsx`
  - `components/admin/utility/LoadingState.tsx`
  - `components/admin/utility/ErrorBoundary.tsx`

**TierBadge**:
```typescript
<TierBadge tier="pro_max" />
// Renders: <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">PRO MAX</span>
```

**Deliverables (Phase 1)**:
- ✅ AdminLayout with responsive sidebar
- ✅ AdminSidebar with navigation
- ✅ AdminHeader with breadcrumbs
- ✅ 8 shared components
- ✅ 1-indexed pagination standard

**Acceptance Criteria**:
- All components render correctly on mobile, tablet, desktop
- Deep Navy theme applied consistently
- Components reusable across all admin pages
- Storybook stories created (optional but recommended)

---

### Phase 2: Dashboard Home Page (Week 3, Days 13-17)

**Objective**: Build unified dashboard home page with cross-plan KPIs

**Day 13-14: Dashboard Layout** (16 hours)
- File: `frontend/src/pages/admin/AdminDashboard.tsx`
- Structure:
  1. Top KPI Grid (4 stats)
  2. Charts Section (2-col layout)
  3. Recent Activity Feed
  4. Quick Actions Panel

**Day 15: Cross-Plan KPI Aggregation** (8 hours)
- API: Create `GET /api/v1/admin/analytics/dashboard-kpis`
- Backend: Aggregate data from Plans 109, 110, 111
- KPIs:
  1. Total Revenue (MRR + Perpetual sales)
  2. Active Users (with any active subscription/license)
  3. Total Credits Consumed (last 30 days)
  4. Coupon Redemptions (last 30 days)

**Day 16: Charts Implementation** (8 hours)
- Library: Recharts or Chart.js
- Charts:
  1. Revenue Mix (Pie chart: Subscription vs Perpetual)
  2. User Growth (Line chart: Last 90 days)
  3. Credit Usage by Model (Bar chart: Top 5 models)
  4. Coupon Performance (Bar chart: Top 5 campaigns)

**Day 17: Recent Activity Feed** (8 hours)
- API: Create `GET /api/v1/admin/analytics/recent-activity`
- Backend: Combine events from all plans (subscriptions, licenses, coupons)
- Display:
  - Last 20 events
  - Event type icon + description
  - Timestamp (relative, e.g., "2 hours ago")
  - Link to detail page

**Deliverables (Phase 2)**:
- ✅ AdminDashboard page
- ✅ Cross-plan KPI API endpoint
- ✅ 4 charts
- ✅ Recent activity feed

**Acceptance Criteria**:
- Dashboard loads in <2 seconds
- KPIs update every 60 seconds (React Query refetch)
- Charts interactive (hover tooltips)
- Activity feed links work correctly

---

### Phase 3: Integration of Existing Pages (Week 4-5, Days 18-27)

**Objective**: Integrate existing admin pages into new layout and fix inconsistencies

#### Week 4: Plans 109 & 110 Integration

**Day 18-19: Subscription Pages** (16 hours)
- Files to update:
  - `frontend/src/pages/admin/SubscriptionManagement.tsx`
  - `frontend/src/pages/admin/UserManagement.tsx`
- Changes:
  - Remove standalone layout, use AdminLayout
  - Replace custom components with shared components
  - Update API calls to use unified `api/admin.ts`
  - Ensure Deep Navy theme (already correct)

**Day 20-21: License Pages** (16 hours)
- Files to update:
  - `frontend/src/pages/admin/PerpetualLicenseManagement.tsx`
  - `frontend/src/pages/admin/ProrationTracking.tsx`
- Changes:
  - Same as above
  - Verify 1-indexed pagination (already correct)

**Day 22: Analytics Pages** (8 hours)
- Files to update:
  - `frontend/src/pages/admin/PlatformAnalytics.tsx`
- Changes:
  - Integrate into new analytics section
  - Add link to new RevenueAnalytics page

#### Week 5: Plan 111 Integration (CRITICAL FIXES)

**Day 23-24: Fix CouponManagement.tsx** (16 hours)
- File: `frontend/src/pages/admin/CouponManagement.tsx`
- **CRITICAL FIXES**:
  1. ❌ **Theme**: Change all `gray-50` → `deep-navy-50`, `gray-100` → `deep-navy-100`
  2. ❌ **Pagination**: Change 0-indexed → 1-indexed
     - Line 127: `page: 1` (not 0)
     - Line 342: `setCurrentPage(1)` after filters change
     - Line 398: `(currentPage - 1) * pageSize` in API call
  3. ❌ **Complete Modals**:
     - CreateCouponModal: Add validation (lines 450-480)
     - EditCouponModal: Implement (currently placeholder)
     - ViewRedemptionsModal: Implement (currently placeholder)
- Acceptance: Page matches Plan 109/110 theme and behavior

**Day 25: Fix Other Plan 111 Pages** (8 hours)
- Files:
  - `frontend/src/pages/admin/CampaignManagement.tsx`
  - `frontend/src/pages/admin/FraudDetection.tsx`
- Apply same theme/pagination fixes

**Day 26-27: Testing & Bug Fixes** (16 hours)
- Test all integrated pages
- Fix layout issues
- Ensure navigation works correctly
- Verify API integration

**Deliverables (Phase 3)**:
- ✅ All 14 admin pages integrated
- ✅ Plan 111 theme/pagination fixed
- ✅ Consistent UI/UX across all pages
- ✅ No standalone layouts remaining

**Acceptance Criteria**:
- All pages use AdminLayout
- All pages use shared components (>80% reduction in duplication)
- Deep Navy theme applied consistently
- 1-indexed pagination everywhere
- No visual regressions

---

### Phase 4: Unified Views (Week 6-7, Days 28-37)

**Objective**: Build new unified user detail and revenue analytics pages

#### Week 6: Unified User Detail View

**Day 28-30: UserDetailUnified Component** (24 hours)
- File: `frontend/src/pages/admin/users/UserDetailUnified.tsx`
- Structure: Tab-based layout with 7 tabs

**Tab 1: Overview** (4 hours):
- User profile card
- Current subscription status
- Current license status
- Credit balance
- Quick actions (suspend, ban, adjust credits)

**Tab 2: Subscriptions** (4 hours):
- Current subscription details
- Subscription history (table)
- Proration events (table)
- Upgrade/downgrade timeline

**Tab 3: Licenses** (4 hours):
- Perpetual licenses (table)
- Device activations per license (nested table)
- Version upgrade history

**Tab 4: Credits** (4 hours):
- Credit balance widget
- Credit allocation history (table)
- Credit usage by model (chart + table)
- Deduction ledger (table)

**Tab 5: Coupons** (4 hours):
- Coupon redemptions (table)
- Fraud flags (if any, with severity badge)
- Discount value total

**Tab 6: Payments** (2 hours):
- Stripe invoices (table)
- Payment method on file
- Link to Stripe customer dashboard

**Tab 7: Activity** (2 hours):
- Combined timeline of all user actions
- Filter by action type
- Export to CSV

**Day 31: API Endpoints** (8 hours)
- Create aggregation endpoints:
  - `GET /api/v1/admin/users/:id/overview`
  - `GET /api/v1/admin/users/:id/subscriptions`
  - `GET /api/v1/admin/users/:id/licenses`
  - `GET /api/v1/admin/users/:id/credits`
  - `GET /api/v1/admin/users/:id/coupons`
  - `GET /api/v1/admin/users/:id/payments`
  - `GET /api/v1/admin/users/:id/activity`

**Day 32: Testing & Polish** (8 hours)
- Test all tabs load correctly
- Test tab switching performance
- Add loading states for lazy tabs
- Add error boundaries

#### Week 7: Revenue Analytics Dashboard

**Day 33-35: RevenueAnalytics Component** (24 hours)
- File: `frontend/src/pages/admin/analytics/RevenueAnalytics.tsx`

**Section 1: KPI Grid** (4 hours):
- Total Revenue (MRR + Perpetual + Upgrades)
- MRR (Monthly Recurring Revenue from subscriptions)
- Perpetual Revenue (one-time license sales)
- Average Revenue Per User (ARPU)
- Coupon Discount Value (last 30 days)

**Section 2: Revenue Mix Chart** (4 hours):
- Pie chart showing subscription vs perpetual revenue
- Time range selector (7d, 30d, 90d, 1y)

**Section 3: Revenue Trend Chart** (4 hours):
- Line chart with 3 lines:
  1. Total Revenue
  2. Subscription Revenue
  3. Perpetual Revenue
- Time range selector

**Section 4: Conversion Funnel** (4 hours):
- Funnel chart showing:
  1. Free tier users
  2. Paid subscription users
  3. Perpetual license buyers
- Conversion rates between stages

**Section 5: Credit Usage by Model** (4 hours):
- Bar chart showing credit consumption by AI model
- Table with detailed breakdown

**Section 6: Coupon ROI Analysis** (4 hours):
- Table showing:
  - Campaign name
  - Coupons issued / redeemed
  - Discount value
  - Revenue generated from redemptions
  - ROI % (revenue / discount)

**Day 36: API Endpoints** (8 hours)
- Create analytics endpoints:
  - `GET /api/v1/admin/analytics/revenue-kpis`
  - `GET /api/v1/admin/analytics/revenue-mix`
  - `GET /api/v1/admin/analytics/revenue-trend`
  - `GET /api/v1/admin/analytics/conversion-funnel`
  - `GET /api/v1/admin/analytics/credit-usage`
  - `GET /api/v1/admin/analytics/coupon-roi`

**Day 37: Testing & Polish** (8 hours)
- Test chart interactivity
- Verify calculations are correct
- Add export to PDF/Excel functionality
- Performance testing with large datasets

**Deliverables (Phase 4)**:
- ✅ UserDetailUnified with 7 tabs
- ✅ RevenueAnalytics dashboard
- ✅ 14 new API endpoints
- ✅ Export functionality

**Acceptance Criteria**:
- UserDetailUnified shows all user data in one place
- Tab switching is instant (lazy loading)
- Revenue analytics load in <3 seconds
- Charts are interactive and accurate
- Export functionality works

---

### Phase 5: Polish & Testing (Week 8, Days 38-42)

**Objective**: Final polish, accessibility improvements, comprehensive testing

**Day 38: Accessibility Audit** (8 hours)
- Run axe DevTools on all admin pages
- Fix WCAG 2.1 AA violations:
  - Color contrast (≥4.5:1)
  - Keyboard navigation (Tab, Enter, Escape)
  - ARIA labels on interactive elements
  - Focus indicators
  - Screen reader support

**Day 39: Responsive Testing** (8 hours)
- Test on devices:
  - Mobile (iPhone 12, Galaxy S21)
  - Tablet (iPad Pro, Surface Pro)
  - Desktop (1920x1080, 2560x1440)
- Fix layout issues
- Ensure touch targets ≥44px

**Day 40: Performance Optimization** (8 hours)
- Implement virtual scrolling for tables >500 rows
- Add React.lazy() for route-based code splitting
- Optimize images (use WebP)
- Add service worker for offline support (optional)
- Measure with Lighthouse (target: >90 performance score)

**Day 41: End-to-End Testing** (8 hours)
- Test complete user journeys:
  1. Admin logs in → views dashboard → navigates to user detail → adjusts credits → logs out
  2. Admin searches for user → views subscription → upgrades tier → verifies proration
  3. Admin creates coupon → assigns to campaign → views redemptions → analyzes ROI
- Document any bugs found

**Day 42: Documentation & Handoff** (8 hours)
- Create developer documentation:
  - Component usage examples
  - API endpoint documentation
  - State management guide
  - Deployment checklist
- Create QA testing checklist
- Demo session with stakeholders

**Deliverables (Phase 5)**:
- ✅ WCAG 2.1 AA compliant
- ✅ Responsive on all devices
- ✅ Performance optimized
- ✅ E2E tests passing
- ✅ Documentation complete

**Acceptance Criteria**:
- 0 critical accessibility violations
- Lighthouse performance score >90
- All E2E tests passing
- Stakeholder approval

---

## Component Development Checklist

### Layout Components (Phase 1)
- [ ] AdminLayout.tsx - Main layout wrapper
- [ ] AdminSidebar.tsx - Collapsible sidebar with navigation
- [ ] AdminHeader.tsx - Header with breadcrumbs, search, user menu

### Data Components (Phase 1)
- [ ] AdminStatsGrid.tsx - KPI stat cards grid
- [ ] AdminDataTable.tsx - Sortable, filterable, paginated table
- [ ] AdminFilterPanel.tsx - Collapsible filter panel
- [ ] AdminPagination.tsx - 1-indexed pagination component

### Form Components (Phase 1)
- [ ] ConfirmationModal.tsx - Confirmation dialog
- [ ] FormModal.tsx - Generic form modal with validation

### Badge Components (Phase 1)
- [ ] TierBadge.tsx - Subscription tier badge
- [ ] StatusBadge.tsx - Status badge (active, inactive, etc.)
- [ ] Badge.tsx - Generic badge component

### Utility Components (Phase 1)
- [ ] EmptyState.tsx - Empty state placeholder
- [ ] LoadingState.tsx - Loading spinner/skeleton
- [ ] ErrorBoundary.tsx - Error boundary wrapper

### Page Components (Phases 2-4)
- [ ] AdminDashboard.tsx - Dashboard home page (Phase 2)
- [ ] UserDetailUnified.tsx - Unified user detail (Phase 4)
- [ ] RevenueAnalytics.tsx - Revenue analytics dashboard (Phase 4)

---

## File Modification Checklist

### Plan 109 Pages (Phase 3, Days 18-19)
- [ ] SubscriptionManagement.tsx
  - [ ] Remove standalone layout
  - [ ] Use AdminLayout
  - [ ] Replace AdminStatsCard with AdminStatsGrid
  - [ ] Replace custom table with AdminDataTable
  - [ ] Use shared ConfirmationModal
  - [ ] Update API imports to `api/admin.ts`

- [ ] UserManagement.tsx
  - [ ] Same changes as above
  - [ ] Add link to new UserDetailUnified page

- [ ] PlatformAnalytics.tsx
  - [ ] Integrate into new analytics section
  - [ ] Add link to RevenueAnalytics

### Plan 110 Pages (Phase 3, Days 20-21)
- [ ] PerpetualLicenseManagement.tsx
  - [ ] Remove standalone layout
  - [ ] Use AdminLayout
  - [ ] Replace components with shared versions
  - [ ] Verify 1-indexed pagination

- [ ] ProrationTracking.tsx
  - [ ] Same changes as above

### Plan 111 Pages (Phase 3, Days 23-25) - CRITICAL
- [ ] CouponManagement.tsx
  - [ ] Fix theme: gray-50 → deep-navy-50, gray-100 → deep-navy-100
  - [ ] Fix pagination: 0-indexed → 1-indexed
  - [ ] Complete CreateCouponModal (add validation)
  - [ ] Implement EditCouponModal (currently placeholder)
  - [ ] Implement ViewRedemptionsModal (currently placeholder)
  - [ ] Replace components with shared versions

- [ ] CampaignManagement.tsx
  - [ ] Fix theme
  - [ ] Fix pagination
  - [ ] Use AdminLayout and shared components

- [ ] FraudDetection.tsx
  - [ ] Fix theme
  - [ ] Fix pagination
  - [ ] Use AdminLayout and shared components

### API Client (Phase 1, Day 12)
- [ ] Create `api/admin.ts`
  - [ ] Export all plan109 API methods
  - [ ] Export all plan110 API methods
  - [ ] Export all plan111 API methods
  - [ ] Add new analytics API methods

### State Management (Phase 1, Day 3)
- [ ] Create `stores/adminUIStore.ts`
  - [ ] sidebarCollapsed state
  - [ ] activeFilters state
  - [ ] breadcrumbs state
  - [ ] Persist to localStorage

### Routing (Phase 1, Day 3)
- [ ] Create `routes/adminRoutes.tsx`
  - [ ] Define all admin routes
  - [ ] Set up lazy loading
  - [ ] Configure route guards (auth, admin role)

---

## Testing Requirements

### Unit Tests (Phase 5)
**Target Coverage**: >80%

**Component Tests**:
- [ ] AdminLayout: Sidebar collapse/expand
- [ ] AdminSidebar: Active route highlighting
- [ ] AdminStatsGrid: Stat cards render correctly
- [ ] AdminDataTable: Sorting, filtering, pagination
- [ ] AdminPagination: Page change, per-page change
- [ ] TierBadge: Correct colors for each tier
- [ ] StatusBadge: Correct colors for each status

**Hook Tests**:
- [ ] useAdminUIStore: State persistence
- [ ] useDashboardKPIs: Data fetching and transformation

**Utility Tests**:
- [ ] formatCurrency: USD formatting
- [ ] formatDate: Relative date formatting
- [ ] calculateProration: Proration math

### Integration Tests (Phase 5)
**Target**: 20+ tests

- [ ] Dashboard: KPIs load correctly
- [ ] SubscriptionManagement: Tier upgrade flow
- [ ] UserDetailUnified: All tabs load
- [ ] RevenueAnalytics: Charts render with data
- [ ] CouponManagement: Create coupon flow
- [ ] Global Search: Returns correct results

### End-to-End Tests (Phase 5, Day 41)
**Tool**: Playwright or Cypress

**Test Scenarios**:
1. [ ] Admin Login Flow
   - Login with admin credentials
   - Verify dashboard loads
   - Verify sidebar navigation works

2. [ ] User Management Flow
   - Search for user
   - View user detail (unified page)
   - Adjust credits
   - Verify credit balance updated

3. [ ] Subscription Management Flow
   - View all subscriptions
   - Filter by tier
   - Upgrade user to new tier
   - Verify proration calculated correctly

4. [ ] License Management Flow
   - View all licenses
   - View device activations
   - Deactivate device
   - Verify activation count decreased

5. [ ] Coupon Management Flow
   - Create new coupon
   - Assign to campaign
   - View redemptions
   - Verify ROI calculation

6. [ ] Analytics Flow
   - View revenue analytics
   - Change time range
   - Verify charts update
   - Export to PDF

### Accessibility Tests (Phase 5, Day 38)
**Tool**: axe DevTools

- [ ] All pages: WCAG 2.1 AA compliant
- [ ] Color contrast: ≥4.5:1
- [ ] Keyboard navigation: Tab order correct
- [ ] ARIA labels: All interactive elements
- [ ] Focus indicators: Visible on all focusable elements
- [ ] Screen reader: All content accessible

### Performance Tests (Phase 5, Day 40)
**Tool**: Lighthouse

- [ ] Dashboard: Load time <2s, performance score >90
- [ ] UserDetailUnified: Load time <3s
- [ ] RevenueAnalytics: Load time <3s
- [ ] Large tables (>1000 rows): Virtual scrolling, smooth scroll

---

## Rollout Procedures

### Development Environment (Phase 1-5)
1. Create feature branch: `git checkout -b feature/unified-admin-dashboard`
2. Implement phase by phase
3. Commit after each day's work
4. Push to remote daily for backup

### Code Review (After Phase 5)
1. Create pull request with description of all changes
2. Request review from:
   - Frontend lead
   - Backend lead (for API changes)
   - QA lead
3. Address feedback
4. Obtain approval from all reviewers

### Staging Deployment (Week 9)
1. Merge feature branch to `develop`
2. Deploy to staging environment
3. Run smoke tests
4. QA team performs full regression testing
5. Stakeholder demo and approval

### Production Deployment (Week 10)
1. Merge `develop` to `main`
2. Create release tag: `v2.1.0-admin-dashboard`
3. Deploy to production during maintenance window
4. Run smoke tests
5. Monitor error logs and performance metrics
6. Gradual rollout (10% → 50% → 100% of admin users)

### Rollback Plan
1. If critical bug found, immediately rollback to previous version
2. Investigate root cause
3. Fix in hotfix branch
4. Deploy hotfix after testing

---

## Effort Breakdown

| Phase | Duration | Frontend Hours | Backend Hours | QA Hours | Total Hours |
|-------|----------|----------------|---------------|----------|-------------|
| 0. Preparation | 2 days | 8 | 0 | 0 | 8 |
| 1. Foundation | 10 days | 80 | 0 | 0 | 80 |
| 2. Dashboard | 5 days | 40 | 16 | 4 | 60 |
| 3. Integration | 10 days | 80 | 8 | 12 | 100 |
| 4. Unified Views | 10 days | 80 | 32 | 8 | 120 |
| 5. Polish & Testing | 5 days | 32 | 0 | 32 | 64 |
| **Total** | **42 days** | **320** | **56** | **56** | **432** |

**Assumptions**:
- 1 senior frontend developer (full-time): 320 hours
- 1 backend developer (part-time for API work): 56 hours
- 1 QA engineer (part-time): 56 hours

**Total**: 432 hours / 8 hours per day = 54 developer-days
**Calendar time**: 6-8 weeks (accounting for reviews, testing, delays)

---

## Risk Assessment

### High Risks

1. **Plan 111 Fixes Take Longer Than Expected** (Probability: Medium, Impact: High)
   - Mitigation: Allocate buffer time in Week 5
   - Contingency: Prioritize theme/pagination fixes, defer modal completions to Phase 5

2. **API Harmonization Not Complete** (Probability: Low, Impact: High)
   - Dependency: Document 028 implementation
   - Mitigation: Coordinate with backend team, ensure APIs ready before Phase 2
   - Contingency: Use mock data for dashboard if APIs delayed

3. **Cross-Plan Data Aggregation Performance Issues** (Probability: Medium, Impact: Medium)
   - Mitigation: Implement pagination, caching, database indexes
   - Contingency: Reduce data range (e.g., last 30 days instead of 90 days)

### Medium Risks

4. **React Query Learning Curve** (Probability: Medium, Impact: Low)
   - Mitigation: Allocate 2 days in Phase 0 for learning
   - Contingency: Use SWR if React Query proves too complex

5. **Accessibility Violations Discovered Late** (Probability: Medium, Impact: Medium)
   - Mitigation: Run axe DevTools daily during development
   - Contingency: Allocate 2 extra days in Phase 5 for fixes

### Low Risks

6. **Scope Creep** (Probability: Low, Impact: Low)
   - Mitigation: Strict adherence to Document 120 design
   - Contingency: Create backlog for post-v2.1.0 enhancements

---

## Success Metrics

### Performance Metrics
- [ ] Dashboard loads in <2 seconds
- [ ] UserDetailUnified loads in <3 seconds
- [ ] RevenueAnalytics loads in <3 seconds
- [ ] Lighthouse performance score >90 on all pages

### Code Quality Metrics
- [ ] Unit test coverage >80%
- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors (warnings allowed)
- [ ] Code duplication <5% (down from 30%)

### User Experience Metrics
- [ ] Admin task completion 40% faster (measured via user testing)
- [ ] 0 critical accessibility violations (WCAG 2.1 AA)
- [ ] Mobile/tablet usability score >4.5/5 (user survey)

### Business Metrics
- [ ] Admin onboarding time reduced by 50% (new admins)
- [ ] Support tickets for admin dashboard reduced by 30%
- [ ] Admin user satisfaction score >4.5/5

---

## Post-Implementation

### Monitoring (Week 11+)
- Set up error tracking (Sentry)
- Monitor API performance (response times, error rates)
- Track user engagement (Google Analytics)
- Collect admin feedback (in-app survey)

### Iteration (v2.1.1+)
- Address bugs found in production
- Implement enhancements based on feedback
- Optimize performance based on metrics

### Future Enhancements (v2.2.0+)
- RBAC integration (Document 119)
- Real-time notifications (WebSockets)
- Advanced analytics (cohort analysis, LTV predictions)
- Bulk operations UI
- CSV import/export
- Admin action history with undo

---

## Appendix

### Glossary
- **MRR**: Monthly Recurring Revenue (from subscriptions)
- **ARPU**: Average Revenue Per User
- **ROI**: Return on Investment
- **WCAG**: Web Content Accessibility Guidelines
- **ARIA**: Accessible Rich Internet Applications

### References
- Document 120: Unified Admin Dashboard - Integration Design
- Document 028: API Harmonization Specification
- Document 119: User-Role-Permission RBAC Design
- Plans 109, 110, 111: Original monetization plans

---

**Last Updated**: 2025-11-09
**Next Steps**: Begin Phase 0 (Preparation) after approval
