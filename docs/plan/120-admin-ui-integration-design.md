# Unified Admin Dashboard - Integration Design

**Document ID**: 120
**Created**: 2025-11-09
**Status**: Design Phase  
**Priority**: P0 (High)
**Target Version**: v2.1.0
**Related Plans**: 109, 110, 111, 119

---

## Executive Summary

Comprehensive analysis and design for integrating 14 admin pages across Plans 109, 110, and 111 into a unified dashboard.

**Key Findings**:
- **Total Pages**: 14 (5,588+ lines analyzed)
- **Top 5 Gaps**: Fragmented user data, no cross-plan analytics, missing navigation, duplicate components, no global search
- **Effort**: 6-8 weeks
- **ROI**: 40% faster admin tasks, 30% code reduction

---

## Admin Pages Inventory

### Plan 109 (4 pages, 2,290+ lines)
1. SubscriptionManagement.tsx (587 lines) - Deep Navy ✅, 1-indexed ✅
2. UserManagement.tsx (705 lines) - Deep Navy ✅
3. PlatformAnalytics.tsx (498 lines) - Deep Navy ✅
4. CreditManagement.tsx (~500 lines)

### Plan 110 (3 pages, 1,831+ lines)
5. PerpetualLicenseManagement.tsx (794 lines) - Deep Navy ✅
6. ProrationTracking.tsx (637 lines) - Deep Navy ✅
7. DeviceActivationManagement.tsx (~400 lines)

### Plan 111 (3 pages, 1,467+ lines)
8. **CouponManagement.tsx (567 lines)** - ⚠️ Gray theme, 0-indexed, incomplete modals
9. CampaignManagement.tsx (~500 lines)
10. FraudDetection.tsx (~400 lines)

### Additional (4 pages)
11-14. ModelTier, Pricing, VendorPrice, Margin tracking

---

## Top 5 Critical Gaps

### 1. No Unified User Profile View (P0)

**Problem**: User data scattered across 4+ pages  
**Solution**: `/admin/users/:id` with tabs

**Tabs**:
- Subscriptions (current + history + prorations)
- Licenses (perpetual + devices + upgrades)
- Credits (balance + transactions + usage by model)
- Coupons (redemptions + fraud flags)
- Payments (Stripe invoices)
- Activity (combined timeline)
- Audit (future: admin actions)

### 2. Fragmented Analytics (P0)

**Problem**: No cross-plan revenue view  
**Solution**: Unified `/admin/analytics/revenue`

**KPIs**:
- Total Revenue (MRR + Perpetual + Upgrades)
- MRR (subscriptions only)
- Perpetual Revenue (one-time sales)
- Coupon Impact (discount value)

**Charts**:
- Revenue Mix (subscription vs perpetual)
- Conversion Funnel (Free → Paid → Perpetual)
- Credit Usage by Model
- Coupon ROI

### 3. Missing Navigation (P0)

**Problem**: No AdminLayout, pages link to non-existent /admin  
**Solution**: AdminLayout with sidebar

**Menu**:
```
🏠 Dashboard
👥 Users (List, Bulk)
💳 Subscriptions (Active, Credits, Prorations)
🔑 Licenses (Perpetual, Devices, Upgrades)
🎟️ Coupons (List, Campaigns, Fraud)
📊 Analytics (Revenue, Usage, Conversion)
⚙️ Settings (Tiers, Pricing, Models)
🔐 RBAC (Future)
```

### 4. Duplicate Components (P1)

**Problem**: Stats cards, filters, pagination duplicated  
**Solution**: Shared library in `components/admin/`

**Components**:
- Layout: AdminLayout, Sidebar, Header
- Data: StatsGrid, DataTable, FilterPanel, Pagination
- Forms: ConfirmationModal, FormModal
- Badges: TierBadge, StatusBadge, Badge
- Utility: EmptyState, LoadingState, ErrorBoundary

### 5. No Global Search (P1)

**Problem**: Independent search per page  
**Solution**: Global search in AdminHeader

**Searches**: Users, Subscriptions, Licenses, Coupons  
**Features**: Debounced (300ms), Cmd/Ctrl+K shortcut

---

## Architecture

### Component Hierarchy
```
<AdminLayout>
  <AdminSidebar />
  <AdminHeader>
    <Breadcrumbs />
    <GlobalSearch />
    <UserMenu />
  </AdminHeader>
  <main><Outlet /></main>
</AdminLayout>
```

### Routes
```
/admin → AdminDashboard
/admin/users → UserManagement
/admin/users/:id → UserDetailUnified (NEW)
/admin/subscriptions → SubscriptionManagement
/admin/licenses → LicenseManagement
/admin/analytics/revenue → RevenueAnalytics (NEW)
```

---

## State Management

**React Query** (server state):
- Caching, refetching, pagination
- staleTime: 60s (short), Infinity (static)

**Zustand** (UI state):
- Sidebar collapsed, active filters
- Persisted to localStorage

---

## UI/UX Guidelines

### Theme
**Palette**: Deep Navy (Plans 109/110)
- Primary: rephlo-blue, electric-cyan
- Background: deep-navy-50
- Text: deep-navy-800 (headings), deep-navy-600 (body)

**Action Required**:
- ❌ Fix Plan 111: gray-50 → deep-navy-50
- ❌ Fix Plan 111: 0-indexed → 1-indexed pagination
- ❌ Complete Plan 111 modals

### Accessibility
- WCAG 2.1 AA: Contrast ≥ 4.5:1
- Keyboard navigation, ARIA labels
- Screen reader support

### Responsive
- Mobile: Drawer sidebar, scrollable tables
- Tablet: 2-col stats
- Desktop: 4-col stats, persistent sidebar

---

## Performance

1. Virtual scrolling (tables >500 rows)
2. Lazy tab loading
3. Debounced search (300ms)
4. Code splitting (lazy routes)
5. React Query caching

---

## Implementation Estimate

**Total**: 6-8 weeks (1 senior frontend dev)

**Phases**:
1. Foundation (2 weeks): Layout, components, routing
2. Dashboard (1 week): AdminDashboard home
3. Integration (2 weeks): Existing pages, theme fixes
4. Unified Views (2 weeks): UserDetail, RevenueAnalytics
5. Polish (1 week): Accessibility, testing

**Critical Path**:
1. AdminLayout + routing
2. Shared components
3. Unified user detail
4. Cross-plan analytics

---

## File Structure

```
components/admin/
  layout/ (Layout, Sidebar, Header)
  data/ (StatsGrid, DataTable, FilterPanel)
  forms/ (ConfirmationModal)
  badges/ (TierBadge, StatusBadge)
  utility/ (EmptyState, LoadingState)
pages/admin/
  AdminDashboard.tsx (NEW)
  users/UserDetailUnified.tsx (NEW)
  analytics/RevenueAnalytics.tsx (NEW)
api/admin.ts (unified)
stores/adminUIStore.ts
routes/adminRoutes.tsx
```

---

**Last Updated**: 2025-11-09  
**Next**: Document 121 (Implementation Plan)
