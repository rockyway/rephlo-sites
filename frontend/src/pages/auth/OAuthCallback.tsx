/**
 * OAuth Callback Page
 *
 * Handles the OAuth callback from Identity Provider after user authorization.
 * This page is rendered when users are redirected back from the authorization endpoint.
 *
 * Flow:
 * 1. Extract query parameters (code, state, error)
 * 2. Verify state parameter for CSRF protection
 * 3. Exchange authorization code for tokens
 * 4. Fetch user information from userinfo endpoint
 * 5. Store tokens and user data
 * 6. Redirect to dashboard
 *
 * URL Formats:
 * - Success: /oauth/callback?code={authorization_code}&state={state}
 * - Error: /oauth/callback?error={error_code}&error_description={description}
 *
 * Error Codes (OAuth 2.0 standard):
 * - access_denied: User denied authorization
 * - invalid_request: Malformed request
 * - server_error: Identity provider error
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { exchangeCodeForTokens } from '@/utils/oauth';
import { decodeJWT } from '@/utils/jwt';
import { User } from '@/types/auth';

type CallbackStatus = 'loading' | 'success' | 'error';

interface ErrorDetails {
  code: string;
  title: string;
  description: string;
  action: string;
}

const errorMessages: Record<string, ErrorDetails> = {
  access_denied: {
    code: 'access_denied',
    title: 'Authorization Cancelled',
    description: 'You cancelled the authorization. No changes were made to your account.',
    action: 'Try again'
  },
  invalid_request: {
    code: 'invalid_request',
    title: 'Invalid Request',
    description: 'The authorization request was invalid. Please try logging in again.',
    action: 'Try again'
  },
  server_error: {
    code: 'server_error',
    title: 'Server Error',
    description: 'The authorization server encountered an error. Please try again later.',
    action: 'Try again'
  },
  invalid_state: {
    code: 'invalid_state',
    title: 'Security Check Failed',
    description: 'The security verification failed. This may be due to an expired session or browser cookies being blocked.',
    action: 'Try again'
  },
  code_exchange_failed: {
    code: 'code_exchange_failed',
    title: 'Token Exchange Failed',
    description: 'Failed to exchange authorization code for tokens. The code may have expired.',
    action: 'Try again'
  },
  userinfo_failed: {
    code: 'userinfo_failed',
    title: 'User Info Failed',
    description: 'Failed to fetch user information. Please try again.',
    action: 'Try again'
  },
  unknown: {
    code: 'unknown',
    title: 'Unknown Error',
    description: 'An unexpected error occurred. Please try again or contact support.',
    action: 'Go to login'
  }
};

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for OAuth error response
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          const details = errorMessages[error] || errorMessages.unknown;
          setStatus('error');
          setErrorDetails({
            ...details,
            description: errorDescription || details.description
          });
          return;
        }

        // Extract authorization code and state
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        // Validate required parameters
        if (!code) {
          setStatus('error');
          setErrorDetails(errorMessages.invalid_request);
          return;
        }

        // Exchange authorization code for tokens
        let tokenResponse;
        try {
          tokenResponse = await exchangeCodeForTokens(code, state);
        } catch (error) {
          console.error('Token exchange error:', error);
          const details = errorMessages.code_exchange_failed;
          setStatus('error');
          setErrorDetails({
            ...details,
            description: error instanceof Error ? error.message : details.description
          });
          return;
        }

        // Decode user information from id_token
        // Using id_token avoids audience mismatch with resource-specific access token
        if (!tokenResponse.id_token) {
          console.error('No id_token in response');
          setStatus('error');
          setErrorDetails(errorMessages.userinfo_failed);
          return;
        }

        let idTokenClaims;
        try {
          idTokenClaims = decodeJWT<{
            sub?: string;
            email: string;
            email_verified?: boolean;
            name?: string;
            given_name?: string;
            family_name?: string;
            role?: string;
            permissions?: string[];
            created_at?: string;
          }>(tokenResponse.id_token);
        } catch (error) {
          console.error('Failed to decode id_token:', error);
          setStatus('error');
          setErrorDetails(errorMessages.userinfo_failed);
          return;
        }

        // Transform id_token claims to User object
        const userData: User = {
          id: idTokenClaims.sub || '',
          email: idTokenClaims.email,
          name: idTokenClaims.name || `${idTokenClaims.given_name || ''} ${idTokenClaims.family_name || ''}`.trim() || undefined,
          role: (idTokenClaims.role === 'admin' || idTokenClaims.role === 'user') ? idTokenClaims.role : 'user',
          emailVerified: idTokenClaims.email_verified ?? false,
          createdAt: idTokenClaims.created_at || new Date().toISOString(),
          permissions: idTokenClaims.permissions
        };

        // Store tokens in session storage (temporary - will be improved with secure storage)
        console.log('[OAuthCallback] Storing tokens in sessionStorage:', {
          hasAccessToken: !!tokenResponse.access_token,
          hasRefreshToken: !!tokenResponse.refresh_token,
          expiresIn: tokenResponse.expires_in,
          accessTokenPreview: tokenResponse.access_token?.substring(0, 20) + '...',
        });

        sessionStorage.setItem('access_token', tokenResponse.access_token);
        sessionStorage.setItem('refresh_token', tokenResponse.refresh_token);
        sessionStorage.setItem('token_expires_at', String(Date.now() + tokenResponse.expires_in * 1000));
        sessionStorage.setItem('user', JSON.stringify(userData));

        // Verify storage
        console.log('[OAuthCallback] Tokens stored successfully. Verifying...');
        const storedAccessToken = sessionStorage.getItem('access_token');
        const storedRefreshToken = sessionStorage.getItem('refresh_token');
        console.log('[OAuthCallback] Storage verification:', {
          accessTokenStored: !!storedAccessToken,
          refreshTokenStored: !!storedRefreshToken,
          accessTokenMatches: storedAccessToken === tokenResponse.access_token,
          refreshTokenMatches: storedRefreshToken === tokenResponse.refresh_token,
        });

        // Update state
        setUser(userData);
        setStatus('success');

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/admin');
        }, 2000);

      } catch (error) {
        console.error('Unexpected error in OAuth callback:', error);
        setStatus('error');
        setErrorDetails(errorMessages.unknown);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const handleRetry = () => {
    navigate('/');
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <h2 className="text-h3 font-bold text-deep-navy-700 mb-2">
            Completing Login
          </h2>
          <p className="text-body text-deep-navy-300">
            Please wait while we complete your login...
          </p>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto mb-4 flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-h3 font-bold text-deep-navy-700 mb-2">
            Login Successful!
          </h2>
          <p className="text-body text-deep-navy-300 mb-6">
            Welcome {user?.name || user?.email}! Redirecting you to your dashboard...
          </p>

          {user && (
            <div className="text-left bg-deep-navy-50 rounded-md p-4">
              <p className="text-body-sm text-deep-navy-300 mb-1">
                <span className="font-semibold">Email:</span> {user.email}
              </p>
              <p className="text-body-sm text-deep-navy-300 mb-1">
                <span className="font-semibold">Role:</span> {user.role}
              </p>
              {user.permissions && user.permissions.length > 0 && (
                <p className="text-body-sm text-deep-navy-300">
                  <span className="font-semibold">Permissions:</span> {user.permissions.join(', ')}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        {/* Error Icon */}
        <div className="mx-auto mb-4 flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h2 className="text-h3 font-bold text-deep-navy-700 mb-2 text-center">
          {errorDetails?.title}
        </h2>
        <p className="text-body text-deep-navy-300 mb-6 text-center">
          {errorDetails?.description}
        </p>

        {errorDetails?.code && (
          <div className="bg-deep-navy-50 rounded-md p-3 mb-6">
            <p className="text-body-sm text-deep-navy-300">
              Error Code:{' '}
              <code className="font-mono text-rephlo-blue">
                {errorDetails.code}
              </code>
            </p>
          </div>
        )}

        <Button onClick={handleRetry} className="w-full">
          {errorDetails?.action}
        </Button>
      </Card>
    </div>
  );
}
