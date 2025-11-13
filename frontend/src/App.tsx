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
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
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
  { path: '/admin-legacy', element: <ProtectedRoute><Admin /></ProtectedRoute> },
  { path: '/admin/model-tiers', element: <ProtectedRoute><ModelManagement /></ProtectedRoute> },
  { path: '/admin/pricing-configuration', element: <ProtectedRoute><PricingConfiguration /></ProtectedRoute> },
  { path: '/admin/pricing-simulation', element: <ProtectedRoute><PricingSimulation /></ProtectedRoute> },
  { path: '/admin/vendor-price-monitoring', element: <ProtectedRoute><VendorPriceMonitoring /></ProtectedRoute> },
  { path: '/admin/margin-tracking', element: <ProtectedRoute><MarginTracking /></ProtectedRoute> },

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
