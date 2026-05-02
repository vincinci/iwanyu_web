import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Always log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Send to error tracking service if available
    this.logError(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    // Sentry integration
    const sentry = (window as unknown as { Sentry?: { captureException: (e: Error, ctx?: unknown) => void } }).Sentry;
    if (sentry) {
      sentry.captureException(error, { 
        contexts: { 
          react: { componentStack: errorInfo.componentStack }
        }
      });
    }

    // Custom error endpoint (optional)
    if (import.meta.env.PROD) {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {}); // Silent fail
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <h1 className="mt-6 text-center text-2xl font-semibold text-gray-900">
              Something went wrong
            </h1>

            <p className="mt-2 text-center text-sm text-gray-600">
              We apologize for the inconvenience. Our team has been notified and is working on a fix.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <p className="text-xs font-mono text-red-800">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-red-700">
                      Stack trace
                    </summary>
                    <pre className="mt-2 overflow-auto text-xs text-red-600 max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                onClick={this.handleReload}
                className="flex-1 bg-gray-900 hover:bg-gray-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>

              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </div>

            <button
              onClick={this.handleReset}
              className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Try again without refreshing
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
