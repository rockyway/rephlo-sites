import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/model-tiers" element={<ModelTierManagement />} />
          <Route path="/admin/pricing-configuration" element={<PricingConfiguration />} />
          <Route path="/admin/pricing-simulation" element={<PricingSimulation />} />
          <Route path="/admin/vendor-price-monitoring" element={<VendorPriceMonitoring />} />
          <Route path="/admin/margin-tracking" element={<MarginTracking />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
