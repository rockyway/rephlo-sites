import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

// Lazy load admin components for code splitting
const AdminLayout = lazy(() => import('../components/admin/layout/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));

// Plan 109 pages (already exist)
const SubscriptionManagement = lazy(() => import('../pages/admin/SubscriptionManagement'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const PlatformAnalytics = lazy(() => import('../pages/admin/PlatformAnalytics'));
// const CreditManagement = lazy(() => import('../pages/admin/CreditManagement'));

// Plan 110 pages (already exist)
const PerpetualLicenseManagement = lazy(() => import('../pages/admin/PerpetualLicenseManagement'));
const ProrationTracking = lazy(() => import('../pages/admin/ProrationTracking'));
// const DeviceActivationManagement = lazy(() => import('../pages/admin/DeviceActivationManagement'));

// Plan 111 pages (already exist)
const CouponManagement = lazy(() => import('../pages/admin/CouponManagement'));
// const CampaignManagement = lazy(() => import('../pages/admin/CampaignManagement'));
// const FraudDetection = lazy(() => import('../pages/admin/FraudDetection'));

// Phase 4: New unified views
const UserDetailUnified = lazy(() => import('../pages/admin/users/UserDetailUnified'));
const RevenueAnalytics = lazy(() => import('../pages/admin/analytics/RevenueAnalytics'));

// Admin route configuration
export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: <AdminLayout />,
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
      // {
      //   path: 'credits',
      //   element: <CreditManagement />,
      // },

      // License management (Plan 110)
      {
        path: 'licenses',
        element: <PerpetualLicenseManagement />,
      },
      {
        path: 'licenses/prorations',
        element: <ProrationTracking />,
      },
      // {
      //   path: 'licenses/devices',
      //   element: <DeviceActivationManagement />,
      // },

      // Coupon management (Plan 111)
      {
        path: 'coupons',
        element: <CouponManagement />,
      },
      // {
      //   path: 'coupons/campaigns',
      //   element: <CampaignManagement />,
      // },
      // {
      //   path: 'coupons/fraud',
      //   element: <FraudDetection />,
      // },

      // Analytics
      {
        path: 'analytics',
        element: <PlatformAnalytics />,
      },
      {
        path: 'analytics/revenue',
        element: <RevenueAnalytics />,
      },

      // Settings (future)
      // {
      //   path: 'settings',
      //   element: <AdminSettings />,
      // },
    ],
  },
];
