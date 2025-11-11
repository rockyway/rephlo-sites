import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * React Error Boundary to catch rendering errors.
 * Features:
 * - Class component (Error Boundaries require class components)
 * - Log errors to console
 * - Display user-friendly error message
 * - Reset button to attempt re-render
 * - Deep Navy theme
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send error to error reporting service (e.g., Sentry)
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-deep-navy-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-deep-navy-200 p-8">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-deep-navy-900 text-center mb-2">
              Something went wrong
            </h2>

            {/* Description */}
            <p className="text-sm text-deep-navy-600 text-center mb-6">
              We encountered an unexpected error. Please try refreshing the page or contact
              support if the problem persists.
            </p>

            {/* Error details (dev mode only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <summary className="text-sm font-medium text-red-900 cursor-pointer mb-2">
                  Error Details
                </summary>
                <div className="text-xs text-red-800 font-mono overflow-auto max-h-40">
                  <p className="font-semibold mb-1">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Reset Button */}
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rephlo-blue text-white rounded-lg font-medium text-sm hover:bg-rephlo-blue/90 focus:outline-none focus:ring-2 focus:ring-rephlo-blue focus:ring-offset-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
