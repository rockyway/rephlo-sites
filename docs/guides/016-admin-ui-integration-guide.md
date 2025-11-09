# Admin UI Integration Guide

**Document ID**: 016
**Created**: 2025-11-09
**Version**: v2.1.0
**Status**: Production Ready
**Related Plans**: 120, 121

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Admin User Guide](#admin-user-guide)
4. [Developer Guide](#developer-guide)
5. [Deployment](#deployment)
6. [Architecture](#architecture)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Unified Admin Dashboard integrates 14 admin pages across Plans 109, 110, and 111 into a cohesive, production-ready admin interface with:

- **Modern Stack**: React 18, TypeScript, React Query, Zustand, Tailwind CSS
- **23 Shared Components**: Consistent UI/UX across all pages
- **15 Backend APIs**: Dashboard analytics, user detail, revenue analytics
- **Deep Navy Theme**: Professional, accessible design (WCAG 2.1 AA)
- **Code Splitting**: Optimized bundle sizes with lazy loading
- **Production Ready**: 0 TypeScript errors, comprehensive testing, full documentation

### Key Features

✅ **Unified Navigation**: Sidebar with AdminLayout integration
✅ **Cross-Plan Analytics**: Dashboard KPIs from subscriptions, licenses, coupons, credits
✅ **User Management**: Unified user detail with 7 tabs (Overview, Subscriptions, Licenses, Credits, Coupons, Payments, Activity)
✅ **Revenue Analytics**: KPIs, trends, funnels, credit usage, coupon ROI with charts
✅ **Responsive Design**: Desktop (4-col), Tablet (2-col), Mobile (1-col)
✅ **Accessibility**: Keyboard navigation, ARIA labels, screen reader support
✅ **Performance**: React Query caching, auto-refresh, pagination

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (Prisma configured)
- Admin user account with `role='admin'`

### Installation

```bash
# 1. Install dependencies (if not already done)
cd frontend && npm install
cd ../backend && npm install

# 2. Run database migrations (if needed)
cd backend
npx prisma migrate dev

# 3. Start development servers
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Accessing the Admin Dashboard

1. Navigate to `http://localhost:5173/admin` (dev) or `https://your-domain.com/admin` (prod)
2. Login with admin credentials
3. You'll be redirected to the Admin Dashboard home page

**Note**: Non-admin users will receive a 403 Forbidden error. Ensure your user account has `role='admin'` in the database.

---

## Admin User Guide

### Dashboard Home (`/admin`)

The dashboard home provides cross-plan KPIs and recent activity:

#### KPI Cards (Top Row)
- **Total Revenue**: Combined MRR + perpetual + upgrades (with % change)
- **Active Users**: Users with active subscriptions or licenses (with % change)
- **Credits Consumed**: Total credits used across all models (with % change)
- **Coupon Redemptions**: Total coupons redeemed this period (with total discount)

#### Period Selector
- Click **7d**, **30d**, **90d**, or **1y** to change the time period
- KPIs auto-refresh every 60 seconds
- Historical comparison shows % change vs previous period

#### Revenue Mix Chart
- Pie chart showing revenue breakdown:
  - **Subscription Revenue**: MRR from active subscriptions
  - **Perpetual Revenue**: One-time license sales
  - **Upgrade Revenue**: Version upgrade fees

#### Recent Activity Feed
- Last 20 events from subscriptions, licenses, coupons, credits, devices
- Click **View All** to see complete activity timeline

---

### User Management (`/admin/users`)

List and manage all users with filtering and search.

#### Features
- **Search**: Find users by email or name
- **Filters**: Filter by tier (Free, Pro, Enterprise), status (Active, Suspended, Banned)
- **Pagination**: Navigate through users (50 per page, 1-indexed)
- **Quick Actions**: View details, suspend, ban, adjust credits

#### User Detail Page (`/admin/users/:id`)

Comprehensive user profile with 7 tabs:

1. **Overview**
   - User info (email, status, created date)
   - Current subscription & license status
   - Credit balance
   - Quick stats (total subscriptions, licenses, credits, coupons)
   - Actions: Suspend, Ban, Adjust Credits

2. **Subscriptions**
   - Full subscription history (started, ended, cancelled)
   - Proration events (tier upgrades/downgrades)
   - Price, billing cycle, status for each subscription

3. **Licenses**
   - All perpetual licenses purchased
   - Device activations per license (with hardware fingerprint)
   - Version upgrade history
   - Purchase price, version, status

4. **Credits**
   - Current credit balance
   - Period selector (7d, 30d, 90d, 1y)
   - Usage by model chart (pie chart)
   - Credit allocations table (source, amount, date)
   - Credit deductions ledger (model, credits used, date)

5. **Coupons**
   - All coupon redemptions
   - Fraud detection flags (if any)
   - Total discount value received
   - Coupon codes, discount amounts, redemption dates

6. **Payments** (Coming Soon)
   - Placeholder for invoice history
   - Will show Stripe invoices when Invoice tables are added to schema

7. **Activity**
   - Combined timeline of all user actions
   - Filter by type (Subscription, License, Coupon, Credit, Device, All)
   - Chronological feed with icons and descriptions

---

### Subscription Management (`/admin/subscriptions`)

Monitor and manage subscription monetization.

#### Features
- **Stats Grid**: Total active, MRR, average ARPU, churn rate
- **Filters**: Tier (Free, Pro, Enterprise), status (Active, Cancelled, Expired), billing cycle (Monthly, Annual)
- **Search**: Find subscriptions by user email
- **Actions**: View user details, cancel subscription
- **Proration Events**: See tier changes and credit adjustments

---

### License Management (`/admin/licenses`)

Track perpetual licenses and device activations.

#### Features
- **Stats Grid**: Total licenses, active licenses, total revenue, avg price
- **Filters**: Status (Active, Expired, Revoked), version
- **Search**: Find licenses by user email or license key
- **Device Activations**: View devices per license, deactivate if needed
- **Upgrade Tracking**: See version upgrade revenue

---

### Coupon Management (`/admin/coupons`)

Manage discount codes and campaigns.

#### Features (Plan 111)
- **Stats Grid**: Total coupons, active coupons, total redemptions, total discount
- **Filters**: Type (Percentage, Fixed Amount, Credits), status (Active, Expired, Disabled)
- **Search**: Find coupons by code
- **Actions**: Create, edit, view redemptions, disable
- **Fraud Detection**: Flag suspicious redemptions

**Note**: Create/Edit modals are placeholders (to be implemented in future version).

---

### Platform Analytics (`/admin/analytics`)

System-wide usage and performance analytics (Plan 109).

#### Features
- **Credit Usage by Model**: See which models are consuming the most credits
- **Request Trends**: API request volumes over time
- **Error Rates**: Monitor system health
- **Export**: Download analytics as CSV

---

### Revenue Analytics (`/admin/analytics/revenue`)

Comprehensive revenue analysis and forecasting.

#### KPI Cards
- **Total Revenue**: Combined revenue from all sources (with % change)
- **MRR (Monthly Recurring Revenue)**: Subscription revenue normalized to monthly (with % change)
- **Perpetual Revenue**: One-time license sales (with % change)
- **ARPU (Average Revenue Per User)**: Total revenue / active users (with % change)

#### Charts (2x2 Grid)

1. **Revenue Mix (Pie Chart)**
   - Subscription vs Perpetual vs Upgrade breakdown
   - Hover to see exact values

2. **Revenue Trend (Line Chart)**
   - Time-series data (daily for 7d/30d, weekly for 90d, monthly for 1y)
   - Three lines: Total, Subscription, Perpetual
   - Hover to see exact values per date

3. **Conversion Funnel (Funnel Chart)**
   - Free Tier → Paid Subscription → Perpetual License
   - Shows conversion rates at each step
   - Identify drop-off points

4. **Credit Usage by Model (Bar Chart)**
   - Top 10 models by credit consumption
   - Estimated revenue contribution per model
   - Helps prioritize model partnerships

#### Coupon ROI Table
- All coupon campaigns with ROI analysis
- Columns: Campaign, Issued, Redeemed, Discount, Revenue, ROI %
- Pagination (10 per page)
- Sort by ROI to find most effective campaigns

---

## Developer Guide

### Tech Stack

#### Frontend
- **React 18.2+** with TypeScript
- **Vite** for build tooling
- **React Router v6** with lazy loading
- **React Query (@tanstack/react-query)** for server state
- **Zustand** for client UI state
- **Tailwind CSS** with custom Deep Navy theme
- **Headless UI** for accessible components
- **Recharts** for data visualization
- **Lucide React** for icons

#### Backend
- **Node.js** with Express.js
- **TypeScript** with strict type checking
- **Prisma ORM** with PostgreSQL
- **TSyringe** for dependency injection
- **Audit logging** middleware for SOC 2/GDPR compliance

### Project Structure

```
frontend/src/
├── components/admin/        # Shared admin components
│   ├── layout/             # AdminLayout, AdminSidebar, AdminHeader
│   ├── data/               # AdminStatsGrid, AdminDataTable, AdminPagination
│   ├── forms/              # ConfirmationModal, FormModal
│   ├── badges/             # TierBadge, StatusBadge, Badge
│   └── utility/            # EmptyState, LoadingState, ErrorBoundary
├── pages/admin/            # Admin pages
│   ├── AdminDashboard.tsx
│   ├── users/UserDetailUnified.tsx
│   ├── analytics/RevenueAnalytics.tsx
│   ├── SubscriptionManagement.tsx
│   ├── PerpetualLicenseManagement.tsx
│   ├── CouponManagement.tsx
│   └── ...
├── routes/                 # Route configuration
│   └── adminRoutes.tsx     # Admin route definitions
├── stores/                 # Zustand stores
│   └── adminUIStore.ts     # Sidebar, filters, breadcrumbs
├── providers/              # React providers
│   └── QueryProvider.tsx   # React Query setup
├── api/                    # API client functions
│   ├── admin.ts           # Admin API calls
│   └── ...
└── utils/                  # Utility functions
    └── format.ts          # Currency, number, date formatting

backend/src/
├── controllers/
│   ├── admin-analytics.controller.ts
│   ├── admin-user-detail.controller.ts
│   ├── revenue-analytics.controller.ts
│   └── ...
├── services/
│   ├── admin-analytics.service.ts
│   ├── admin-user-detail.service.ts
│   ├── revenue-analytics.service.ts
│   └── ...
├── routes/
│   └── admin.routes.ts    # All 15 admin endpoints
└── types/
    ├── admin-analytics.types.ts
    └── admin-user-detail.types.ts
```

### Adding a New Admin Page

1. **Create the page component**

```tsx
// frontend/src/pages/admin/MyNewPage.tsx
import { useQuery } from '@tanstack/react-query';
import AdminStatsGrid from '@/components/admin/data/AdminStatsGrid';
import AdminDataTable from '@/components/admin/data/AdminDataTable';
import { getMyData } from '@/api/admin';

export default function MyNewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-data'],
    queryFn: getMyData,
    staleTime: 60 * 1000,
  });

  if (isLoading) return <LoadingState fullPage />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-deep-navy-900">My New Page</h1>
      <AdminStatsGrid stats={data.stats} columns={4} />
      <AdminDataTable columns={columns} data={data.items} />
    </div>
  );
}
```

2. **Add route to adminRoutes.tsx**

```tsx
// frontend/src/routes/adminRoutes.tsx
const MyNewPage = lazy(() => import('../pages/admin/MyNewPage'));

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      // ... existing routes
      {
        path: 'my-new-page',
        element: <MyNewPage />,
      },
    ],
  },
];
```

3. **Add navigation link to AdminSidebar**

```tsx
// frontend/src/components/admin/layout/AdminSidebar.tsx
const navigation = [
  // ... existing items
  { name: 'My New Page', href: '/admin/my-new-page', icon: Star },
];
```

4. **Create backend endpoint**

```typescript
// backend/src/controllers/my-new.controller.ts
@injectable()
export class MyNewController {
  async getMyData(req: Request, res: Response): Promise<void> {
    // Implementation
    res.json({ stats, items });
  }
}

// backend/src/routes/admin.routes.ts
router.get(
  '/my-new-page/data',
  auditLog({ action: 'read', resourceType: 'my-data' }),
  asyncHandler(myNewController.getMyData.bind(myNewController))
);
```

### Using Shared Components

#### AdminStatsGrid

```tsx
const stats = [
  {
    label: 'Total Users',
    value: 1234,
    change: { value: 12.5, trend: 'up' },
    icon: <Users className="h-5 w-5" />,
  },
  // ... more stats
];

<AdminStatsGrid stats={stats} columns={4} />
```

#### AdminDataTable

```tsx
const columns = [
  { key: 'email', label: 'Email', width: 'w-1/3' },
  { key: 'tier', label: 'Tier', width: 'w-1/6', render: (tier) => <TierBadge tier={tier} /> },
  { key: 'actions', label: 'Actions', width: 'w-1/6', align: 'right' },
];

<AdminDataTable columns={columns} data={users} />
```

#### AdminPagination (IMPORTANT: 1-indexed)

```tsx
const [currentPage, setCurrentPage] = useState(1); // Start at 1, NOT 0
const pageSize = 50;

const { data } = useQuery({
  queryKey: ['users', currentPage],
  queryFn: () => getUsers({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize  // Convert to 0-indexed offset for API
  }),
});

<AdminPagination
  currentPage={currentPage}           // 1, 2, 3, ...
  totalPages={Math.ceil(data.total / pageSize)}
  pageSize={pageSize}
  totalItems={data.total}
  onPageChange={setCurrentPage}       // Receives 1, 2, 3, ...
/>
```

### State Management

#### React Query (Server State)

```tsx
// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['dashboard-kpis', period],
  queryFn: () => getDashboardKPIs(period),
  staleTime: 60 * 1000,          // Consider data fresh for 60s
  refetchInterval: 60 * 1000,     // Auto-refresh every 60s
});

// Mutations
const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    queryClient.invalidateQueries(['users']); // Refetch users
  },
});
```

#### Zustand (UI State)

```tsx
import { useAdminUIStore } from '@/stores/adminUIStore';

function MyComponent() {
  const { sidebarCollapsed, toggleSidebar } = useAdminUIStore();

  return (
    <button onClick={toggleSidebar}>
      {sidebarCollapsed ? 'Expand' : 'Collapse'}
    </button>
  );
}
```

### Styling Guidelines

#### Deep Navy Theme (REQUIRED)

**Always use deep-navy colors, NEVER gray:**

```tsx
// ✅ CORRECT
<div className="bg-deep-navy-50 text-deep-navy-900 border-deep-navy-200">

// ❌ WRONG
<div className="bg-gray-50 text-gray-900 border-gray-200">
```

**Color Palette:**
- `deep-navy-50` - Lightest background
- `deep-navy-100` - Cards, panels
- `deep-navy-200` - Borders, dividers
- `deep-navy-500` - Secondary text
- `deep-navy-600` - Primary text
- `deep-navy-700` - Headings
- `deep-navy-800` - Dark headings
- `deep-navy-900` - Darkest text

**Accent Colors:**
- `rephlo-blue` - Primary buttons, links
- `electric-cyan` - Gradients, highlights

#### Responsive Design

```tsx
// 4-col desktop → 2-col tablet → 1-col mobile
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {stats.map(...)}
</div>
```

#### Accessibility

```tsx
// ARIA labels for icon-only buttons
<button aria-label="Delete user" onClick={handleDelete}>
  <Trash2 className="h-4 w-4" />
</button>

// Screen reader text
<span className="sr-only">User status:</span>
<StatusBadge status={user.status} />
```

---

## Deployment

### Build for Production

```bash
# Frontend
cd frontend
npm run build
# Output: dist/ folder

# Backend (if needed)
cd backend
npm run build
# Output: dist/ folder
```

### Environment Variables

#### Frontend (.env.production)

```env
VITE_API_URL=https://api.your-domain.com
```

#### Backend (.env.production)

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
ADMIN_TOKEN=your-secure-admin-token
JWT_SECRET=your-jwt-secret
```

### Deployment Steps

1. **Build frontend**
   ```bash
   cd frontend && npm run build
   ```

2. **Deploy frontend** (choose one):
   - **Vercel**: `vercel --prod`
   - **Netlify**: `netlify deploy --prod --dir=dist`
   - **Static hosting**: Upload `dist/` to S3/CloudFront/Nginx

3. **Deploy backend** (choose one):
   - **Heroku**: `git push heroku master`
   - **AWS EC2**: Run `npm run build && node dist/server.js`
   - **Docker**: Use provided Dockerfile

4. **Run database migrations**
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

5. **Verify deployment**
   - Visit `https://your-domain.com/admin`
   - Test login with admin account
   - Check dashboard loads correctly
   - Verify API calls succeed (check Network tab)

### Production Checklist

- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] Admin user account created (role='admin')
- [ ] HTTPS enabled
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Performance monitoring enabled
- [ ] Backup strategy in place

---

## Architecture

### Component Hierarchy

```
<QueryProvider>
  <ThemeProvider>
    <Router>
      <AdminLayout>
        <AdminSidebar />
        <AdminHeader>
          <Breadcrumbs />
          <UserMenu />
        </AdminHeader>
        <main>
          <Outlet /> {/* Admin pages render here */}
        </main>
      </AdminLayout>
    </Router>
  </ThemeProvider>
</QueryProvider>
```

### Data Flow

```
┌─────────────────┐
│  Admin Page     │
│  (React Query)  │
└────────┬────────┘
         │ queryFn
         ▼
┌─────────────────┐
│  API Client     │
│  (axios)        │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Backend Route  │
│  (auth + audit) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Controller     │
│  (validation)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Service        │
│  (business logic│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Prisma Client  │
│  (database)     │
└─────────────────┘
```

### Performance Optimizations

1. **Code Splitting**: Each admin page is lazy-loaded as a separate chunk
2. **React Query Caching**: Data cached for 60s (staleTime), kept in memory for 5m (gcTime)
3. **Auto-Refresh**: Dashboard auto-refreshes every 60s, revenue analytics every 5m
4. **Pagination**: Limit API responses to 50-100 items per page
5. **Debouncing**: Search inputs debounced 300ms
6. **Memoization**: Use React.memo() for expensive components

---

## API Reference

### Authentication

All admin endpoints require:
- `Authorization: Bearer <JWT_TOKEN>` header
- User must have `role='admin'` in database

### Dashboard Analytics

#### GET /admin/analytics/dashboard-kpis

**Query Parameters:**
- `period`: '7d' | '30d' | '90d' | '1y' (default: '30d')

**Response:**
```json
{
  "totalRevenue": {
    "value": 1234567,
    "change": { "value": 12.5, "trend": "up" },
    "breakdown": {
      "mrr": 567890,
      "perpetual": 456789,
      "upgrades": 209888
    }
  },
  "activeUsers": {
    "value": 1234,
    "change": { "value": 8.2, "trend": "up" }
  },
  "creditsConsumed": {
    "value": 987654,
    "change": { "value": -5.3, "trend": "down" }
  },
  "couponRedemptions": {
    "value": 45,
    "change": { "value": 15.0, "trend": "up" },
    "totalDiscount": 12345
  }
}
```

#### GET /admin/analytics/recent-activity

**Query Parameters:**
- `limit`: number (default: 20, max: 100)
- `offset`: number (default: 0)

**Response:**
```json
{
  "events": [
    {
      "type": "subscription",
      "action": "created",
      "userId": "user-123",
      "userEmail": "user@example.com",
      "description": "Subscribed to Pro Monthly",
      "timestamp": "2025-11-09T12:34:56Z"
    }
  ],
  "total": 1234,
  "limit": 20,
  "offset": 0
}
```

### User Detail

#### GET /admin/users/:id/overview

**Response:**
```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "status": "active",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "currentSubscription": {
    "id": "sub-456",
    "tier": "pro",
    "status": "active",
    "billingCycle": "monthly"
  },
  "currentLicense": {
    "id": "lic-789",
    "version": "v2.0",
    "status": "active"
  },
  "creditBalance": {
    "balance": 10000
  },
  "quickStats": {
    "totalSubscriptions": 3,
    "totalLicenses": 1,
    "totalCreditsAllocated": 50000,
    "totalCouponsRedeemed": 2
  }
}
```

#### GET /admin/users/:id/subscriptions

**Query Parameters:**
- `limit`: number (default: 50, max: 100)
- `offset`: number (default: 0)

**Response:**
```json
{
  "subscriptions": [...],
  "prorations": [...],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

### Revenue Analytics

#### GET /admin/analytics/revenue/kpis

**Query Parameters:**
- `period`: '7d' | '30d' | '90d' | '1y' (default: '30d')

**Response:**
```json
{
  "totalRevenue": {
    "value": 1234567,
    "change": { "value": 12.5, "trend": "up" }
  },
  "mrr": {
    "value": 567890,
    "change": { "value": 8.2, "trend": "up" }
  },
  "perpetualRevenue": {
    "value": 456789,
    "change": { "value": 15.0, "trend": "up" }
  },
  "arpu": {
    "value": 5678,
    "change": { "value": 3.5, "trend": "up" }
  },
  "couponDiscount": {
    "value": 12345,
    "period": "30d"
  }
}
```

*See backend/src/routes/admin.routes.ts (lines 1-577) for complete API documentation.*

---

## Troubleshooting

### Build Errors

#### "Module not found: @/components/admin/..."

**Cause**: Path alias not configured in tsconfig.json

**Fix**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### "Property 'position' does not exist on type..."

**Cause**: TypeScript strict mode issue with ReactQueryDevtools

**Fix**: Already applied in QueryProvider.tsx (line 38):
```tsx
<ReactQueryDevtools initialIsOpen={false} position="bottom-right" as any />
```

### Runtime Errors

#### "403 Forbidden" when accessing /admin

**Cause**: User not authenticated or doesn't have admin role

**Fix**:
1. Verify JWT token is valid: Check Network tab → Request Headers
2. Verify user has `role='admin'` in database:
   ```sql
   UPDATE "User" SET role='admin' WHERE email='your-email@example.com';
   ```

#### "Cannot read property 'map' of undefined"

**Cause**: API returned null/undefined, component tried to map over it

**Fix**: Add null checks and loading states:
```tsx
const { data, isLoading } = useQuery(...);

if (isLoading) return <LoadingState />;
if (!data || !data.items) return <EmptyState />;

return data.items.map(...);
```

### Performance Issues

#### Dashboard loads slowly (>3 seconds)

**Diagnose**:
1. Check Network tab → Filter by XHR
2. Identify slow API calls
3. Check backend logs for slow queries

**Fix**:
- Add database indexes: `CREATE INDEX idx_user_email ON "User"(email);`
- Optimize Prisma queries: Use `select` instead of returning full models
- Add pagination limits: Ensure `limit <= 100`

#### High memory usage

**Cause**: React Query caching too much data

**Fix**: Adjust gcTime in QueryProvider.tsx:
```tsx
queries: {
  gcTime: 2 * 60 * 1000,  // Reduce from 5m to 2m
}
```

### Common Issues

#### Pagination shows "Page 0 of 10"

**Cause**: Using 0-indexed pagination instead of 1-indexed

**Fix**:
```tsx
// ✅ CORRECT (1-indexed)
const [currentPage, setCurrentPage] = useState(1);
const offset = (currentPage - 1) * pageSize;

// ❌ WRONG (0-indexed)
const [currentPage, setCurrentPage] = useState(0);
const offset = currentPage * pageSize;
```

#### Gray theme showing instead of Deep Navy

**Cause**: Using `gray-*` Tailwind classes instead of `deep-navy-*`

**Fix**: Search and replace:
```bash
# Find all gray classes
grep -r "gray-" frontend/src/pages/admin/

# Replace with deep-navy
# text-gray-600 → text-deep-navy-600
# bg-gray-50 → bg-deep-navy-50
# border-gray-200 → border-deep-navy-200
```

---

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/your-org/rephlo-sites/issues
- **Documentation**: docs/plan/121-admin-ui-implementation-plan.md
- **Testing Report**: docs/progress/125-admin-ui-comprehensive-testing-report.md

---

**Last Updated**: 2025-11-09
**Version**: v2.1.0
**Status**: Production Ready
