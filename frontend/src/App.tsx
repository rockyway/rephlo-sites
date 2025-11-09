import { BrowserRouter as Router, useRoutes, RouteObject } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'
import Landing from '@/pages/Landing'
import Admin from '@/pages/Admin'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import OAuthCallback from '@/pages/auth/OAuthCallback'
import ModelTierManagement from '@/pages/admin/ModelTierManagement'
import PricingConfiguration from '@/pages/admin/PricingConfiguration'
import PricingSimulation from '@/pages/admin/PricingSimulation'
import VendorPriceMonitoring from '@/pages/admin/VendorPriceMonitoring'
import MarginTracking from '@/pages/admin/MarginTracking'
import { adminRoutes } from '@/routes/adminRoutes'

// Route configuration using RouteObject[]
const routes: RouteObject[] = [
  // Public routes
  { path: '/', element: <Landing /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/terms', element: <Terms /> },
  { path: '/oauth/callback', element: <OAuthCallback /> },

  // Legacy admin routes (TODO: migrate to AdminLayout)
  { path: '/admin-legacy', element: <Admin /> },
  { path: '/admin/model-tiers', element: <ModelTierManagement /> },
  { path: '/admin/pricing-configuration', element: <PricingConfiguration /> },
  { path: '/admin/pricing-simulation', element: <PricingSimulation /> },
  { path: '/admin/vendor-price-monitoring', element: <VendorPriceMonitoring /> },
  { path: '/admin/margin-tracking', element: <MarginTracking /> },

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
          <AppRoutes />
        </Router>
      </ThemeProvider>
    </QueryProvider>
  )
}

export default App
