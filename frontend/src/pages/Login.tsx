/**
 * Login Page
 *
 * Provides OAuth login button to initiate the authorization code flow
 * with PKCE to the identity provider.
 */

import { useState } from 'react';
import { Card } from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { initiateOAuthLogin } from '@/utils/oauth';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initiate OAuth login flow (will redirect to identity provider)
      await initiateOAuthLogin();
    } catch (err) {
      console.error('Login initiation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to start login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-h2 font-bold text-deep-navy-500 mb-2">
            Welcome to Rephlo
          </h1>
          <p className="text-body text-deep-navy-300">
            Admin Dashboard
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-body-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Login Button */}
        <div className="space-y-4">
          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Starting login...
              </span>
            ) : (
              'Login with OAuth'
            )}
          </Button>

          {/* Info Text */}
          <p className="text-body-sm text-deep-navy-300 text-center">
            You will be redirected to the identity provider for secure authentication
          </p>
        </div>

        {/* Test Credentials (Development Only) */}
        {import.meta.env.DEV && (
          <div className="mt-8 pt-6 border-t border-deep-navy-100">
            <p className="text-body-sm font-semibold text-deep-navy-400 mb-2">
              Test Credentials (Development)
            </p>
            <div className="bg-deep-navy-50 rounded-md p-3 space-y-1">
              <p className="text-body-sm text-deep-navy-300 font-mono">
                Email: admin.test@rephlo.ai
              </p>
              <p className="text-body-sm text-deep-navy-300 font-mono">
                Password: AdminPassword123!
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
