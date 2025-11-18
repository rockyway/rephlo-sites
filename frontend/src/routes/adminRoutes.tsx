import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { AdminRoute } from '../components/auth/AdminRoute';

// Lazy load admin components for code splitting
const AdminLayout = lazy(() => import('../components/admin/layout/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));

// Plan 109 pages (already exist)
const SubscriptionManagement = lazy(() => import('../pages/admin/SubscriptionManagement'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const PlatformAnalytics = lazy(() => import('../pages/admin/PlatformAnalytics'));
const CreditManagement = lazy(() => import('../pages/admin/CreditManagement'));

// Plan 110 pages (already exist)
const PerpetualLicenseManagement = lazy(() => import('../pages/admin/PerpetualLicenseManagement'));
const ProrationTracking = lazy(() => import('../pages/admin/ProrationTracking'));
const DeviceActivationManagement = lazy(() => import('../pages/admin/DeviceActivationManagement'));

// Plan 111 pages (already exist)
const CouponManagement = lazy(() => import('../pages/admin/CouponManagement'));
const CampaignManagement = lazy(() => import('../pages/admin/coupons/CampaignManagement'));
const FraudDetection = lazy(() => import('../pages/admin/coupons/FraudDetection'));

// Phase 4: New unified views
const UserDetailUnified = lazy(() => import('../pages/admin/users/UserDetailUnified'));
const RevenueAnalytics = lazy(() => import('../pages/admin/analytics/RevenueAnalytics'));

// Plan 131 Phase 1: Quick wins - connecting existing pages
const MarginTracking = lazy(() => import('../pages/admin/MarginTracking'));
const PricingConfiguration = lazy(() => import('../pages/admin/PricingConfiguration'));
const PricingSimulation = lazy(() => import('../pages/admin/PricingSimulation'));
const VendorPriceMonitoring = lazy(() => import('../pages/admin/VendorPriceMonitoring'));
const CouponAnalytics = lazy(() => import('../pages/admin/CouponAnalytics'));
const CampaignCalendar = lazy(() => import('../pages/admin/CampaignCalendar'));
const ModelManagement = lazy(() => import('../pages/admin/ModelManagement'));
const BillingDashboard = lazy(() => import('../pages/admin/BillingDashboard'));

// Plan 131 Phase 2: Admin Settings
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));

// Plan 180: Analytics Dashboard
const AnalyticsDashboard = lazy(() => import('../pages/admin/AnalyticsDashboard'));

// Plan 190: Tier Configuration Management
const AdminTierManagement = lazy(() => import('../pages/AdminTierManagement'));

// Plan 192: Refund Management
const RefundManagement = lazy(() => import('../pages/admin/RefundManagement'));

// Admin route configuration
export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      // Dashboard home
      {
        index: true,
        element: <AdminDashboard />,
      },

      // User management
      {
        path: 'users',
        element: <UserManagement />,
      },
      {
        path: 'users/:id',
        element: <UserDetailUnified />,
      },

      // Subscription management (Plan 109)
      {
        path: 'subscriptions',
        element: <SubscriptionManagement />,
      },
      {
        path: 'credits',
        element: <CreditManagement />,
      },

      // Tier configuration management (Plan 190)
      {
        path: 'tier-management',
        element: <AdminTierManagement />,
      },

      // Refund management (Plan 192)
      {
        path: 'refunds',
        element: <RefundManagement />,
      },

      // License management (Plan 110)
      {
        path: 'licenses',
        element: <PerpetualLicenseManagement />,
      },
      {
        path: 'licenses/prorations',
        element: <ProrationTracking />,
      },
      {
        path: 'licenses/devices',
        element: <DeviceActivationManagement />,
      },

      // Coupon management (Plan 111)
      {
        path: 'coupons',
        element: <CouponManagement />,
      },
      {
        path: 'coupons/analytics',
        element: <CouponAnalytics />,
      },
      {
        path: 'coupons/calendar',
        element: <CampaignCalendar />,
      },
      {
        path: 'coupons/campaigns',
        element: <CampaignManagement />,
      },
      {
        path: 'coupons/fraud',
        element: <FraudDetection />,
      },

      // Analytics
      {
        path: 'analytics',
        element: <AnalyticsDashboard />,
      },
      {
        path: 'analytics/platform',
        element: <PlatformAnalytics />,
      },
      {
        path: 'analytics/revenue',
        element: <RevenueAnalytics />,
      },

      // Models (Plan 131)
      {
        path: 'models',
        element: <ModelManagement />,
      },

      // Profitability (Plan 131)
      {
        path: 'profitability/margins',
        element: <MarginTracking />,
      },
      {
        path: 'profitability/pricing',
        element: <PricingConfiguration />,
      },
      {
        path: 'profitability/simulator',
        element: <PricingSimulation />,
      },
      {
        path: 'profitability/vendor-prices',
        element: <VendorPriceMonitoring />,
      },

      // Billing (Plan 131)
      {
        path: 'billing',
        element: <BillingDashboard />,
      },

      // Settings (Plan 131 Phase 2)
      {
        path: 'settings',
        element: <AdminSettings />,
      },
    ],
  },
];
