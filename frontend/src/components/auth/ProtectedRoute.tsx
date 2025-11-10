/**
 * Protected Route Component
 *
 * Wrapper component that protects routes requiring authentication.
 * Redirects unauthenticated users to the login page.
 * Shows loading spinner while checking authentication status.
 */

import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { authHelpers } from '@/services/api';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  async function checkAuthentication() {
    try {
      // Check if we have an access token
      const accessToken = authHelpers.getAccessToken();

      if (!accessToken) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }

      // Check if token is expired
      const isExpired = authHelpers.isTokenExpired();

      if (isExpired) {
        // Try to refresh the token
        console.log('[ProtectedRoute] Token expired, attempting refresh');
        const newToken = await authHelpers.refreshTokenIfNeeded();

        if (newToken) {
          console.log('[ProtectedRoute] Token refresh successful');
          setIsAuthenticated(true);
        } else {
          console.warn('[ProtectedRoute] Token refresh failed, clearing auth');
          setIsAuthenticated(false);
          authHelpers.clearAuth('protected_route_refresh_failed');
        }
      } else {
        console.log('[ProtectedRoute] Token valid, user authenticated');
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('[ProtectedRoute] Authentication check failed:', error);
      setIsAuthenticated(false);
      authHelpers.clearAuth('protected_route_check_failed');
    } finally {
      setIsCheckingAuth(false);
    }
  }

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-body text-deep-navy-300">
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    // Store the intended destination to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}
