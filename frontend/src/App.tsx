import { Suspense } from 'react'
import { BrowserRouter as Router, useRoutes, RouteObject } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'
import Landing from '@/pages/Landing'
import Admin from '@/pages/Admin'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import Login from '@/pages/Login'
import OAuthCallback from '@/pages/auth/OAuthCallback'
import ModelManagement from '@/pages/admin/ModelManagement'
import PricingConfiguration from '@/pages/admin/PricingConfiguration'
import PricingSimulation from '@/pages/admin/PricingSimulation'
import VendorPriceMonitoring from '@/pages/admin/VendorPriceMonitoring'
import MarginTracking from '@/pages/admin/MarginTracking'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { AdminRoute } from '@/components/auth/AdminRoute'
import { adminRoutes } from '@/routes/adminRoutes'

// Route configuration using RouteObject[]
const routes: RouteObject[] = [
  // Public routes
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/terms', element: <Terms /> },
  { path: '/oauth/callback', element: <OAuthCallback /> },

  // Legacy admin routes (TODO: migrate to AdminLayout)
  { path: '/admin-legacy', element: <AdminRoute><Admin /></AdminRoute> },
  { path: '/admin/model-tiers', element: <AdminRoute><ModelManagement /></AdminRoute> },
  { path: '/admin/pricing-configuration', element: <AdminRoute><PricingConfiguration /></AdminRoute> },
  { path: '/admin/pricing-simulation', element: <AdminRoute><PricingSimulation /></AdminRoute> },
  { path: '/admin/vendor-price-monitoring', element: <AdminRoute><VendorPriceMonitoring /></AdminRoute> },
  { path: '/admin/margin-tracking', element: <AdminRoute><MarginTracking /></AdminRoute> },

  // Unified Admin Dashboard (Plan 121)
  ...adminRoutes,
]

function AppRoutes() {
  return useRoutes(routes)
}

function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <Router>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <AppRoutes />
          </Suspense>
        </Router>
      </ThemeProvider>
    </QueryProvider>
  )
}

export default App
