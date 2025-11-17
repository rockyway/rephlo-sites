/**
 * Admin Route Component
 *
 * Wrapper component that protects routes requiring admin authentication.
 * Redirects:
 * - Unauthenticated users to the login page
 * - Authenticated non-admin users to a "Forbidden" page
 * Shows loading spinner while checking authentication status.
 */

import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { authHelpers } from '@/services/api';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authStatus, setAuthStatus] = useState<'unauthenticated' | 'authenticated_non_admin' | 'admin'>('unauthenticated');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    try {
      // Check if we have an access token
      const accessToken = authHelpers.getAccessToken();

      if (!accessToken) {
        setAuthStatus('unauthenticated');
        setIsCheckingAuth(false);
        return;
      }

      // Check if token is expired
      const isExpired = authHelpers.isTokenExpired();

      if (isExpired) {
        // Try to refresh the token
        console.log('[AdminRoute] Token expired, attempting refresh');
        const newToken = await authHelpers.refreshTokenIfNeeded();

        if (!newToken) {
          console.warn('[AdminRoute] Token refresh failed, clearing auth');
          setAuthStatus('unauthenticated');
          authHelpers.clearAuth('admin_route_refresh_failed');
          setIsCheckingAuth(false);
          return;
        }
        console.log('[AdminRoute] Token refresh successful');
      }

      // Check if user has admin role
      const user = authHelpers.getUser();

      if (!user) {
        console.warn('[AdminRoute] No user data found');
        setAuthStatus('unauthenticated');
        setIsCheckingAuth(false);
        return;
      }

      if (user.role !== 'admin') {
        console.warn('[AdminRoute] User is not an admin', {
          userId: user.id,
          role: user.role
        });
        setAuthStatus('authenticated_non_admin');
        setIsCheckingAuth(false);
        return;
      }

      console.log('[AdminRoute] Admin access verified', {
        userId: user.id,
        role: user.role
      });
      setAuthStatus('admin');
    } catch (error) {
      console.error('[AdminRoute] Admin access check failed:', error);
      setAuthStatus('unauthenticated');
      authHelpers.clearAuth('admin_route_check_failed');
    } finally {
      setIsCheckingAuth(false);
    }
  }

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-deep-navy-900">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-body text-deep-navy-600 dark:text-deep-navy-300">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login page
  if (authStatus === 'unauthenticated') {
    // Store the intended destination to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but not admin, show forbidden message and redirect to home
  if (authStatus === 'authenticated_non_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-deep-navy-900">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-h3 font-bold text-deep-navy-900 dark:text-deep-navy-50 mb-2">
            Access Denied
          </h1>
          <p className="text-body text-deep-navy-600 dark:text-deep-navy-300 mb-6">
            You need administrator privileges to access this page.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-rephlo-blue dark:bg-electric-cyan text-white dark:text-deep-navy-900 rounded-lg hover:bg-rephlo-blue/90 dark:hover:bg-electric-cyan/90 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // User is admin, render the protected content
  return <>{children}</>;
}
