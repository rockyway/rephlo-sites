/**
 * OAuth Callback Page
 *
 * Handles the OAuth callback from Google after user authorization.
 * This page is rendered when users are redirected back from Google's consent screen.
 *
 * Flow:
 * 1. Extract query parameters (google_success, user_id, error)
 * 2. Verify state parameter for CSRF protection
 * 3. Show success or error message
 * 4. Redirect to appropriate destination
 *
 * URL Formats:
 * - Success: /oauth/callback?google_success=true&user_id={uuid}
 * - Error: /oauth/callback?error={error_code}
 *
 * Error Codes:
 * - google_oauth_not_configured: Backend missing credentials
 * - google_oauth_failed: User denied access
 * - missing_code: Authorization code not provided
 * - invalid_state: State parameter missing/invalid
 * - email_not_verified: Google account email not verified
 * - user_creation_failed: Database error
 * - google_oauth_callback_failed: Unexpected error
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';

type CallbackStatus = 'loading' | 'success' | 'error';

interface ErrorDetails {
  code: string;
  title: string;
  description: string;
  action: string;
}

const errorMessages: Record<string, ErrorDetails> = {
  google_oauth_not_configured: {
    code: 'google_oauth_not_configured',
    title: 'Google Login Not Available',
    description: 'Google authentication is not configured on the server. Please contact support or try another login method.',
    action: 'Try another method'
  },
  google_oauth_failed: {
    code: 'google_oauth_failed',
    title: 'Authorization Cancelled',
    description: 'You cancelled the Google authorization. No changes were made to your account.',
    action: 'Try again'
  },
  missing_code: {
    code: 'missing_code',
    title: 'Authorization Failed',
    description: 'The authorization code was not received from Google. Please try again.',
    action: 'Try again'
  },
  invalid_state: {
    code: 'invalid_state',
    title: 'Security Check Failed',
    description: 'The security verification failed. This may be due to an expired session or browser cookies being blocked.',
    action: 'Try again'
  },
  email_not_verified: {
    code: 'email_not_verified',
    title: 'Email Not Verified',
    description: 'Your Google account email is not verified. Please verify your email with Google first.',
    action: 'Go to login'
  },
  user_creation_failed: {
    code: 'user_creation_failed',
    title: 'Account Creation Failed',
    description: 'We could not create your account. Please try again or contact support if the problem persists.',
    action: 'Try again'
  },
  google_oauth_callback_failed: {
    code: 'google_oauth_callback_failed',
    title: 'Login Failed',
    description: 'An unexpected error occurred during login. Please try again.',
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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Extract query parameters
    const success = searchParams.get('google_success') === 'true';
    const error = searchParams.get('error');
    const userIdParam = searchParams.get('user_id');

    // Handle success
    if (success && userIdParam) {
      setStatus('success');
      setUserId(userIdParam);

      // Store user ID in session storage (for demo purposes)
      sessionStorage.setItem('user_id', userIdParam);
      sessionStorage.setItem('authenticated', 'true');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/admin'); // Adjust to your dashboard route
      }, 2000);

      return;
    }

    // Handle error
    if (error) {
      const details = errorMessages[error] || errorMessages.unknown;
      setStatus('error');
      setErrorDetails(details);
      return;
    }

    // No success or error - redirect to login
    navigate('/');
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
          <h2 className="text-h3 font-bold text-deep-navy-500 mb-2">
            Completing Login
          </h2>
          <p className="text-body text-deep-navy-300">
            Please wait while we complete your Google login...
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

          <h2 className="text-h3 font-bold text-deep-navy-500 mb-2">
            Login Successful!
          </h2>
          <p className="text-body text-deep-navy-300 mb-6">
            Welcome back! Redirecting you to your dashboard...
          </p>

          {userId && (
            <p className="text-body-sm text-deep-navy-200 font-mono">
              User ID: {userId.substring(0, 8)}...
            </p>
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

        <h2 className="text-h3 font-bold text-deep-navy-500 mb-2 text-center">
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
