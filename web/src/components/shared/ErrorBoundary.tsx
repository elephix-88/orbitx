import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (_error: Error, _errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch and handle React rendering errors
 * Prevents the entire app from crashing when a component throws an error
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // TODO: Add error tracking service (Sentry, etc.) in production
    // if (import.meta.env.PROD) {
    //   errorTracker.captureException(error, { componentStack: errorInfo.componentStack });
    // }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    window.location.href = '/dashboard';
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-lg w-full">
            <div className="bg-surface-primary border border-red-200 dark:border-red-800 rounded-2xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
                      Something went wrong
                    </h2>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      An unexpected error occurred
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <p className="text-text-secondary text-sm">
                  We apologize for the inconvenience. The application encountered an error
                  that prevented this section from loading properly.
                </p>

                {/* Error details (development only) */}
                {import.meta.env.DEV && this.state.error && (
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer text-sm text-text-tertiary hover:text-text-secondary transition-colors">
                      <Bug className="w-4 h-4" />
                      <span>Show error details</span>
                    </summary>
                    <div className="mt-3 p-3 bg-surface-secondary rounded-lg border border-border-primary">
                      <p className="font-mono text-xs text-red-600 dark:text-red-400 break-all">
                        {this.state.error.message}
                      </p>
                      {this.state.errorInfo?.componentStack && (
                        <pre className="mt-2 font-mono text-xs text-text-tertiary overflow-x-auto max-h-40 custom-scrollbar">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                  <button
                    onClick={this.handleRefresh}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-text-primary border border-border-primary rounded-lg transition-colors text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Page
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-secondary hover:bg-surface-tertiary text-text-primary border border-border-primary rounded-lg transition-colors text-sm font-medium"
                  >
                    <Home className="w-4 h-4" />
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap a component with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
}

export default ErrorBoundary;

