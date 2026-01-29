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
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you would send this to an error tracking service like Sentry
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
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
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <h1 className="mt-6 text-center text-2xl font-semibold text-gray-900">
              Something went wrong
            </h1>

            <p className="mt-2 text-center text-sm text-gray-600">
              We're sorry, but something unexpected happened. Please try refreshing the page.
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
                    <pre className="mt-2 overflow-auto text-xs text-red-600">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-iwanyu-primary hover:bg-iwanyu-primary/90"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>

              <Button
                variant="outline"
                onClick={() => (window.location.href = '/')}
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </div>

            {this.state.hasError && (
              <button
                onClick={this.handleReset}
                className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                Try again without refreshing
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
