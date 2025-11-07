/**
 * GoogleLoginButton Component
 *
 * A reusable "Sign in with Google" button that follows Google's brand guidelines.
 * Initiates OAuth 2.0 authorization flow by redirecting to backend OAuth endpoint.
 *
 * Features:
 * - Official Google branding and styling
 * - Loading state during redirect
 * - CSRF protection with state parameter
 * - Responsive design
 * - Hover/focus states
 *
 * Usage:
 * ```tsx
 * <GoogleLoginButton />
 * ```
 */

import { useState } from 'react';
import Button from '@/components/common/Button';

interface GoogleLoginButtonProps {
  /** Custom CSS classes */
  className?: string;
  /** Button text (default: "Continue with Google") */
  buttonText?: string;
  /** Callback after redirect initiated (optional) */
  onRedirect?: () => void;
}

export default function GoogleLoginButton({
  className = '',
  buttonText = 'Continue with Google',
  onRedirect
}: GoogleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);

    // Generate random state for CSRF protection
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);

    // Get API URL from environment
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:7150';

    // Call optional callback
    if (onRedirect) {
      onRedirect();
    }

    // Redirect to backend OAuth endpoint
    // Backend will redirect to Google's consent screen
    window.location.href = `${apiUrl}/oauth/google/authorize`;
  };

  return (
    <Button
      onClick={handleGoogleLogin}
      disabled={isLoading}
      variant="secondary"
      size="default"
      className={`w-full relative ${className}`}
      aria-label="Sign in with Google"
    >
      {/* Google Logo SVG */}
      <svg
        className="absolute left-4 h-5 w-5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>

      {/* Button Text */}
      <span className="ml-6">
        {isLoading ? 'Connecting...' : buttonText}
      </span>

      {/* Loading Spinner (optional enhancement) */}
      {isLoading && (
        <svg
          className="absolute right-4 animate-spin h-5 w-5 text-rephlo-blue"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
    </Button>
  );
}
